import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { EQ_PRESETS, getEqBandLabel } from '../constants';
import type { EqualizerState } from '../types';

export default function NLMEqualizerControl({ eq, compact = false }: { eq: EqualizerState; compact?: boolean }) {
  return <div className={`nlm-eq-control ${compact ? 'is-compact' : ''}`}>
    <div className="nlm-eq-control-head">
      <div className="nlm-eq-status"><span className={`nlm-eq-status-dot ${eq.active ? 'is-active' : ''}`} /><span><strong>{eq.active ? 'Equalizer active' : 'Equalizer bypassed'}</strong><small>{eq.available ? `${eq.preset} profile · playback processing ready` : eq.error || 'Connecting audio processor…'}</small></span></div>
      <button className={`nlm-eq-power ${eq.active ? 'is-active' : ''}`} onClick={eq.toggle} aria-pressed={eq.active}><SlidersHorizontal size={14}/>{eq.active ? 'Bypass' : 'Enable'}</button>
    </div>
    {eq.error && <p className="nlm-eq-error" role="status">{eq.error}</p>}
    <div className="nlm-eq-preset-row" aria-label="Equalizer presets">
      {Object.keys(EQ_PRESETS).map((name) => <button key={name} className={eq.preset === name ? 'is-active' : ''} onClick={() => eq.applyPreset(name)} aria-pressed={eq.preset === name}>{name}</button>)}
    </div>
    <div className="nlm-eq-bands" aria-label="10-band equalizer controls">
      {eq.bands.map((band, index) => <label key={index} className="nlm-eq-band">
        <span className="nlm-eq-gain">{band > 0 ? '+' : ''}{band}<small> dB</small></span>
        <input type="range" min="-12" max="12" step="1" value={band} onChange={(event) => { const next = [...eq.bands]; next[index] = Number(event.target.value); eq.setBands(next); }} aria-label={`${getEqBandLabel(index)} gain`} aria-valuetext={`${band} decibels`} />
        <span className="nlm-eq-band-label">{getEqBandLabel(index)}</span>
      </label>)}
    </div>
    <div className="nlm-eq-control-foot"><span>−12 dB <i aria-hidden="true"/> +12 dB</span><button className="nlm-eq-reset" onClick={eq.reset}><RotateCcw size={12}/> Reset flat</button></div>
  </div>;
}
