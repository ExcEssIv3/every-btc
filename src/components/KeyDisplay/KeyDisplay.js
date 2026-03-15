import React from "react";
import styled, { keyframes } from "styled-components";
import UnstyledButton from "../UnstyledButton/UnstyledButton";
import {
  querySmallScreen,
  queryVerySmallScreen,
  SCROLLBAR_WIDTH,
  ITEM_HEIGHT,
} from "../../../lib/constants";
import { ClipboardCopy, Star } from "../Icons";
import { useBalance } from "../../../hooks/use-balance";

const BaseButton = styled(UnstyledButton)`
  height: 100%;
  aspect-ratio: 1;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.1s ease-in-out,
    color 0.1s ease-in-out;

  &:focus {
    outline: none;
    background-color: transparent;
  }

  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-tap-highlight-color: transparent;
`;

const CopyButton = styled(BaseButton)`
  color: var(--slate-700);

  @media (hover: hover) {
    &:hover {
      color: var(--slate-900);
    }
  }

  &:active {
    transform: scale(0.8);
  }
`;

const SpinStretch = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  20% { transform: scale(0.8) rotate(-40deg); }
  100% { transform: scale(1) rotate(360deg); }
`;

const FavoriteButton = styled(BaseButton)`
  color: var(--yellow-700);
  --fill-color: ${(props) =>
    props.$isFaved ? "var(--yellow-500)" : "transparent"};

  &[data-just-faved="true"] {
    animation: ${SpinStretch} 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) both;
  }

  @media (hover: hover) {
    &:hover {
      color: ${(props) =>
        props.$isFaved ? "var(--yellow-100)" : "var(--yellow-500)"};
    }
  }
`;

const Wrapper = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  outline: none;

  --text-size: 0.8rem;

  @media ${queryVerySmallScreen} {
    --text-size: 0.7rem;
  }
`;

const List = styled.div`
  height: 100%;
  padding-bottom: 2rem;
`;

const RowWrapper = styled.div`
  display: grid;
  padding: 0.25rem 0;

  grid-template-areas: "index hex copy-key balance fav";
  grid-template-rows: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 0 0.5rem;
  align-items: center;

  margin-left: ${SCROLLBAR_WIDTH}px;
  font-family: monospace;
  white-space: nowrap;
  font-size: var(--text-size);
  border-bottom: 1px solid var(--border-color);
  height: ${ITEM_HEIGHT}px;

  @media (hover: hover) {
    &:hover {
      background-color: var(--slate-400);
    }
  }

  background-color: var(--row-background, transparent);
  transition: background-color 0.1s ease-in-out;

  @media ${querySmallScreen} {
    margin-left: 0;
    padding: 0.25rem 0.5rem;
  }
`;

const FadeOutDown = keyframes`
  0% { opacity: 0; }
  15% { opacity: 1; }
  40% { opacity: 1; }
  100% { opacity: 0; }
`;

const CopiedText = styled.div`
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-size);
  color: var(--green-900);
  animation: ${FadeOutDown} 0.6s ease-in both;
  user-select: none;
  background-color: var(--slate-100);
  border-radius: 0.25rem;
  padding: 0.1rem 0.4rem;
  pointer-events: none;
`;

const IndexWithPadding = styled.div`
  grid-area: index;
  display: inline-block;
  align-self: center;
  padding-right: 0.25rem;
`;

const IndexNum = styled.span`
  opacity: 0.7;
  user-select: none;
  -webkit-user-select: none;
`;

const Padding = styled.span`
  opacity: 0.3;
  user-select: none;
  -webkit-user-select: none;
`;

const HexKey = styled.span`
  grid-area: hex;
  color: var(--key-color);
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Balance = styled.span`
  grid-area: balance;
  font-size: calc(var(--text-size) * 0.85);
  color: ${(props) =>
    props.$hasBalance ? "var(--green-700)" : "var(--slate-400)"};
  white-space: nowrap;
`;

const CopyKeyButton = styled(CopyButton)`
  grid-area: copy-key;
  height: 80%;
`;

const FavCell = styled.div`
  grid-area: fav;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const Highlight = styled.span`
  background-color: yellow;
`;

function highlightMatch(text, search) {
  if (!search || !text.includes(search)) return text;
  const start = text.indexOf(search);
  const end = start + search.length;
  return (
    <>
      {text.slice(0, start)}
      <Highlight>{text.slice(start, end)}</Highlight>
      {text.slice(end)}
    </>
  );
}

