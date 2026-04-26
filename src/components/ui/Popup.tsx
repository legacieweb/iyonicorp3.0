import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'right' | 'bottom';
}

export const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'center'
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full h-full',
  };

  const variants = {
    center: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      className: 'flex items-center justify-center p-0 md:p-4'
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
      className: 'flex justify-end'
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
      className: 'flex items-end'
    }
  };

  const currentVariant = variants[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          
          <div className={twMerge('absolute inset-0 pointer-events-none', currentVariant.className)}>
            <motion.div
              initial={currentVariant.initial}
              animate={currentVariant.animate}
              exit={currentVariant.exit}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={twMerge(
                'pointer-events-auto w-full bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300',
                position === 'center' ? twMerge('rounded-none md:rounded-3xl', sizes[size]) : '',
                position === 'right' ? 'h-full max-w-full md:max-w-md' : '',
                position === 'bottom' ? 'max-w-full md:max-w-3xl mx-auto rounded-t-3xl' : '',
                size === 'full' ? 'h-full rounded-none' : ''
              )}
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-50 bg-white sticky top-0 z-10">
                {title && <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate pr-4">{title}</h3>}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
