import type { FC } from 'react';
import { useEffect } from 'react';

// The application uses the dollar symbol consistently in the UI.
// This also protects older pages/components that still render EUR/USD text.
const CURRENCY_PATTERN = /(?:US\$|\bUSD\b|€)/g;

const normalizeTextNode = (node: Text) => {
  const value = node.nodeValue;
  if (!value || !/(?:US\$|\bUSD\b|€)/.test(value)) return;

  node.nodeValue = value.replace(CURRENCY_PATTERN, '$');
};

const normalizeTree = (root: Node) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current: Node | null = walker.nextNode();

  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  textNodes.forEach(normalizeTextNode);
};

export const CurrencyDisplayNormalizer: FC = () => {
  useEffect(() => {
    normalizeTree(document.body);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            normalizeTextNode(node as Text);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            normalizeTree(node);
          }
        });

        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          normalizeTextNode(mutation.target as Text);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
};
