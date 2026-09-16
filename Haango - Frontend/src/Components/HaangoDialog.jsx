import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function HaangoDialog({
  open,
  title,
  description,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  tone = 'coral',
  fields = [],
  onConfirm,
  onCancel,
}) {
  const [values, setValues] = useState({});

  useEffect(() => {
    // Reset modal fields whenever a new dialog is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setValues(Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || ''])));
  }, [open, fields]);

  if (!open) return null;
  const accent = tone === 'danger' ? 'bg-error-500' : 'bg-coral-500';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/50 px-4" role="dialog" aria-modal="true" aria-labelledby="haango-dialog-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-2 text-white ${accent}`}><AlertTriangle size={18} /></div>
          <div className="min-w-0 flex-1">
            <h2 id="haango-dialog-title" className="font-display text-xl font-bold text-ink-900">{title}</h2>
            {description && <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>}
          </div>
          <button type="button" onClick={onCancel} className="rounded-xl p-2 text-ink-400 hover:bg-ink-50" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-4">
          {fields.map((field) => (
            <label key={field.name} className="block text-sm font-semibold text-ink-700">
              {field.label}
              {field.type === 'select' ? (
                <select value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="input-field mt-1 w-full">
                  <option value="">Select an option</option>
                  {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="input-field mt-1 min-h-24 w-full" placeholder={field.placeholder} />
              ) : (
                <input type={field.type || 'text'} value={values[field.name] || ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} className="input-field mt-1 w-full" placeholder={field.placeholder} min={field.min} max={field.max} />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">{cancelLabel}</button>
          <button type="button" onClick={() => onConfirm(values)} className={`${tone === 'danger' ? 'bg-error-500 hover:bg-error-600' : 'btn-primary'} flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
