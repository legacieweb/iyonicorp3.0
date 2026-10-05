import React from 'react';
import { ChefHat, ShoppingCart } from 'lucide-react';
import { Product, PosSettings, formatCurrency, getCategoryName } from '../../apexTypes';

interface MenuGridProps {
  items: Product[];
  settings: PosSettings;
  onItemSelect: (item: Product) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({ items, settings, onItemSelect }) => {
  return (
    <div className="apex-pos__menu-grid">
      {items.length ? (
        items.map((item) => (
          <div
            role="button"
            tabIndex={0}
            key={item.id}
            className="apex-pos__menu-item"
            onClick={() => onItemSelect(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onItemSelect(item);
              }
            }}
          >
            {settings.showImages && item.images && item.images[0] ? (
              <div className="apex-pos__menu-item-image">
                <img src={item.images[0]} alt="" />
              </div>
            ) : (
              <div className="apex-pos__menu-item-image apex-pos__menu-item-image--empty">
                <ChefHat size={22} aria-hidden="true" />
              </div>
            )}
            <div className="apex-pos__menu-item-category">
              {getCategoryName(item.category)}
            </div>
            <div className="apex-pos__menu-item-name">{item.name}</div>
            {item.description && (
              <div className="apex-pos__menu-item-desc">{item.description}</div>
            )}
            <div className="apex-pos__menu-item-price">
              {formatCurrency(item.price, settings.currency)}
            </div>
          </div>
        ))
      ) : (
        <div className="apex-pos__empty">
          <ShoppingCart size={36} />
          <p style={{ marginTop: '12px' }}>No items found.</p>
        </div>
      )}
    </div>
  );
};
