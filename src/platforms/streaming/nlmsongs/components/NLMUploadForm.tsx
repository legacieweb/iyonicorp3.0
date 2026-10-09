import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Disc3, FileAudio2, Loader2, Plus, X } from 'lucide-react';
import { AUDIO_FILE_ACCEPT, IMAGE_FILE_ACCEPT } from '../constants';
import { isAudioFile, isImageFile, parseLyrics } from '../utils';
import { nlmsongsAPI } from '../../../../services/api';

interface Props {
  userId: string | null;
  onSubmit?: (track: any) => void;
  onCancel?: () => void;
}

interface FormState {
  title: string;
  artist: string;
  description: string;
  genre: string;
  tags: string;
  lyrics: string;
  syncLyrics: boolean;
  audioFile: File | null;
  coverFile: File | null;
  coverPreview: string;
  error: string;
  isSubmitting: boolean;
}

const initialFormState: FormState = {
  title: '',
  artist: '',
  description: '',
  genre: '',
  tags: '',
  lyrics: '',
  syncLyrics: false,
  audioFile: null,
  coverFile: null,
  coverPreview: '',
  error: '',
  isSubmitting: false,
};

export const NLMUploadForm = ({ userId, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<FormState>(initialFormState);
  const hasUser = Boolean(userId);

  const updateField = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setForm((prev) => {
      if (prev.coverPreview) {
        URL.revokeObjectURL(prev.coverPreview);
      }
      const preview = file ? URL.createObjectURL(file) : '';
      return { ...prev, coverFile: file, coverPreview: preview };
    });
  };

  useEffect(() => {
    if (!form.coverFile) {
      setForm((prev) => ({ ...prev, coverPreview: '' }));
      return;
    }
    const url = URL.createObjectURL(form.coverFile);
    setForm((prev) => ({ ...prev, coverPreview: url }));
    return () => URL.revokeObjectURL(url);
  }, [form.coverFile]);

  const validate = (): string | null => {
    if (!hasUser) {
      return 'Sign in to upload tracks.';
    }
    if (!form.title.trim()) return 'Add a track title to continue.';
    if (!form.audioFile) return 'Choose an audio file from this device.';
    if (!isAudioFile(form.audioFile)) {
      return 'Choose an MP3, WAV, or M4A file for reliable browser playback.';
    }
    if (form.coverFile && !isImageFile(form.coverFile)) {
      return 'The cover image must be an image file.';
    }
    const parsed = parseLyrics(form.lyrics, form.syncLyrics);
    if (typeof parsed === 'string') return parsed;
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.isSubmitting) return;

    const error = validate();
    if (error) {
      setForm((prev) => ({ ...prev, error }));
      return;
    }

    setForm((prev) => ({ ...prev, isSubmitting: true, error: '' }));

    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('artist', form.artist.trim());
      formData.append('description', form.description.trim());
      formData.append('genre', form.genre.trim());
      formData.append('tags', form.tags.trim());
      formData.append('lyrics', form.syncLyrics ? form.lyrics.trim() : form.lyrics.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('\n'));
      formData.append('audio', form.audioFile!);
      if (form.coverFile) formData.append('thumbnail', form.coverFile);

      const created = await nlmsongsAPI.create(formData);
      onSubmit?.(created);
      setForm(initialFormState);
      onCancel?.();
    } catch (error: any) {
      setForm((prev) => ({ ...prev, error: error?.response?.data?.message || 'This song could not be published. Please try again.' }));
    } finally {
      setForm((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const reset = () => {
    setForm(initialFormState);
    onCancel?.();
  };

  return (
    <section className="nlm-upload-panel" aria-labelledby="nlm-upload-title">
      <div className="nlm-form-heading">
        <div>
          <span className="nlm-eyebrow">LOCAL FILES ONLY</span>
          <h2 id="nlm-upload-title">Add to your room</h2>
        </div>
        <button
          className="nlm-icon-button"
          onClick={reset}
          aria-label="Close add track form"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="nlm-form-fields">
          <label>
            Track title
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Name this track"
              maxLength={100}
            />
          </label>
          <label>
            <span className="nlm-input-label">Artist <small>OPTIONAL</small></span>
            <input
              value={form.artist}
              onChange={(e) => updateField('artist', e.target.value)}
              placeholder="Artist name"
              maxLength={100}
            />
          </label>
        </div>

        <div className="nlm-form-fields">
          <label>
            Genre
            <input
              value={form.genre}
              onChange={(e) => updateField('genre', e.target.value)}
              placeholder="Afrobeat, Gospel, Pop..."
              maxLength={100}
            />
          </label>
          <label>
            <span className="nlm-input-label">Tags <small>OPTIONAL</small></span>
            <input
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="love, sunrise, mellow"
              maxLength={200}
            />
          </label>
        </div>

        <label className="nlm-lyrics-field">
          <span className="nlm-input-label">Description <small>OPTIONAL</small></span>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe the feel, story, or theme of the song."
            rows={2}
          />
        </label>

        <div className="nlm-file-fields">
          <label className="nlm-file-picker">
            <span className="nlm-file-icon"><FileAudio2 size={18} /></span>
            <span>
              <strong>{form.audioFile?.name || 'Choose an audio file'}</strong>
              <small>Required · MP3, WAV, or M4A</small>
            </span>
            <input
              type="file"
              accept={AUDIO_FILE_ACCEPT}
              onChange={(e) => updateField('audioFile', e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="nlm-file-picker nlm-cover-picker">
            {form.coverPreview ? (
              <img className="nlm-cover-preview" src={form.coverPreview} alt="Selected cover preview" />
            ) : (
              <span className="nlm-file-icon"><Disc3 size={18} /></span>
            )}
            <span>
              <strong>{form.coverFile?.name || 'Add cover artwork'}</strong>
              <small>{form.coverFile ? 'Selected · will be saved with the track' : 'Optional · JPG, PNG, WEBP, or GIF'}</small>
            </span>
            <input
              type="file"
              accept={IMAGE_FILE_ACCEPT}
              onChange={handleCoverChange}
            />
          </label>
        </div>

        <div className="nlm-lyrics-mode">
          <span>
            <strong>Sync lyrics to audio</strong>
            <small>{form.syncLyrics ? 'Add a timestamp to every line.' : 'Plain lyrics, one line at a time.'}</small>
          </span>
          <label className="nlm-switch">
            <input
              type="checkbox"
              checked={form.syncLyrics}
              onChange={(e) => updateField('syncLyrics', e.target.checked)}
            />
            <span aria-hidden="true" />
          </label>
        </div>

        <label className="nlm-lyrics-field">
          Lyrics <span>OPTIONAL</span>
          <textarea
            value={form.lyrics}
            onChange={(e) => updateField('lyrics', e.target.value)}
            placeholder={
              form.syncLyrics
                ? '[00:12] The city wakes in gold\n[00:18] A new day unfolds'
                : 'The city wakes in gold\nA new day unfolds'
            }
            rows={4}
          />
        </label>

        {form.error && (
          <p className="nlm-form-error" role="alert">{form.error}</p>
        )}

        <div className="nlm-form-actions">
          <p>{form.isSubmitting ? 'Publishing to the platform…' : 'Saved to the live catalogue.'}</p>
          <button type="submit" className="nlm-submit-button" disabled={form.isSubmitting}>
            {form.isSubmitting ? <Loader2 size={15} className="nlm-spinner" /> : <Plus size={15} />}
            Add to library
          </button>
        </div>
      </form>
    </section>
  );
};

export default NLMUploadForm;
