import React, { useState, useMemo } from 'react';
import {
  X, Check, CreditCard, Banknote, Smartphone, Receipt,
  Split, Users,
} from 'lucide-react';
import { PosSettings, formatCurrency, PosEmployee } from '../../apexTypes';
import { CartItem } from '../../types/order';
import { PosLoyaltyProgram, getLoyaltyTier } from '../../types/loyalty';

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: PosSettings;
  customerInfo: { name: string; phone: string; email: string };
  currentEmployee: PosEmployee | null;
  subtotal: number;
  tax: number;
  serviceFee: number;
  grandTotal: number;
  tipAmount: number;
  selectedTable: string | null;
  onPlaceOrder: (paymentMethod: string, tip: number, splitMode?: string, loyaltyPointsUsed?: number) => void;
  isSubmitting: boolean;
  loyaltyInfo?: PosLoyaltyProgram | null;
}

export const PayModal: React.FC<PayModalProps> = ({
  isOpen,
  onClose,
  cart,
  settings,
  customerInfo,
  currentEmployee,
  subtotal,
  tax,
  serviceFee,
  grandTotal,
  tipAmount,
  selectedTable,
  onPlaceOrder,
  isSubmitting,
  loyaltyInfo,
}) => {
  const [activeTip, setActiveTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [splitMode, setSplitMode] = useState<'none' | 'even' | 'individual'>('none');
  const [splitCount, setSplitCount] = useState(2);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);
  const [showLoyalty, setShowLoyalty] = useState(false);

  const tipOptions = settings.tipSuggestions.length ? settings.tipSuggestions : [15, 18, 20, 25];
  const tipAmounts = tipOptions.map((pct: number) => Math.round((subtotal * pct) / 100));

  const currentTotal = grandTotal + activeTip;
  const pointsValue = 0.01;
  const maxRedeemable = loyaltyInfo
    ? Math.min(
        loyaltyInfo.pointsBalance,
        Math.floor((loyaltyInfo.lifetimePoints > 0 ? currentTotal / pointsValue : 0))
      )
    : 0;

  const handleTipSelect = (amount: number) => {
    setActiveTip(amount);
    setCustomTip('');
  };

  const handleCustomTip = () => {
    const amt = Number(customTip) || 0;
    setActiveTip(amt);
  };

  const handlePlaceOrder = (paymentMethod: string) => {
    onPlaceOrder(paymentMethod, activeTip, splitMode, loyaltyPointsUsed);
  };

  const handleSplitToggle = () => {
    if (splitMode === 'none') {
      setSplitMode(settings.enableSplitBills ? 'even' : 'none');
      setSplitCount(2);
    } else {
      setSplitMode('none');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal" style={{ maxWidth: '560px' }}>
        <div className="pos-modal__header">
          <h3 className="pos-modal__title">Complete Payment</h3>
          <button onClick={onClose} className="pos-modal__close">
            <X size={18} />
          </button>
        </div>
        <div className="pos-modal__content">
          <div style={{ marginBottom: '12px', padding: '8px', background: '#0f172a', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Table Total</span>
              <strong>{formatCurrency(currentTotal, settings.currency)}</strong>
            </div>
            {customerInfo.name && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {customerInfo.name}
              </div>
            )}
            {selectedTable && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Table {selectedTable}
              </div>
            )}
          </div>

          {splitMode === 'none' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#94a3b8' }}>
                  Add Tip
                </label>
                <div className="apex-pos__tip-btns">
                  {tipAmounts.map((amt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="apex-pos__tip-btn"
                      onClick={() => handleTipSelect(amt)}
                      style={{ color: activeTip === amt ? '#ffffff' : '#94a3b8' }}
                    >
                      {formatCurrency(amt, settings.currency).replace(/^[^0-9]*/, '')}
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>{tipOptions[i]}%</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="apex-pos__tip-btn"
                    onClick={() => {
                      setActiveTip(0);
                      setCustomTip('');
                    }}
                    style={{ color: activeTip === 0 ? '#ffffff' : '#94a3b8' }}
                  >
                    Skip
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="number"
                    placeholder="$0.00"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '13px',
                      background: '#0f172a',
                      border: '1px solid #334159',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                    }}
                  />
                  <button
                    onClick={handleCustomTip}
                    className="pos-btn pos-btn--secondary"
                    style={{ padding: '6px 16px' }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>

              {settings.enableLoyalty && loyaltyInfo && loyaltyInfo.pointsBalance > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#94a3b8' }}>
                    Loyalty Points ({loyaltyInfo.pointsBalance} available)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="0"
                      value={loyaltyPointsUsed || ''}
                      onChange={(e) => setLoyaltyPointsUsed(Math.min(Number(e.target.value) || 0, maxRedeemable))}
                      max={maxRedeemable}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '13px',
                        background: '#0f172a',
                        border: '1px solid #334159',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      = {formatCurrency(loyaltyPointsUsed * pointsValue, settings.currency)} off
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    Tier: {getLoyaltyTier(loyaltyInfo.lifetimePoints).label}
                  </div>
                </div>
              )}

              {settings.enableSplitBills && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={handleSplitToggle}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #334159',
                      borderRadius: '6px',
                      background: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Split size={14} /> Split Bill
                  </button>
                </div>
              )}
            </>
          )}

          {splitMode !== 'none' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: '#94a3b8' }}>
                Split {splitMode === 'even' ? 'Evenly' : 'by Item'}
              </label>
              {splitMode === 'even' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Users size={16} />
                  <input
                    type="number"
                    min={2}
                    max={cart.length > 0 ? cart.length : 2}
                    value={splitCount}
                    onChange={(e) => setSplitCount(Math.max(2, Math.min(cart.length || 2, Number(e.target.value) || 2)))}
                    style={{
                      width: '80px',
                      padding: '6px 8px',
                      fontSize: '13px',
                      background: '#0f172a',
                      border: '1px solid #334159',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    people — {formatCurrency(currentTotal / splitCount, settings.currency)} each
                  </span>
                </div>
              )}
              <button
                onClick={() => setSplitMode('none')}
                style={{
                  marginTop: '8px',
                  padding: '4px 12px',
                  border: '1px solid #334159',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <X size={10} /> Cancel Split
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className="pos-btn pos-btn--primary"
              onClick={() => handlePlaceOrder('card')}
              disabled={isSubmitting}
            >
              <CreditCard size={16} /> Card
            </button>
            <button
              className="pos-btn pos-btn--primary"
              onClick={() => handlePlaceOrder('cash')}
              disabled={isSubmitting}
            >
              <Banknote size={16} /> Cash
            </button>
            <button
              className="pos-btn pos-btn--primary"
              onClick={() => handlePlaceOrder('mobile')}
              disabled={isSubmitting}
            >
              <Smartphone size={16} /> Mobile
            </button>
            <button
              className="pos-btn pos-btn--primary"
              onClick={() => handlePlaceOrder('custom')}
              disabled={isSubmitting}
            >
              <Receipt size={16} /> Other
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
