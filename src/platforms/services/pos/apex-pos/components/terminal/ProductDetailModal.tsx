import React, { useState } from "react";
import { PosSettings, formatCurrency } from "../../apexTypes";
import { CartItem, ModifierGroup, ProductWithModifiers } from "../../types/order";
import type { Product } from "../../../../../../services/api";

interface ProductDetailModalProps {
  isOpen: boolean;
  product: ProductWithModifiers | null;
  settings: PosSettings;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  product,
  settings,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  if (!isOpen || !product) return null;

  const handleModifierToggle = (groupId: string, optionId: string) => {
    const group = product.modifierGroups?.find((g: ModifierGroup) => g.id === groupId);
    if (!group) return;
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || [];
      const exists = current.includes(optionId);
      let next: string[];
      if (exists) {
        next = current.filter((id) => id !== optionId);
      } else if (current.length < group.maxSelect) {
        next = [...current, optionId];
      } else {
        next = current;
      }
      return { ...prev, [groupId]: next };
    });
  };

  const calculateModifierPrice = (): number => {
    let total = 0;
    Object.entries(selectedModifiers).forEach(([groupId, optionIds]) => {
      const group = product.modifierGroups?.find((g: ModifierGroup) => g.id === groupId);
      optionIds.forEach((optId) => {
        const opt = group?.options.find((o) => o.id === optId);
        if (opt) total += opt.priceAdjustment;
      });
    });
    return total;
  };

  const unitPrice = product.price + calculateModifierPrice();

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      ...product,
      quantity,
      modifiers: Object.entries(selectedModifiers).flatMap(([groupId, optionIds]) => {
        const group = product.modifierGroups?.find((g: ModifierGroup) => g.id === groupId);
        return optionIds.map((optId) => {
          const opt = group?.options.find((o) => o.id === optId);
          if (!opt) return null;
          return {
            groupId,
            groupName: group?.name || "",
            optionId: opt.id,
            optionName: opt.name,
            priceAdjustment: opt.priceAdjustment,
          };
        }).filter(Boolean) as NonNullable<CartItem["modifiers"]>[number][];
      }),
    };
    onAddToCart(cartItem);
    onClose();
    setQuantity(1);
    setSelectedModifiers({});
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ maxWidth: "500px" }}>
        <div className="pos-modal__header">
          <h3 className="pos-modal__title">{product.name}</h3>
          <button onClick={onClose} className="pos-modal__close">
            ✕
          </button>
        </div>
        <div className="pos-modal__content">
          {product.images && product.images[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px", marginBottom: "12px" }}
            />
          )}
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "12px" }}>{product.description}</p>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
            {formatCurrency(unitPrice, settings.currency)}
          </div>

          {product.modifierGroups && product.modifierGroups.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              {product.modifierGroups.map((group: ModifierGroup) => (
                <div key={group.id} style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "#cbd5e1" }}>
                    {group.name} {group.minSelect > 0 ? `(min ${group.minSelect})` : ""}
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {group.options.map((opt) => {
                      const selected = selectedModifiers[group.id]?.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleModifierToggle(group.id, opt.id)}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid " + (selected ? "#fbbf24" : "#334159"),
                            borderRadius: "6px",
                            background: selected ? "rgba(251, 191, 36, 0.12)" : "rgba(15, 23, 42, 0.8)",
                            color: selected ? "#fbbf24" : "#e2e8f0",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          {opt.name} {opt.priceAdjustment > 0 ? `+${formatCurrency(opt.priceAdjustment, settings.currency)}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px" }}>Qty:</span>
            <button
              className="apex-pos__qty-btn"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{quantity}</span>
            <button
              className="apex-pos__qty-btn"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>
        <div className="pos-modal__actions">
          <button className="pos-btn pos-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="pos-btn pos-btn--primary" onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
