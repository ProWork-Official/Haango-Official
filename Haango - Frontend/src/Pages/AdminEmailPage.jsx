import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';
import { parseBulkEmailRecipients } from '../lib/emailRecipients';

const defaultRecipientMode = (template) => template?.deliveryMode === 'triggered' ? 'MATCHED' : 'ALL';

export default function AdminEmailPage({ onNavigate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [recipientMode, setRecipientMode] = useState('');
  const [senderProvider, setSenderProvider] = useState('GMAIL');
  const [email, setEmail] = useState('');
  const [bulkEmailText, setBulkEmailText] = useState('');
  const [promoCode, setPromoCode] = useState('WELCOME100');
  const [promoExpiry, setPromoExpiry] = useState('');
  const [creditAmount, setCreditAmount] = useState('100');
  const [milestone, setMilestone] = useState('10');
  const [loading, setLoading] = useState(true);
  const [previewState, setPreviewState] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest('/admin/email-campaigns/templates')
      .then((response) => {
        if (!active) return;
        const templateList = Array.isArray(response) ? response : response?.templates || [];
        setTemplates(templateList);
        setSelectedId(templateList[0]?.id || '');
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load email templates.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selectedTemplate = templates.find((template) => template.id === selectedId);
  const mode = recipientMode || defaultRecipientMode(selectedTemplate);
  const bulkRecipients = parseBulkEmailRecipients(bulkEmailText);
  const previewKey = selectedTemplate
    ? JSON.stringify([
      selectedTemplate.id,
      selectedTemplate.variables?.includes('promoCode') ? promoCode : '',
      selectedTemplate.variables?.includes('creditAmount') ? creditAmount : '',
      selectedTemplate.variables?.includes('milestone') ? milestone : '',
    ])
    : '';
  const previewMatchesSelection = previewState?.key === previewKey;
  const preview = previewMatchesSelection ? previewState.data : null;
  const previewLoading = Boolean(selectedTemplate) && !previewMatchesSelection;

  useEffect(() => {
    if (!selectedTemplate) return undefined;

    let active = true;
    apiRequest('/admin/email-campaigns/preview', {
      method: 'POST',
      body: JSON.stringify({
        templateId: selectedTemplate.id,
        promoCode: selectedTemplate.variables?.includes('promoCode') ? promoCode : undefined,
        creditAmount: selectedTemplate.variables?.includes('creditAmount') ? Number(creditAmount) : undefined,
        milestone: selectedTemplate.variables?.includes('milestone') ? Number(milestone) : undefined,
      }),
    })
      .then((response) => {
        if (active) setPreviewState({ key: previewKey, data: response?.data || response });
      })
      .catch(() => {
        if (active) setPreviewState({ key: previewKey, data: null });
      });

    return () => { active = false; };
  }, [selectedTemplate, promoCode, creditAmount, milestone, previewKey]);

  const templateGroups = useMemo(() => templates.reduce((groups, template) => {
    groups[template.category] ||= [];
    groups[template.category].push(template);
    return groups;
  }, {}), [templates]);

  const selectTemplate = (template) => {
    setSelectedId(template.id);
    setRecipientMode(defaultRecipientMode(template));
    setResult(null);
    setError('');
  };

  const sendCampaign = async (event) => {
    event.preventDefault();
    if (!selectedTemplate) return;
    if (mode === 'SINGLE' && !email.trim()) {
      setError('Enter the recipient account email.');
      return;
    }
    if (mode === 'BULK' && bulkRecipients.error) {
      setError(bulkRecipients.error);
      return;
    }
    const confirmation = mode === 'BULK'
      ? `Send “${selectedTemplate.title}” to up to ${bulkRecipients.emails.length} unique email addresses using ${senderProvider === 'HOSTINGER' ? 'Hostinger' : 'Gmail'}? Existing Haango accounts will be skipped.`
      : `Send “${selectedTemplate.title}” to ${mode === 'ALL' ? `all active ${selectedTemplate.recipientRole === 'BUDDY' ? 'buddies' : 'customers'}` : mode === 'SINGLE' ? email.trim() : 'all accounts matching this trigger'}?`;
    if (mode !== 'SINGLE' && !window.confirm(confirmation)) return;

    setSending(true);
    setError('');
    setResult(null);
    try {
      const response = await apiRequest('/admin/email-campaigns/send', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          recipientMode: mode,
          senderProvider: mode === 'BULK' ? senderProvider : undefined,
          email: mode === 'SINGLE' ? email.trim() : undefined,
          recipientEmails: mode === 'BULK' ? bulkRecipients.emails : undefined,
          promoCode: selectedTemplate.variables?.includes('promoCode') ? promoCode : undefined,
          promoExpiry: selectedTemplate.variables?.includes('promoExpiry') ? promoExpiry : undefined,
          creditAmount: selectedTemplate.variables?.includes('creditAmount') ? Number(creditAmount) : undefined,
          milestone: selectedTemplate.variables?.includes('milestone') ? Number(milestone) : undefined,
        }),
      });
      setResult(response?.data || response);
    } catch (sendError) {
      setError(sendError.message || 'Unable to send this email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout activePage="email" onNavigate={onNavigate}>
      <main className="mx-auto w-full max-w-370 flex-1 px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-ink-500">Choose a topic, review its message, and send.</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Email campaigns</h1></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-3 py-2 text-xs font-semibold text-ink-600"><ShieldCheck size={15} className="text-emerald-600" /> Admin only</span>
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
        {result && <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Email delivery complete: {result.sent} sent{result.failed ? `, ${result.failed} failed` : ''} to {result.recipientCount} {mode === 'BULK' ? 'unique email addresses' : 'matching accounts'}{mode === 'BULK' ? ` via ${result.senderProvider === 'HOSTINGER' ? 'Hostinger' : 'Gmail'}` : ''}.</p>}
        {Array.isArray(result?.skippedEmails) && result.skippedEmails.length > 0 && <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" aria-label="Skipped existing user addresses">
          <h2 className="font-semibold">Skipped existing Haango accounts ({result.skippedEmails.length})</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 break-all">{result.skippedEmails.map((skippedEmail) => <li key={skippedEmail}>{skippedEmail}</li>)}</ul>
        </section>}

        <div className="grid items-start gap-5 xl:grid-cols-3">

           <section className="overflow-hidden col-span-2 rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Email preview and recipient form">
            {!selectedTemplate ? <p className="p-6 text-sm text-ink-500">Select a topic to configure its recipients.</p> : <>
              <div className="border-b border-[#edf1f7] p-5"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700"><Mail size={15} /> Selected topic</div><h2 className="font-display text-xl font-bold text-ink-900">{selectedTemplate.title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-500">{selectedTemplate.angle}</p></div>
              <form onSubmit={sendCampaign} className="space-y-5 p-5">
                <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Send to</legend><div className="grid gap-2 sm:grid-cols-3">
                  {selectedTemplate.deliveryMode === 'broadcast' ? <button type="button" onClick={() => setRecipientMode('ALL')} className={`rounded-xl border p-3 text-left ${mode === 'ALL' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="flex items-center gap-2 text-sm font-semibold text-ink-900">All active {selectedTemplate.recipientRole === 'BUDDY' ? 'buddies' : 'customers'}</span></button> : <button type="button" onClick={() => setRecipientMode('MATCHED')} className={`rounded-xl border p-3 text-left ${mode === 'MATCHED' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Users size={16} />Trigger-matched accounts</span><span className="mt-1 block text-xs text-ink-500">{selectedTemplate.angle}</span></button>}
                  <button type="button" onClick={() => setRecipientMode('SINGLE')} className={`rounded-xl border p-3 text-left ${mode === 'SINGLE' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="block text-sm font-semibold text-ink-900">One email address</span></button>
                  <button type="button" onClick={() => setRecipientMode('BULK')} className={`rounded-xl border p-3 text-left ${mode === 'BULK' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="block text-sm font-semibold text-ink-900">Bulk email addresses</span></button>
                </div></fieldset>

                {mode === 'SINGLE' && <label className="block text-sm font-semibold text-ink-700">Recipient email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="input-field mt-1" /></label>}
                {mode === 'BULK' && <label className="block text-sm font-semibold text-ink-700">Sender provider<select value={senderProvider} onChange={(event) => setSenderProvider(event.target.value)} className="input-field mt-1"><option value="GMAIL">Gmail (official Haango sender)</option><option value="HOSTINGER">Hostinger (support mailbox)</option></select><span className="mt-1 block text-xs text-ink-500">The selected provider must be configured on the backend.</span></label>}
                {mode === 'BULK' && <label className="block text-sm font-semibold text-ink-700">Recipient emails<textarea rows={6} value={bulkEmailText} onChange={(event) => setBulkEmailText(event.target.value)} placeholder={'name@example.com\nanother@example.com'} aria-invalid={Boolean(bulkEmailText.trim() && bulkRecipients.error)} className="input-field mt-1 resize-y font-mono text-sm" /><span className={`mt-1 block text-xs ${bulkRecipients.error && bulkEmailText.trim() ? 'text-error-600' : 'text-ink-500'}`}>{bulkEmailText.trim() && bulkRecipients.error ? bulkRecipients.error : `${bulkRecipients.emails.length} unique valid address${bulkRecipients.emails.length === 1 ? '' : 'es'} (maximum 100). Existing Haango users are skipped.`}</span></label>}
                {selectedTemplate.variables?.includes('promoCode') && <label className="block text-sm font-semibold text-ink-700">Promo code<input required maxLength={30} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} className="input-field mt-1" /></label>}
                {selectedTemplate.variables?.includes('promoExpiry') && <label className="block text-sm font-semibold text-ink-700">Promo expiry date<input type="date" required min={new Date().toISOString().slice(0, 10)} value={promoExpiry} onChange={(event) => setPromoExpiry(event.target.value)} className="input-field mt-1" /></label>}
                {selectedTemplate.variables?.includes('creditAmount') && <label className="block text-sm font-semibold text-ink-700">Amount to add to the wallet (₹)<input type="number" required min="0" step="0.01" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className="input-field mt-1" /><span className="mt-1 block text-xs font-normal text-ink-500">This amount replaces the ₹100 shown in the draft and in the email sent.</span></label>}
                {selectedTemplate.variables?.includes('milestone') && <label className="block text-sm font-semibold text-ink-700">Booking milestone<select value={milestone} onChange={(event) => setMilestone(event.target.value)} className="input-field mt-1"><option value="5">5 completed bookings</option><option value="10">10 completed bookings</option><option value="18">18 completed bookings</option></select></label>}

                <section className="overflow-hidden rounded-xl border border-[#e8edf6]" aria-label="Selected email draft">
                  <div className="bg-[#f6f8fc] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Email draft preview</p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">Subject: {preview?.subject || selectedTemplate.subject}</p>
                  </div>
                  {previewLoading ? <p className="p-4 text-sm text-ink-500">Loading email draft…</p> : preview ? <>
                    <iframe title={`${selectedTemplate.title} email draft`} srcDoc={preview.html} sandbox="" className="h-[34rem] w-full bg-[#f6f8fc]" />
                    <details className="border-t border-[#e8edf6] p-4">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-600">View plain-text email</summary>
                      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-700">{preview.text}</pre>
                    </details>
                  </> : <p className="p-4 text-sm text-ink-500">Email draft preview is unavailable. Please try selecting this template again.</p>}
                </section>
                <button type="submit" disabled={sending || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />{sending ? 'Sending email...' : mode === 'SINGLE' ? 'Send email' : 'Send campaign'}</button>
              </form>
            </>}
          </section>

          <section className="space-y-5" aria-label="Email topics">
            {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-ink-500">Loading templates...</p> : Object.entries(templateGroups).map(([category, groupTemplates]) => <div key={category}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-500">{category}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupTemplates.map((template) => <button key={template.id} type="button" onClick={() => selectTemplate(template)} className={`rounded-xl border p-4 text-left transition ${selectedId === template.id ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-white bg-white shadow-[0_6px_20px_rgba(36,72,130,0.05)] hover:border-[#d8e3f4]'}`} aria-pressed={selectedId === template.id}>
                  <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#ff681f]"><Mail size={16} /></span>
                  <span className="block text-sm font-bold text-ink-900">{template.title}</span>
                  {/* <span className="mt-1 block text-xs leading-relaxed text-ink-500">{template.angle}</span> */}
                </button>)}
              </div>
            </div>)}
          </section>


        </div>
      </main>
    </AdminLayout>
  );
}
