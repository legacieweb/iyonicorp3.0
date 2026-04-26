import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[300px]
                ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ''}
                ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : ''}
                ${toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : ''}
                ${toast.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
              `}>
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                </div>
                <p className="text-sm font-medium flex-1">{toast.message}</p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
