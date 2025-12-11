import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { IconCheckCircle, IconAlertCircle, IconInfo, IconAlertTriangle } from '@components/ui/Icon';
import { getErrorMessages } from '@utils/error';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastOptions = {
  title?: string;
  description?: string;
  kind?: ToastKind;
  durationMs?: number;
};

type ToastItem = {
  id: number;
  title?: string;
  description?: string;
  kind: ToastKind;
};

type ToastApi = {
  show: (options: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (error: unknown, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [counter, setCounter] = useState(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((options: ToastOptions) => {
    const id = counter + 1;
    setCounter(id);
    const kind = options.kind ?? 'info';
    setToasts((prev) => [...prev, { id, title: options.title, description: options.description, kind }]);
    const duration = options.durationMs ?? 4000;
    if (duration > 0) {
      window.setTimeout(() => remove(id), duration);
    }
  }, [counter, remove]);

  const api: ToastApi = useMemo(() => ({
    show: push,
    success: (message, title = 'Success') => push({ title, description: message, kind: 'success' }),
    info: (message, title = 'Info') => push({ title, description: message, kind: 'info' }),
    error: (error, title = 'Error') => {
      const description = typeof error === 'string' ? error : getErrorMessages(error)[0];
      push({ title, description, kind: 'error' });
    },
  }), [push]);

  const toastColor = (kind: ToastKind) => {
    switch (kind) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      default:
        return 'alert-info';
    }
  };

  const ToastIcon = ({ kind }: { kind: ToastKind }) => {
    switch (kind) {
      case 'success':
        return <IconCheckCircle className="w-5 h-5" />;
      case 'warning':
        return <IconAlertTriangle className="w-5 h-5" />;
      case 'error':
        return <IconAlertCircle className="w-5 h-5" />;
      case 'info':
      default:
        return <IconInfo className="w-5 h-5" />;
    }
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast toast-end toast-bottom z-[9999]">
        {toasts.map((t) => (
          <div key={t.id} className={`alert shadow ${toastColor(t.kind)}`}>
            <div className="flex items-center gap-2">
              <ToastIcon kind={t.kind} />
              <span>{t.description ?? t.title}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => remove(t.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
