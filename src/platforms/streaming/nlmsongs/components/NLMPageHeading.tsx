interface Props {
  eyebrow: string;
  title: string;
  copy: string;
  index: string;
  indexFull?: string;
  showIndex?: boolean;
}

export const NLMPageHeading = ({ eyebrow, title, copy, index, indexFull, showIndex = true }: Props) => (
  <div className="nlm-page-heading">
    <div>
      <p className="nlm-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="nlm-heading-copy">{copy}</p>
    </div>
    {showIndex && <span className="nlm-heading-index">
      {index} <span>/ {indexFull || '02'}</span>
    </span>}
  </div>
);

export default NLMPageHeading;
