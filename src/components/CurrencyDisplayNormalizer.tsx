import { useEffect } from 'react';

const CURRENCY_PATTERN = /(?:US\$|USD|€)/g;

const normalizeTextNode = (node: Text) => {
  const value = node.nodeValue;
  if (!value || !CURRENCY_PATTERN.test(value)) return;

  CURRENCY_PATTERN.lastIndex = 0;
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

export const CurrencyDisplayNormalizer: React.FC = () => {
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
