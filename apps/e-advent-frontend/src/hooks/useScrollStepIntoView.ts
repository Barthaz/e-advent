import { useEffect, useRef } from 'react';

/** Scroll the creator heading into view when the step changes (tall steps on narrow screens). */
export function useScrollStepIntoView<T extends HTMLElement = HTMLElement>(step: number | string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof node.focus === 'function') node.focus({ preventScroll: true });
  }, [step]);
  return ref;
}
