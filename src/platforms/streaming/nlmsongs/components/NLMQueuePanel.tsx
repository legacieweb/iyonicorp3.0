import { Clock, GripVertical, Trash2, X } from 'lucide-react';
import type { Track } from '../types';

interface Props {
  queue: Track[];
  isOpen: boolean;
  selectedTrackId: string | null;
  isPlaying: boolean;
  onClose: () => void;
  onRemove: (index: number) => void;
}

export const NLMQueuePanel = ({
  queue,
  isOpen,
  selectedTrackId,
  isPlaying,
  onClose,
  onRemove,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="nlm-queue-overlay" onMouseDown={() => onClose()}>
      <aside
        className="nlm-queue-panel"
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Up next"
        aria-modal="true"
        role="dialog"
      >
        <div className="nlm-queue-head">
          <h3>Up next</h3>
          <span className="nlm-queue-count">{queue.length} tracks</span>
          <button
            className="nlm-queue-close"
            onClick={onClose}
            aria-label="Close queue"
          >
            <X size={18} />
          </button>
        </div>

        <div className="nlm-queue-list">
          {queue.length ? (
            queue.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className={`nlm-queue-item ${selectedTrackId === track.id && isPlaying ? 'is-playing' : ''}`}
              >
                <span className="nlm-queue-drag" aria-hidden="true">
                  <GripVertical size={14} />
                </span>
                <span className="nlm-queue-title">
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </span>
                <button
                  className="nlm-queue-remove"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${track.title} from queue`}
                  title="Remove from queue"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="nlm-queue-empty">
              <Clock size={18} />
              <p>No tracks queued. Add songs with the + button.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NLMQueuePanel;
