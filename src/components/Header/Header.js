import React from "react";
import styled from "styled-components";
import {
  querySmallScreen,
} from "../../../lib/constants";
import { Code, Twitter, Bsky, Help } from "../Icons/Icons";
import UnstyledButton from "../UnstyledButton/UnstyledButton";

const SUBHEADS = [
  "Every private key. Every address. Zero guarantees.",
  "Scroll till you find a funded one",
  "2^256 keys. You've got time.",
  "Not financial advice",
  "The private key to your freedom... is probably here",
];

const Wrapper = styled.header`
  padding: 1rem 1rem 16px 24px;
  line-height: 1;
  border-bottom: 1px solid var(--border-color);
  font-family: monospace;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  position: relative;

  @media ${querySmallScreen} {
    flex-direction: column;
    gap: 1.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
`;

const TitleSubhead = styled.div`
  display: flex;
  gap: 0.25rem;
  flex-direction: column;

  @media ${querySmallScreen} {
    align-items: center;
  }
`;

const Subhead = styled.div`
  font-size: 0.875rem;
  opacity: 0.7;
  transform: translateX(1px);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const Link = styled.a`
  color: inherit;
  display: inline;
  transition: color 0.1s ease-in-out;

  @media (hover: hover) {
    &:hover {
      color: var(--neutral-500);
    }
  }
`;

const SelfPromotion = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;

  @media ${querySmallScreen} {
    flex-direction: row-reverse;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
`;

const AddressTypeToggle = styled.div`
  display: flex;
  flex-direction: row;
  font-family: monospace;
  font-size: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
`;

const ToggleButton = styled(UnstyledButton)`
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  background-color: ${(props) => props.$active ? 'var(--slate-600)' : 'transparent'};
  color: ${(props) => props.$active ? 'var(--slate-50)' : 'inherit'};
  transition: background-color 0.1s ease-in-out, color 0.1s ease-in-out;
  @media (hover: hover) {
    &:hover {
      background-color: ${(props) => props.$active ? 'var(--slate-600)' : 'var(--slate-300)'};
    }
  }
`;

const TitleLink = styled.a`
  text-decoration: none;
  color: inherit;

  @media (hover: hover) {
    &:hover {
      text-decoration: underline;
    }
  }
`;

const SocialLink = styled.a`
  display: inline-flex;
  align-items: center;
  width: 1.5em;
  height: 1.5em;
  color: var(--slate-500);

  transition: color 0.1s ease-in-out;
  @media (hover: hover) {
    &:hover {
      color: var(--slate-700);
    }
  }
`;

const Socials = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  justify-content: flex-end;
  align-items: center;
`;

function Header({ addressType, setAddressType }) {
  const subhead = React.useMemo(() => {
    return SUBHEADS[Math.floor(Math.random() * SUBHEADS.length)];
  }, []);

  return (
    <Wrapper>
      <TitleSubhead>
        <TitleLink href="/">
          <Title>Every Bitcoin Private Key</Title>
        </TitleLink>
        <Subhead>{subhead}</Subhead>
      </TitleSubhead>
      <AddressTypeToggle>
        <ToggleButton $active={addressType === 'p2pkh'} onClick={() => setAddressType('p2pkh')}>
          P2PKH (1...)
        </ToggleButton>
        <ToggleButton $active={addressType === 'p2wpkh'} onClick={() => setAddressType('p2wpkh')}>
          P2WPKH (bc1q...)
        </ToggleButton>
      </AddressTypeToggle>
      <SelfPromotion>
        <Socials>
          <SocialLink href="https://github.com/nolenroyalty/every-uuid">
            <Code />
          </SocialLink>
          <SocialLink href="https://twitter.com/itseieio">
            <Twitter />
          </SocialLink>
          <SocialLink href="https://bsky.app/profile/itseieio.bsky.social">
            <Bsky />
          </SocialLink>
        </Socials>
        <p>
          A website by <Link href="https://eieio.games">eieio</Link>
        </p>
      </SelfPromotion>
    </Wrapper>
  );
}

export default Header;
