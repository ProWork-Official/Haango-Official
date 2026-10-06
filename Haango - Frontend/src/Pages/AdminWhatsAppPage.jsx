import { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Phone, Plus, RefreshCw, Send, Users, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const unwrap = (value) => value?.data ?? value ?? {};
const maximumRecipients = 5;
const normalizePhone = (value, countryCode = '91') => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `${countryCode}${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
};

export default function AdminWhatsAppPage({ onNavigate }) {
  const [status, setStatus] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [recipients, setRecipients] = useState([{ id: 'recipient-1', phone: '', consentConfirmed: false, opened: false }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadInitialStatus = async () => {
      try {
        const nextStatus = unwrap(await apiRequest('/admin/whatsapp-campaigns/status'));
        if (!active) return;
        setStatus(nextStatus);
        setTemplateId(nextStatus.templates?.[0]?.id || '');
        setDraftMessage(nextStatus.templates?.[0]?.message || '');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load WhatsApp campaign status.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitialStatus();
    return () => { active = false; };
  }, []);

  const loadStatus = async () => {
    try {
      const nextStatus = unwrap(await apiRequest('/admin/whatsapp-campaigns/status'));
      setStatus(nextStatus);
      setTemplateId((current) => current || nextStatus.templates?.[0]?.id || '');
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load WhatsApp campaign status.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = status?.templates?.find((template) => template.id === templateId);
  const updateRecipient = (recipientId, field, value) => {
    setRecipients((current) => current.map((recipient) => recipient.id === recipientId
      ? { ...recipient, [field]: value, opened: field === 'phone' ? false : recipient.opened }
      : recipient));
  };
  const addRecipient = () => {
    if (recipients.length >= maximumRecipients) return;
    setRecipients((current) => [...current, {
      id: `recipient-${Date.now()}-${current.length}`,
      phone: '',
      consentConfirmed: false,
      opened: false,
    }]);
  };
  const removeRecipient = (recipientId) => {
    setRecipients((current) => current.filter((recipient) => recipient.id !== recipientId));
  };
  const getDraftUrl = (recipient) => {
    const phone = normalizePhone(recipient.phone, status?.defaultCountryCode);
    if (!phone || !recipient.consentConfirmed || !draftMessage.trim()) return '';
    const duplicate = recipients.some((other) => other.id !== recipient.id
      && normalizePhone(other.phone, status?.defaultCountryCode) === phone);
    return duplicate ? '' : `https://wa.me/${phone}?text=${encodeURIComponent(draftMessage.trim())}`;
  };
  const markDraftOpened = (recipientId) => {
    setRecipients((current) => current.map((recipient) => recipient.id === recipientId ? { ...recipient, opened: true } : recipient));
    setNotice('WhatsApp opened with the message drafted. Review it and press Send in WhatsApp.');
  };

  return (
    <AdminLayout activePage="whatsapp" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-ink-500">Create a draft, open WhatsApp, and send manually</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">WhatsApp campaigns</h1></div>
            <button type="button" onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Admin dashboard</button>
          </div>

          {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
          {notice && <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <section className="rounded-xl border border-[#e8edf6] bg-white p-4"><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Users size={18} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{loading ? '—' : Number(status?.eligibleRecipientCount || 0).toLocaleString('en-IN')}</p><p className="mt-1 text-xs text-ink-500">Active opted-in signups</p></section>
            <section className="rounded-xl border border-[#e8edf6] bg-white p-4"><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><MessageCircle size={18} /></span><p className="font-display text-lg font-bold text-ink-900">No API setup needed</p><p className="mt-1 text-xs text-ink-500">Opens your WhatsApp Business app or web session.</p></section>
            <section className="rounded-xl border border-[#e8edf6] bg-white p-4"><span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-[#e95718]"><Phone size={18} /></span><p className="font-display text-lg font-bold text-ink-900">{status?.invalidPhoneCount || 0} invalid numbers</p><p className="mt-1 text-xs text-ink-500">10-digit numbers use +{status?.defaultCountryCode || '91'}.</p></section>
          </div>

          <p className="mb-5 text-xs text-ink-500">Each contact opens separately. Review the draft and press Send in WhatsApp; this page does not send messages automatically.</p>

          <section className="mb-5" aria-label="Choose campaign template">
            <div className="mb-3 flex items-center gap-2"><MessageCircle size={17} className="text-emerald-700" /><h2 className="font-display text-lg font-bold text-ink-900">Choose template</h2></div>
            {loading ? <p className="rounded-xl bg-white p-5 text-sm text-ink-500">Loading campaigns…</p> : <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {status?.templates?.map((template) => <button key={template.id} type="button" onClick={() => { setTemplateId(template.id); setDraftMessage(template.message); setNotice(''); }} aria-pressed={templateId === template.id} className={`min-h-24 rounded-xl border p-4 text-left transition ${templateId === template.id ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-[#e8edf6] bg-white hover:border-emerald-200'}`}><span className="text-[10px] font-bold uppercase text-emerald-700">{template.category}</span><span className="mt-1 block text-sm font-bold text-ink-900">{template.title}</span><span className="mt-1 block text-[11px] text-ink-500">{template.name}</span></button>)}
            </div>}
          </section>

          {selectedTemplate && <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="overflow-hidden rounded-xl border border-[#e8edf6] bg-white">
              <div className="flex items-center gap-3 border-b border-[#edf1f7] px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><MessageCircle size={18} /></span><div><h2 className="font-display text-lg font-bold text-ink-900">{selectedTemplate.title}</h2><p className="text-xs text-ink-500">Marketing template · {selectedTemplate.name} · {status?.templateLanguage || 'en_US'}</p></div></div>
              <div className="bg-[#e8f5e9] p-4 sm:p-6">
                <label className="ml-auto block max-w-xl text-xs font-semibold text-ink-600">Draft message<textarea value={draftMessage} onChange={(event) => { setDraftMessage(event.target.value); setRecipients((current) => current.map((recipient) => ({ ...recipient, opened: false }))); }} rows={20} maxLength={4096} className="mt-2 w-full resize-y rounded-xl border border-[#e8edf6] bg-white p-4 text-sm leading-relaxed text-ink-800 shadow-sm outline-none focus:border-emerald-400" /></label>
                <p className="ml-auto mt-1 max-w-xl text-right text-[11px] text-ink-400">{draftMessage.length}/4096 characters</p>
                <div className="ml-auto mt-3 max-w-xl rounded-lg bg-white/80 px-4 py-3 text-xs leading-relaxed text-ink-700">
                  <p className="mb-1 font-bold text-ink-800">Call-to-action text included in the draft</p>
                  {selectedTemplate.buttons.map((button) => <p key={button.text}>{button.text}: {button.type === 'PHONE_NUMBER' ? '+91 8400732040' : button.url}</p>)}
                </div>
              </div>
              <div className="border-t border-[#edf1f7] px-5 py-3 text-xs leading-relaxed text-ink-500">Links are clickable text, not interactive WhatsApp buttons. After opening a chat, attach any campaign image manually in WhatsApp before sending.</div>
            </section>

            <section className="rounded-xl border border-[#e8edf6] bg-white p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold text-ink-900">Recipients</h2><span className="text-xs font-semibold text-ink-500">{recipients.length}/{maximumRecipients}</span></div>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">One WhatsApp draft opens per contact. Confirm each person opted in before opening.</p>
              <div className="mt-4 space-y-3">
                {recipients.map((recipient, index) => {
                  const draftUrl = getDraftUrl(recipient);
                  return <div key={recipient.id} className="rounded-lg border border-[#e8edf6] p-3">
                    <div className="flex items-center gap-2"><label className="min-w-0 flex-1 text-xs font-semibold text-ink-700">Contact {index + 1}<input type="tel" autoComplete="tel" value={recipient.phone} onChange={(event) => updateRecipient(recipient.id, 'phone', event.target.value)} placeholder="+91 84007 32040" className="input-field mt-1" /></label><button type="button" onClick={() => removeRecipient(recipient.id)} disabled={recipients.length === 1} title="Remove contact" aria-label={`Remove contact ${index + 1}`} className="mt-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 disabled:opacity-40"><X size={16} /></button></div>
                    <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-600"><input type="checkbox" checked={recipient.consentConfirmed} onChange={(event) => updateRecipient(recipient.id, 'consentConfirmed', event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" /><span>This person agreed to receive WhatsApp offers.</span></label>
                    <a href={draftUrl || undefined} target="_blank" rel="noreferrer" onClick={(event) => { if (!draftUrl) { event.preventDefault(); return; } markDraftOpened(recipient.id); }} aria-disabled={!draftUrl} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${draftUrl ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'cursor-not-allowed bg-ink-100 text-ink-400'}`}><Send size={14} />{recipient.opened ? 'Reopen WhatsApp draft' : 'Open WhatsApp draft'}</a>
                  </div>;
                })}
              </div>
              <button type="button" onClick={addRecipient} disabled={recipients.length >= maximumRecipients} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#d8e3f4] bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={15} />Add contact</button>
              <button type="button" onClick={loadStatus} disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-ink-500 hover:bg-ink-50 disabled:opacity-50"><RefreshCw size={13} />Refresh opted-in signup count</button>
            </section>
          </div>}
        </div>
      </main>
    </AdminLayout>
  );
}