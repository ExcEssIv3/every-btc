import React from 'react';

// Module-level cache: persists across renders/remounts
const balanceCache = new Map(); // address → { status: 'loaded'|'error', btc: number|null }

export function useBalance(displayedKeys) {
  const [balances, setBalances] = React.useState({});
  const queueRef = React.useRef([]);
  const processingRef = React.useRef(false);
  const debounceRef = React.useRef(null);
  const visibleAddressesRef = React.useRef(new Set());

  // Keep visible set current for stale-skip check
  React.useEffect(() => {
    visibleAddressesRef.current = new Set(displayedKeys.map((k) => k.address));
  }, [displayedKeys]);

  const fetchAddress = React.useCallback((address) => {
    return fetch(`https://blockstream.info/api/address/${address}`)
      .then((r) => r.json())
      .then((data) => {
        const satoshis =
          data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        return { address, result: { status: 'loaded', btc: satoshis / 1e8 } };
      })
      .catch(() => ({ address, result: { status: 'error', btc: null } }));
  }, []);

  const processQueue = React.useCallback(() => {
    const batch = queueRef.current.filter((addr) =>
      visibleAddressesRef.current.has(addr)
    );
    queueRef.current = [];

    if (batch.length === 0) {
      processingRef.current = false;
      return;
    }

    Promise.all(batch.map(fetchAddress)).then((results) => {
      setBalances((prev) => {
        const next = { ...prev };
        for (const { address, result } of results) {
          balanceCache.set(address, result);
          next[address] = result;
        }
        return next;
      });
      processingRef.current = false;
    });
  }, [fetchAddress]);

  React.useEffect(() => {
    // Immediately populate state from cache for visible rows
    const cached = {};
    for (const { address } of displayedKeys) {
      if (balanceCache.has(address)) {
        cached[address] = balanceCache.get(address);
      }
    }
    if (Object.keys(cached).length > 0) {
      setBalances((prev) => ({ ...prev, ...cached }));
    }

    // Debounce: wait 400ms after scroll stops before fetching
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const newAddresses = displayedKeys
        .map((k) => k.address)
        .filter((addr) => addr && !balanceCache.has(addr) && !queueRef.current.includes(addr));

      if (newAddresses.length === 0) return;

      // Mark as loading immediately
      setBalances((prev) => {
        const next = { ...prev };
        for (const addr of newAddresses) {
          if (!next[addr]) {
            next[addr] = { status: 'loading', btc: null };
          }
        }
        return next;
      });

      queueRef.current.push(...newAddresses);

      if (!processingRef.current) {
        processingRef.current = true;
        processQueue();
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [displayedKeys, processQueue]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return balances;
}
