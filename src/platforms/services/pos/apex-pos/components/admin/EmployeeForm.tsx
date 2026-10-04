import React, { useState } from 'react';
import { PosEmployee, EmployeeRole, getRoleLabel } from "../../apexTypes";

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmployee: PosEmployee | null;
  onSave: (employee: PosEmployee | null, formData: {
    name: string;
    role: EmployeeRole;
    pin: string;
    active: boolean;
    photo: string;
  }) => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  isOpen,
  onClose,
  editingEmployee,
  onSave,
}) => {
  const [form, setForm] = useState({
    name: editingEmployee?.name || '',
    role: editingEmployee?.role || 'cashier' as EmployeeRole,
    pin: '',
    active: editingEmployee?.active ?? true,
    photo: editingEmployee?.photo || '',
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave(editingEmployee, form);
  };

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal">
        <div className="pos-modal__header">
          <h3 className="pos-modal__title">{editingEmployee ? 'Edit Employee' : 'New Employee'}</h3>
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
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
            >
              {(['owner', 'manager', 'admin', 'cashier', 'kitchen', 'server'] as EmployeeRole[]).map(
                (role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="apex-form__field">
            <label>PIN (4 digits)</label>
            <input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="Leave blank to keep existing"
            />
          </div>
          <div className="apex-form__field">
            <label>Photo URL</label>
            <input
              type="text"
              value={form.photo}
              onChange={(e) => setForm({ ...form, photo: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="apex-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label style={{ margin: 0 }}>Active</label>
          </div>
        </div>
        <div className="pos-modal__actions">
          <button className="pos-btn pos-btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="pos-btn pos-btn--primary" onClick={handleSubmit}>
            {editingEmployee ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};
