export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
let counter = 0;
const listeners = new Set<Listener>();

function notify() {
  const snapshot = [...items];
  listeners.forEach(l => l(snapshot));
}

export function toast(message: string, type: ToastType = 'success', duration = 2500) {
  const id = ++counter;
  items = [...items, { id, message, type }];
  notify();
  setTimeout(() => {
    items = items.filter(t => t.id !== id);
    notify();
  }, duration);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener([...items]); // sync initial state
  return () => listeners.delete(listener);
}
