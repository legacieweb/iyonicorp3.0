import React from 'react';
import { PosSettings } from "../../apexTypes";

interface SettingsFormProps {
  settings: PosSettings;
  onSettingsChange: (settings: PosSettings) => void;
  onSave: () => void;
  saving: boolean;
  onOpenTerminal: () => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  settings,
  onSettingsChange,
  onSave,
  saving,
  onOpenTerminal,
}) => {
  const updateSetting = (key: keyof PosSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <form
      className="pos-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="pos-form__grid">
        <div className="pos-form__field">
          <label>Currency</label>
          <input
            type="text"
            value={settings.currency}
            onChange={(e) => updateSetting('currency', e.target.value.toUpperCase())}
          />
        </div>
        <div className="pos-form__field">
          <label>Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.taxRate}
            onChange={(e) => updateSetting('taxRate', Number(e.target.value))}
          />
        </div>
        <div className="pos-form__field">
          <label>Service Charge (%)</label>
          <input
            type="number"
            step="0.01"
            value={settings.serviceCharge}
            onChange={(e) => updateSetting('serviceCharge', Number(e.target.value))}
          />
        </div>
        <div className="pos-form__field">
          <label>Rounding</label>
          <select
            value={settings.rounding}
            onChange={(e) => updateSetting('rounding', e.target.value as PosSettings['rounding'])}
          >
            <option value="none">None</option>
            <option value="nearest">Nearest Dollar</option>
            <option value="up">Round Up</option>
            <option value="down">Round Down</option>
          </select>
        </div>
        <div className="pos-form__field">
          <label>Table Count</label>
          <input
            type="number"
            value={settings.tableCount}
            onChange={(e) => updateSetting('tableCount', Number(e.target.value))}
          />
        </div>
        <div className="pos-form__field">
          <label>Tips Suggestions (%)</label>
          <input
            type="text"
            value={settings.tipSuggestions.join(', ')}
            onChange={(e) =>
              updateSetting(
                'tipSuggestions',
                e.target.value.split(',').map((s) => Number(s.trim()) || 0)
              )
            }
          />
        </div>
        <div className="pos-form__field">
          <label>Receipt Header</label>
          <input
            type="text"
            value={settings.receiptHeader}
            onChange={(e) => updateSetting('receiptHeader', e.target.value)}
          />
        </div>
        <div className="pos-form__field">
          <label>Receipt Footer</label>
          <input
            type="text"
            value={settings.receiptFooter}
            onChange={(e) => updateSetting('receiptFooter', e.target.value)}
          />
        </div>
        <div className="pos-form__field">
          <label>Printer Name</label>
          <input
            type="text"
            value={settings.printerName || ''}
            onChange={(e) => updateSetting('printerName', e.target.value || undefined)}
          />
        </div>
        <div className="pos-form__field">
          <label>Time Zone</label>
          <input
            type="text"
            value={settings.timezone}
            onChange={(e) => updateSetting('timezone', e.target.value)}
          />
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.autoPrintReceipts}
            onChange={(e) => updateSetting('autoPrintReceipts', e.target.checked)}
          />
          <label>Auto-print receipts</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.requireCustomerInfo}
            onChange={(e) => updateSetting('requireCustomerInfo', e.target.checked)}
          />
          <label>Require customer info</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.showImages}
            onChange={(e) => updateSetting('showImages', e.target.checked)}
          />
          <label>Show item images</label>
        </div>
      </div>

      <div className="pos-form__grid" style={{ marginTop: '16px' }}>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableSplitBills}
            onChange={(e) => updateSetting('enableSplitBills', e.target.checked)}
          />
          <label>Enable split bills</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableLoyalty}
            onChange={(e) => updateSetting('enableLoyalty', e.target.checked)}
          />
          <label>Enable loyalty program</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableTableManagement}
            onChange={(e) => updateSetting('enableTableManagement', e.target.checked)}
          />
          <label>Enable table management</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableEmployeeLogin}
            onChange={(e) => updateSetting('enableEmployeeLogin', e.target.checked)}
          />
          <label>Require employee login</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableShifts}
            onChange={(e) => updateSetting('enableShifts', e.target.checked)}
          />
          <label>Enable shift management</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableOfflineMode}
            onChange={(e) => updateSetting('enableOfflineMode', e.target.checked)}
          />
          <label>Enable offline mode</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.enableModifiers}
            onChange={(e) => updateSetting('enableModifiers', e.target.checked)}
          />
          <label>Enable menu modifiers</label>
        </div>
        <div className="pos-form__field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={settings.compactLayout}
            onChange={(e) => updateSetting('compactLayout', e.target.checked)}
          />
          <label>Compact layout</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button type="submit" className="pos-btn pos-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
          {!saving && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 2 9 8 7 6" />
            </svg>
          )}
        </button>
        <button type="button" className="pos-btn pos-btn--secondary" onClick={onOpenTerminal}>
          Open Terminal
        </button>
      </div>
    </form>
  );
};
