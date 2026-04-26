import React from 'react';
import { Popup } from './Popup';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info' | string;
}

export const ConfirmPopup: React.FC<ConfirmPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  type
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const finalVariant = (type as 'danger' | 'warning' | 'info') || variant;

  const variantColors = {
    danger: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  const buttonVariants = {
    danger: 'danger',
    warning: 'primary',
    info: 'primary'
  } as const;

  return (
    <Popup isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${variantColors[finalVariant as keyof typeof variantColors] || variantColors.danger}`}>
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium leading-relaxed">{message}</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[finalVariant as keyof typeof buttonVariants] || buttonVariants.danger}
            onClick={handleConfirm}
            className="flex-1"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Popup>
  );
};
