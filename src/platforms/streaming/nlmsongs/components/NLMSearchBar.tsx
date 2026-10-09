import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const NLMSearchBar = ({ value, onChange, placeholder = 'Search...', ariaLabel = 'Search' }: Props) => (
  <div className="nlm-search-panel">
    <Search size={16} />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  </div>
);

export default NLMSearchBar;
