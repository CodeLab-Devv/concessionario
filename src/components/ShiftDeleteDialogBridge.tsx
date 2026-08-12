import { useEffect, useRef } from 'react';
import { useDialogs } from './ui/DialogManager';

const TARGETS = new Map([
  ['Elimina assenza', 'assenza'],
  ['Elimina coppia', 'coppia di turno'],
]);

export const ShiftDeleteDialogBridge = () => {
  const { showDeleteConfirm } = useDialogs();
  const bypassNextNativeConfirm = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (bypassNextNativeConfirm.current || pending.current) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('button');
      if (!(button instanceof HTMLButtonElement)) return;

      const label = button.getAttribute('title');
      const itemType = label ? TARGETS.get(label) : undefined;
      if (!itemType) return;

      event.preventDefault();
      event.stopPropagation();
      pending.current = true;

      void showDeleteConfirm(
        label === 'Elimina coppia' ? 'questa coppia di turno' : 'questa assenza',
        itemType,
      ).then(confirmed => {
        if (!confirmed) return;

        bypassNextNativeConfirm.current = true;
        button.click();
      }).finally(() => {
        window.setTimeout(() => {
          bypassNextNativeConfirm.current = false;
          pending.current = false;
        }, 0);
      });
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [showDeleteConfirm]);

  return null;
};
