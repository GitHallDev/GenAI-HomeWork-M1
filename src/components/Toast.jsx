import { useState, useEffect, useCallback, useRef } from 'react';
import './Toast.css';

// ── Singleton event bus ──────────────────────────────────────────────────────
const listeners = new Set();
export const toast = {
  success: (msg, opts) => emit({ type: 'success', msg, ...opts }),
  error:   (msg, opts) => emit({ type: 'error',   msg, ...opts }),
  info:    (msg, opts) => emit({ type: 'info',    msg, ...opts }),
  warn:    (msg, opts) => emit({ type: 'warn',    msg, ...opts }),
};
function emit(payload) {
  listeners.forEach(fn => fn({ id: Date.now() + Math.random(), ...payload }));
}

// ── ToastContainer ────────────────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => remove(t.id), t.duration ?? 4000);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} onClick={() => remove(t.id)}>
          <span className="toast__icon">{icons[t.type]}</span>
          <span className="toast__msg">{t.msg}</span>
          <button className="toast__close" onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

const icons = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warn:    '⚠',
};