function Row({
  index,
  hex,
  address,
  isFaved,
  toggleFavedKey,
  search,
  searchDisplayed,
  balance,
}) {
  const indexString = index.toString();
  const padLength = 39;
  const paddingLength = Math.max(0, padLength - indexString.length);
  const padding = "0".repeat(paddingLength);

  const [justFaved, setJustFaved] = React.useState(false);
  const [justCopied, setJustCopied] = React.useState(0);
  const copyTimeoutRef = React.useRef(null);

  const handleCopyKey = React.useCallback(async () => {
    clearTimeout(copyTimeoutRef.current);
    try {
      await navigator.clipboard.writeText(hex);
      setJustCopied((prev) => prev + 1);
      copyTimeoutRef.current = setTimeout(() => setJustCopied(0), 1000);
    } catch (e) {
      console.error("copy error", e);
    }
  }, [hex]);

  const activeSearch = searchDisplayed && search;
  const hexDisplay = activeSearch ? highlightMatch(hex, search) : hex;

  let balanceText = null;
  if (balance) {
    if (balance.status === 'loading') balanceText = '…';
    else if (balance.status === 'error') balanceText = 'err';
    else if (balance.status === 'loaded') {
      balanceText = balance.btc === 0 ? '0 ₿' : `${balance.btc.toFixed(8)} ₿`;
    }
  }

  return (
    <RowWrapper style={{ position: 'relative' }}>
      <IndexWithPadding>
        <Padding>{padding}</Padding>
        <IndexNum>{indexString}</IndexNum>
      </IndexWithPadding>
      <HexKey>{hexDisplay}</HexKey>
      <CopyKeyButton onClick={handleCopyKey} title="Copy private key">
        <ClipboardCopy style={{ height: "100%", aspectRatio: 1 }} />
      </CopyKeyButton>
      {balanceText && (
        <Balance $hasBalance={balance?.status === 'loaded' && balance?.btc > 0}>
          {balanceText}
        </Balance>
      )}
      <FavCell>
        <FavoriteButton
          $isFaved={isFaved}
          data-just-faved={isFaved && justFaved}
          onClick={() => {
            if (!isFaved) setJustFaved(true);
            else setJustFaved(false);
            toggleFavedKey(hex, index, address);
          }}
          style={{ height: "80%" }}
        >
          <Star fill="var(--fill-color)" style={{ height: "100%", aspectRatio: 1 }} />
        </FavoriteButton>
      </FavCell>
      {justCopied !== 0 && <CopiedText key={`key-${justCopied}`}>copied!</CopiedText>}
    </RowWrapper>
  );
}

