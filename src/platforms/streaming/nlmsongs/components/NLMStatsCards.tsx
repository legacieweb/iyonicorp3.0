interface StatCard {
  label: string;
  value: string | number;
  sublabel?: string;
}

interface Props {
  cards: StatCard[];
}

export const NLMStatsCards = ({ cards }: Props) => (
  <div className="nlm-platform-stats">
    {cards.map((card) => (
      <div key={card.label} className="nlm-stat-card">
        <span>{card.label}</span>
        <strong>{card.value}</strong>
        {card.sublabel && <small>{card.sublabel}</small>}
      </div>
    ))}
  </div>
);

export default NLMStatsCards;
