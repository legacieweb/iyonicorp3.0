import { X } from 'lucide-react';
import type { EqualizerState } from '../types';
import NLMEqualizerControl from './NLMEqualizerControl';

interface Props {
  eq: EqualizerState;
  isOpen: boolean;
  onClose: () => void;
}

export const NLMEQModal = ({ eq, isOpen, onClose }: Props) => {
  if (!isOpen) return null;

  return (
    <div
      className="nlm-eq-overlay"
      onMouseDown={() => onClose()}
    >
      <aside
        className="nlm-eq-modal"
        onMouseDown={(e) => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="nlm-eq-title">
          <h3>Equalizer</h3>
          <button
            className="nlm-eq-close"
            onClick={onClose}
            aria-label="Close equalizer"
          >
            <X size={16} />
          </button>
        </div>

        <NLMEqualizerControl eq={eq} compact />
      </aside>
    </div>
  );
};

export default NLMEQModal;