function KeyDisplay({
  itemsToShow,
  setItemsToShow,
  virtualPosition,
  setVirtualPosition,
  favedKeys,
  toggleFavedKey,
  isAnimating,
  MAX_POSITION,
  animateToPosition,
  search,
  searchDisplayed,
  displayedKeys,
}) {
  const ref = React.useRef(null);
  const balances = useBalance(displayedKeys);

  const movePosition = React.useCallback(
    (delta) => {
      if (isAnimating) return;
      setVirtualPosition((prev) => {
        const newPos = prev + delta;
        return newPos < 0n ? 0n : newPos > MAX_POSITION ? MAX_POSITION : newPos;
      });
    },
    [isAnimating, MAX_POSITION, setVirtualPosition]
  );

  React.useEffect(() => {
    if (ref.current === null) return;

    const computeItemsToShow = () => {
      const rect = ref.current.getBoundingClientRect();
      const items = Math.floor(rect.height / ITEM_HEIGHT);
      setItemsToShow(items);
    };
    computeItemsToShow();

    window.addEventListener("resize", computeItemsToShow);
    return () => {
      window.removeEventListener("resize", computeItemsToShow);
    };
  }, [setItemsToShow]);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  React.useEffect(() => {
    if (!ref.current) return;

    const handleWheel = (e) => {
      if (isAnimating) return;
      e.preventDefault();
      movePosition(BigInt(Math.floor(e.deltaY)));
    };
    ref.current.addEventListener("wheel", handleWheel, { passive: false });

    let lastTouchY = 0;
    let lastTouchTime = 0;
    let velocity = 0;
    let animationFrame = null;

    const applyMomentum = () => {
      if (Math.abs(velocity) > 0.5) {
        movePosition(BigInt(Math.floor(velocity)));
        velocity *= 0.95;
        animationFrame = requestAnimationFrame(applyMomentum);
      } else {
        velocity = 0;
      }
    };

    const handleTouchStart = (e) => {
      lastTouchY = e.touches[0].clientY;
      lastTouchTime = Date.now();
      velocity = 0;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = lastTouchY - touchY;
      const now = Date.now();
      const deltaTime = now - lastTouchTime;
      velocity = (deltaY / deltaTime) * 16.67;
      lastTouchY = touchY;
      lastTouchTime = now;
      movePosition(BigInt(Math.floor(deltaY * 2)));
    };

    const handleTouchEnd = () => {
      if (Math.abs(velocity) > 0.5) {
        animationFrame = requestAnimationFrame(applyMomentum);
      }
    };

    ref.current.addEventListener("touchstart", handleTouchStart, { passive: false });
    ref.current.addEventListener("touchmove", handleTouchMove, { passive: false });
    ref.current.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      if (!ref.current) return;
      ref.current.removeEventListener("wheel", handleWheel);
      ref.current.removeEventListener("touchstart", handleTouchStart);
      ref.current.removeEventListener("touchmove", handleTouchMove);
      ref.current.removeEventListener("touchend", handleTouchEnd);
    };
  }, [movePosition]);

  const handleKeyDown = React.useCallback(
    (e) => {
      if (isAnimating) return;
      const PAGE_SIZE = BigInt(itemsToShow);
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      const shiftKey = e.shiftKey;

      const handleAndPrevent = (action) => {
        e.preventDefault();
        action();
      };

      const handleKeyAndPrevent = (key, modifiers = [], action) => {
        if (e.key === key && modifiers.every((mod) => mod)) {
          handleAndPrevent(action);
          return true;
        }
        return false;
      };

      const animateWithDelta = (delta) => {
        let target = virtualPosition + delta;
        if (target < 0n) target = 0n;
        else if (target > MAX_POSITION) target = MAX_POSITION;
        animateToPosition(target);
      };

      switch (true) {
        case handleKeyAndPrevent("ArrowDown", [cmdKey], () => animateWithDelta(MAX_POSITION)): return;
        case handleKeyAndPrevent("ArrowUp", [cmdKey], () => animateWithDelta(-MAX_POSITION)): return;
        case handleKeyAndPrevent(" ", [shiftKey], () => animateWithDelta(-PAGE_SIZE)): return;
        case handleKeyAndPrevent(" ", [], () => animateWithDelta(PAGE_SIZE)): return;
        case handleKeyAndPrevent("PageDown", [cmdKey], () => animateWithDelta(MAX_POSITION)): return;
        case handleKeyAndPrevent("PageUp", [cmdKey], () => animateWithDelta(0n)): return;
        case handleKeyAndPrevent("PageDown", [], () => animateWithDelta(PAGE_SIZE)): return;
        case handleKeyAndPrevent("PageUp", [], () => animateWithDelta(-PAGE_SIZE)): return;
        case handleKeyAndPrevent("Home", [], () => animateWithDelta(0n)): return;
        case handleKeyAndPrevent("End", [], () => animateWithDelta(MAX_POSITION)): return;
        case handleKeyAndPrevent("ArrowDown", [], () => movePosition(1n)): return;
        case handleKeyAndPrevent("ArrowUp", [], () => movePosition(-1n)): return;
        case handleKeyAndPrevent("j", [], () => movePosition(1n)): return;
        case handleKeyAndPrevent("k", [], () => movePosition(-1n)): return;
        default: break;
      }
    },
    [isAnimating, virtualPosition, movePosition, MAX_POSITION, itemsToShow, animateToPosition]
  );

  return (
    <Wrapper ref={ref} onKeyDown={handleKeyDown} tabIndex={0}>
      <List>
        {displayedKeys.map(({ index, hex, address }, i) => (
          <Row
            key={i}
            index={index}
            hex={hex}
            address={address}
            isFaved={!!favedKeys[hex]}
            toggleFavedKey={toggleFavedKey}
            search={search}
            searchDisplayed={searchDisplayed}
            balance={balances[address]}
          />
        ))}
      </List>
    </Wrapper>
  );
}

export default KeyDisplay;
