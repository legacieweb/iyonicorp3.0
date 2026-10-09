import { X } from 'lucide-react';
import { SLEEP_TIMER_OPTIONS } from '../constants';
import type { SleepTimerOption } from '../types';

interface Props {
  isOpen: boolean;
  timer: number | null;
  isActive: boolean;
  onClose: () => void;
  onStart: (seconds: number) => void;
  onCancel: () => void;
}

export const NLMSleepTimerModal = ({
  isOpen,
  timer,
  isActive,
  onClose,
  onStart,
  onCancel,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div
      className="nlm-sleep-overlay"
      onMouseDown={() => onClose()}
    >
      <aside
        className="nlm-sleep-modal"
        onMouseDown={(e) => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="nlm-sleep-title">
          <h3>Sleep timer</h3>
          <button
            className="nlm-sleep-close"
            onClick={() => onClose()}
            aria-label="Close sleep timer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="nlm-sleep-options">
          {SLEEP_TIMER_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onStart(option.seconds)}
              aria-label={option.label}
            >
              <span>{option.label}</span>
            </button>
          ))}
          {isActive && (
            <button
              className="nlm-sleep-cancel"
              onClick={onCancel}
            >
              <span>Cancel timer</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NLMSleepTimerModal;
