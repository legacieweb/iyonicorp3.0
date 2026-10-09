import { X } from 'lucide-react';

interface Props {
  message: string;
  onDismiss: () => void;
}

export const NLMPlayerError = ({ message, onDismiss }: Props) => (
  <p className="nlm-player-error" role="alert">
    {message}
    <button onClick={onDismiss} aria-label="Dismiss playback message">
      <X size={14} />
    </button>
  </p>
);

export default NLMPlayerError;
