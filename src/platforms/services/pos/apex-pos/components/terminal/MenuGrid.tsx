import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Product, PosSettings, formatCurrency } from '../../apexTypes';
import { CartItem } from '../../types/order';

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
            key={item.id}
            className="apex-pos__menu-item"
            onClick={() => onItemSelect(item)}
          >
            {settings.showImages && item.images && item.images[0] ? (
              <img
                src={item.images[0]}
                alt={item.name}
                className="apex-pos__cart-item-img"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  marginBottom: '6px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '6px',
                  background: '#0f172a',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <ShoppingCart size={20} />
              </div>
            )}
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
