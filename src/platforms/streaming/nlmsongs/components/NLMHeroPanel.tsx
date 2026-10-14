import { ArrowDown, Pause, Play } from 'lucide-react';
import type { Track } from '../types';
import { resolveAssetUrl } from '../utils';

interface Props {
  featuredTrack: Track | null;
  isPlaying: boolean;
  isAdminMode: boolean;
  onPlay: (track: Track) => void;
  onUpload: () => void;
}

export const NLMHeroPanel = ({ featuredTrack, isPlaying, isAdminMode, onPlay, onUpload }: Props) => (
  <section className="nlm-hero-panel" aria-label="Featured listening">
    <div className="nlm-hero-copy">
      <span className="nlm-eyebrow">{featuredTrack && isPlaying ? 'NOW PLAYING' : 'A LISTENING ROOM'}</span>
      <h2>{featuredTrack ? featuredTrack.title : 'Find your next listen.'}</h2>
      <p>{featuredTrack
        ? `${featuredTrack.artist}${featuredTrack.genre ? ` · ${featuredTrack.genre}` : ''}`
        : 'The catalogue is quiet for now. Check back when new music is published.'}</p>
      <div className="nlm-hero-actions">
        {featuredTrack ? (
          <button className="nlm-submit-button" onClick={() => onPlay(featuredTrack)}>
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {isPlaying ? 'Pause this track' : 'Listen now'}
          </button>
        ) : isAdminMode ? (
          <button className="nlm-submit-button" onClick={onUpload}><Play size={14} /> Add the first track</button>
        ) : null}
        <button className="nlm-hero-browse" type="button" onClick={() => document.getElementById('nlm-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>Explore the library</span><ArrowDown size={14} /></button>
      </div>
    </div>
    <div className="nlm-hero-art" aria-hidden="true">
      {featuredTrack?.coverUrl ? <img src={resolveAssetUrl(featuredTrack.coverUrl)} alt="" /> : <div className="nlm-hero-art-fallback" />}
      {featuredTrack && <div className="nlm-hero-art-caption"><span>{isPlaying ? 'ON AIR' : 'FEATURED TRACK'}</span><strong>{featuredTrack.artist}</strong></div>}
    </div>
  </section>
);

export default NLMHeroPanel;
