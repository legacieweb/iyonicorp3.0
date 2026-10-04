import React, { useState } from 'react';
import { Product } from "../../../../../../services/api";
import { PosSettings, getCategoryName } from "../../apexTypes";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  settings: PosSettings;
  onSave: (product: Product | null, formData: {
    name: string;
    description: string;
    price: string;
    category: string;
    image: string;
    stock: string;
  }) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  editingProduct,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    description: editingProduct?.description || '',
    price: editingProduct ? String(editingProduct.price) : '',
    category: editingProduct?.category || 'main',
    image: editingProduct?.images?.[0] || '',
    stock: editingProduct?.stock !== undefined ? String(editingProduct.stock) : '0',
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave(editingProduct, form);
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal">
        <div className="pos-modal__header">
          <h3 className="pos-modal__title">{editingProduct ? 'Edit Item' : 'New Item'}</h3>
          <button onClick={onClose} className="pos-modal__close">
            ✕
          </button>
        </div>
        <div className="pos-modal__content">
          <div className="apex-form__field">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="apex-form__field">
            <label>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="apex-form__field">
            <label>Price</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="apex-form__field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="drink">Drinks</option>
              <option value="appetizer">Starters</option>
              <option value="main">Mains</option>
              <option value="dessert">Desserts</option>
              <option value="special">Chef's Specials</option>
              <option value="sides">Sides</option>
            </select>
          </div>
          <div className="apex-form__field">
            <label>Image URL</label>
            <input
              type="text"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="apex-form__field">
            <label>Stock</label>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
        </div>
        <div className="pos-modal__actions">
          <button className="pos-btn pos-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="pos-btn pos-btn--primary" onClick={handleSubmit}>
            {editingProduct ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};
