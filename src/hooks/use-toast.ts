import { useState, useCallback } from 'react';
import type { ToastProps } from '@/components/ui/toast';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

type Toast = Omit<ToastProps, 'id'> & { id: string; title?: string; description?: string };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const listeners: Array<(state: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(toast: Toast) {
  memoryState = [toast, ...memoryState].slice(0, TOAST_LIMIT);
  listeners.forEach((l) => l(memoryState));
}

export function toast({ ...props }: Omit<Toast, 'id'>) {
  const id = genId();
  dispatch({ id, ...props });
  
  setTimeout(() => {
    memoryState = memoryState.filter((t) => t.id !== id);
    listeners.forEach((l) => l(memoryState));
  }, TOAST_REMOVE_DELAY);
  
  return id;
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(memoryState);
  
  useCallback(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [])(); // IIFE
  
  return { toast, toasts: state, dismiss: (id: string) => {
    memoryState = memoryState.filter((t) => t.id !== id);
    listeners.forEach((l) => l(memoryState));
  }};
}
