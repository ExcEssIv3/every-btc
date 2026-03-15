import React from "react";
import styled from "styled-components";
import Header from "../Header/Header";
import Scrollbar from "../Scrollbar/Scrollbar";
import { MAX_KEY } from "../../../lib/constants";
import KeyDisplay from "../KeyDisplay/KeyDisplay";
import SearchWidget from "../SearchWidget/SearchWidget";
import FavoritesWidget from "../FavoritesWidget";
import { indexToPrivateKey, privateKeyToHex } from "../../../lib/btcTools";
import { getCachedAddress } from "../../../hooks/use-address-cache";

const Wrapper = styled.div`
  display: flex;
  flex-direction: row;
  height: 100svh;
  max-height: 100svh;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
`;

const HeaderAndContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const Content = styled.div`
  overflow: hidden;
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overscroll-behavior: none;
`;

function App() {
  const [virtualPosition, setVirtualPosition] = React.useState(0n);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [targetPosition, setTargetPosition] = React.useState(null);
  const [itemsToShow, setItemsToShow] = React.useState(40);
  const [search, setSearch] = React.useState("");
  const [searchDisplayed, setSearchDisplayed] = React.useState(false);
  const [showFavorites, _setShowFavorites] = React.useState(false);
  const [addressType, setAddressType] = React.useState('p2pkh');
  const animationRef = React.useRef(null);

  const [favedKeys, setFavedKeys] = React.useState(
    localStorage.getItem("favedKeys")
      ? JSON.parse(localStorage.getItem("favedKeys"))
      : {}
  );

  const setShowFavorites = React.useCallback(
    (value) => {
      setVirtualPosition(0n);
      _setShowFavorites(value);
    },
    [_setShowFavorites]
  );

  const MAX_POSITION = React.useMemo(() => {
    if (showFavorites) {
      const itemsToShowBig = BigInt(itemsToShow);
      const favedKeysLength = BigInt(Object.keys(favedKeys).length);
      if (favedKeysLength > itemsToShowBig) {
        return favedKeysLength - itemsToShowBig;
      }
      return 0n;
    } else return MAX_KEY - BigInt(itemsToShow);
  }, [itemsToShow, showFavorites, favedKeys]);

  const toggleFavedKey = (hex, index, address) => {
    setFavedKeys((prev) => {
      const prevValue = prev[hex] || false;
      const newValue = !prevValue;
      const newFavedKeys = { ...prev };
      if (newValue) {
        newFavedKeys[hex] = { index: index.toString(), address };
      } else {
        delete newFavedKeys[hex];
      }
      localStorage.setItem("favedKeys", JSON.stringify(newFavedKeys));
      return newFavedKeys;
    });
  };

  const animateToPosition = React.useCallback(
    (targetPos) => {
      setTargetPosition(targetPos);
      setIsAnimating(true);
    },
    [setTargetPosition, setIsAnimating]
  );

  React.useEffect(() => {
    if (isAnimating && targetPosition !== null) {
      const startPosition = virtualPosition;
      const startTime = performance.now();
      const duration = 300;

      const animate = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentPos =
          startPosition +
          ((targetPosition - startPosition) *
            BigInt(Math.floor(easeProgress * 1000))) /
            1000n;

        setVirtualPosition(currentPos);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setVirtualPosition(targetPosition);
          setIsAnimating(false);
          setTargetPosition(null);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating, targetPosition]);

  const displayedKeys = React.useMemo(() => {
    if (showFavorites) {
      const allKeys = Object.entries(favedKeys)
        .map(([hex, meta]) => {
          const index = BigInt(meta.index);
          return { index, hex, address: meta.address };
        })
        .sort((a, b) => {
          const delta = a.index - b.index;
          if (delta < 0n) return -1;
          if (delta > 0n) return 1;
          return 0;
        });
      let startIndex = virtualPosition;
      if (startIndex > MAX_POSITION) startIndex = MAX_POSITION;
      const endIndex = startIndex + BigInt(itemsToShow);
      return allKeys.slice(Number(startIndex), Number(endIndex));
    }
    return Array.from({ length: itemsToShow }, (_, i) => {
      const index = virtualPosition + BigInt(i);
      if (index < 0n || index > MAX_KEY) return null;
      const privKey = indexToPrivateKey(index);
      const hex = privateKeyToHex(privKey);
      const address = getCachedAddress(hex, privKey, addressType);
      return { index, hex, address };
    }).filter(Boolean);
  }, [virtualPosition, itemsToShow, showFavorites, favedKeys, MAX_POSITION, addressType]);

  return (
    <>
      <SearchWidget
        animateToPosition={animateToPosition}
        virtualPosition={virtualPosition}
        setVirtualPosition={setVirtualPosition}
        search={search}
        setSearch={setSearch}
        searchDisplayed={searchDisplayed}
        setSearchDisplayed={setSearchDisplayed}
        displayedKeys={displayedKeys}
        MAX_POSITION={MAX_POSITION}
      />
      <FavoritesWidget
        setShowFavorites={setShowFavorites}
        isShowingFavorites={showFavorites}
      />
      <Wrapper>
        <HeaderAndContent>
          <Header addressType={addressType} setAddressType={setAddressType} />
          <Content>
            <KeyDisplay
              itemsToShow={itemsToShow}
              setItemsToShow={setItemsToShow}
              virtualPosition={virtualPosition}
              setVirtualPosition={setVirtualPosition}
              favedKeys={favedKeys}
              toggleFavedKey={toggleFavedKey}
              isAnimating={isAnimating}
              MAX_POSITION={MAX_POSITION}
              animateToPosition={animateToPosition}
              search={search}
              searchDisplayed={searchDisplayed}
              displayedKeys={displayedKeys}
            />
          </Content>
        </HeaderAndContent>
        <Scrollbar
          virtualPosition={virtualPosition}
          MAX_POSITION={MAX_POSITION}
          animateToPosition={animateToPosition}
          setVirtualPosition={setVirtualPosition}
          setIsAnimating={setIsAnimating}
        />
      </Wrapper>
    </>
  );
}

export default App;
