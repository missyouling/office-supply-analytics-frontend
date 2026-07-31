import { useState, useEffect } from 'react';
import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastClose } from './toast';

interface ToasterToast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'destructive';
}

let toasts: ToasterToast[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function showToast(title: string, description?: string, variant: ToasterToast['variant'] = 'default') {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, title, description, variant }].slice(-5);
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
  return id;
}

export function Toaster() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant === 'destructive' ? 'destructive' : t.variant === 'success' ? 'success' : 'default'}>
          <div className="grid gap-1">
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
