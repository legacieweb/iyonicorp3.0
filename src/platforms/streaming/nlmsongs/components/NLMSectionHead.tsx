interface Props {
  eyebrow: string;
  title: string;
  count?: string | number;
  countLabel?: string;
  className?: string;
}

export const NLMSectionHead = ({ eyebrow, title, count, countLabel, className }: Props) => (
  <div className={`nlm-section-head ${className || ''}`}>
    <div>
      <span className="nlm-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
    </div>
    {count !== undefined && (
      <span className="nlm-track-count">
        {String(count).padStart(2, '0')} {countLabel || 'TRACKS'}
      </span>
    )}
  </div>
);

export default NLMSectionHead;
