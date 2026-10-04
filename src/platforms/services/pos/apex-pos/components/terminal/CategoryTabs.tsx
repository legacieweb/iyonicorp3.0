import React from 'react';
import { Search, ChefHat, Settings2 } from 'lucide-react';
import { getCategoryName, PosSettings } from '../../apexTypes';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  searchQuery: string;
  settings: PosSettings;
  onCategoryChange: (cat: string) => void;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  searchQuery,
  settings,
  onCategoryChange,
  onSearchChange,
  onOpenSettings,
}) => {
  return (
    <div className="apex-pos__categories">
      <div style={{ position: 'relative', flex: 1 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
          }}
        />
        <input
          type="text"
          placeholder="Search menu..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 28px',
            fontSize: '12px',
            background: '#0f172a',
            border: '1px solid #334159',
            borderRadius: '6px',
            color: '#e2e8f0',
            outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', paddingBottom: '4px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`apex-pos__category-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat === 'all' ? 'ALL' : getCategoryName(cat)}
          </button>
        ))}
        {settings.kitchenCategories &&
          settings.kitchenCategories
            .filter((c) => c !== 'All')
            .map((cat) => (
              <button
                key={cat}
                className={`apex-pos__category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat)}
                style={{ fontSize: '10px' }}
              >
                <ChefHat size={12} />
                {cat}
              </button>
            ))}
        <button
          onClick={onOpenSettings}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background: 'transparent',
            color: '#64748b',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          aria-label="Settings"
        >
          <Settings2 size={14} />
        </button>
      </div>
    </div>
  );
};
