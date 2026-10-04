import React, { useState, useRef, useEffect } from 'react';
import { X, Fingerprint, UserCheck } from 'lucide-react';
import { PosEmployee, getRoleLabel } from '../../apexTypes';

interface PinEntryProps {
  employees: PosEmployee[];
  currentEmployee: PosEmployee | null;
  isLoading: boolean;
  onVerifyPin: (employee: PosEmployee, pin: string) => Promise<boolean>;
  onSwitchEmployee: (employee: PosEmployee) => void;
  onCancel: () => void;
}

export const PinEntry: React.FC<PinEntryProps> = ({
  employees,
  currentEmployee,
  isLoading,
  onVerifyPin,
  onSwitchEmployee,
  onCancel,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<PosEmployee | null>(currentEmployee || employees[0]);
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 4 && selectedEmployee && !isLoading) {
      handleVerify();
    }
  }, [pin, selectedEmployee]);

  const handleVerify = async () => {
    if (!selectedEmployee || isLoading) return;
    const success = await onVerifyPin(selectedEmployee, pin);
    if (success) {
      setPin('');
    } else {
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4 && !isLoading) {
      setPin((p) => p + num);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handleEmployeeSelect = (employee: PosEmployee) => {
    setSelectedEmployee(employee);
    setPin('');
    onSwitchEmployee(employee);
  };

  return (
    <div className="apex-pos__login-screen">
      <div className="apex-pos__login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Fingerprint size={20} style={{ color: '#fbbf24' }} />
          <h2 style={{ margin: 0, fontSize: '18px' }}>Employee Login</h2>
        </div>

        <div className="apex-pos__employee-list" style={{ maxHeight: '140px', marginBottom: '16px' }}>
          {employees.filter((e) => e.active).map((emp) => (
            <div
              key={emp.id}
              className={`apex-pos__employee-item ${selectedEmployee?.id === emp.id ? 'active' : ''}`}
              onClick={() => handleEmployeeSelect(emp)}
            >
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={14} />
                {emp.name}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{getRoleLabel(emp.role)}</div>
            </div>
          ))}
        </div>

        {selectedEmployee && (
          <>
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
                Enter PIN for <strong>{selectedEmployee.name}</strong>
              </div>
              <div
                className="apex-pos__pin-display"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  fontSize: '20px',
                  fontFamily: 'monospace',
                  letterSpacing: '8px',
                  padding: '8px',
                }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: '24px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0f172a',
                      border: '1px solid #334159',
                      borderRadius: '6px',
                      color: pin[i] ? '#e2e8f0' : '#334159',
                    }}
                  >
                    {pin[i] ? '•' : ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="apex-pos__pin-input">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((label, i) => {
                if (!label) {
                  return <div key={i} style={{ visibility: 'hidden' }} />;
                }
                return (
                  <button
                    key={label}
                    type="button"
                    className="apex-pos__pin-btn"
                    onClick={() => (label === '⌫' ? handleDelete() : handleNumberClick(label))}
                    disabled={isLoading}
                    style={label === '⌫' ? { background: '#ef44441a', color: '#fca5a7' } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button
          className="pos-btn pos-btn--secondary"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={onCancel}
          disabled={isLoading}
        >
          <X size={16} /> Cancel
        </button>
      </div>
    </div>
  );
};
