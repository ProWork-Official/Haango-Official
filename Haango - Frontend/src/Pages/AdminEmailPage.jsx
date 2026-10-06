import { useEffect, useMemo, useState } from 'react';
import { Mail, Send, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const defaultRecipientMode = (template) => template?.deliveryMode === 'triggered' ? 'MATCHED' : 'ALL';

export default function AdminEmailPage({ onNavigate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [recipientMode, setRecipientMode] = useState('');
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('WELCOME100');
  const [promoExpiry, setPromoExpiry] = useState('');
  const [milestone, setMilestone] = useState('10');
  const [loading, setLoading] = useState(true);
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
    if (mode !== 'SINGLE' && !window.confirm(`Send “${selectedTemplate.title}” to ${mode === 'ALL' ? `all active ${selectedTemplate.recipientRole === 'BUDDY' ? 'buddies' : 'customers'}` : 'all accounts matching this trigger'}?`)) return;

    setSending(true);
    setError('');
    setResult(null);
    try {
      const response = await apiRequest('/admin/email-campaigns/send', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          recipientMode: mode,
          email: mode === 'SINGLE' ? email.trim() : undefined,
          promoCode: selectedTemplate.variables?.includes('promoCode') ? promoCode : undefined,
          promoExpiry: selectedTemplate.variables?.includes('promoExpiry') ? promoExpiry : undefined,
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
        {result && <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Email delivery complete: {result.sent} sent{result.failed ? `, ${result.failed} failed` : ''} from {result.recipientCount} matching accounts.</p>}

        <div className="grid items-start gap-5 xl:grid-cols-[1fr_0.9fr]">
          <section className="space-y-5" aria-label="Email topics">
            {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-ink-500">Loading templates...</p> : Object.entries(templateGroups).map(([category, groupTemplates]) => <div key={category}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-500">{category}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupTemplates.map((template) => <button key={template.id} type="button" onClick={() => selectTemplate(template)} className={`rounded-xl border p-4 text-left transition ${selectedId === template.id ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-white bg-white shadow-[0_6px_20px_rgba(36,72,130,0.05)] hover:border-[#d8e3f4]'}`} aria-pressed={selectedId === template.id}>
                  <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-[#ff681f]"><Mail size={16} /></span>
                  <span className="block text-sm font-bold text-ink-900">{template.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">{template.angle}</span>
                </button>)}
              </div>
            </div>)}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Email preview and recipient form">
            {!selectedTemplate ? <p className="p-6 text-sm text-ink-500">Select a topic to configure its recipients.</p> : <>
              <div className="border-b border-[#edf1f7] p-5"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700"><Mail size={15} /> Selected topic</div><h2 className="font-display text-xl font-bold text-ink-900">{selectedTemplate.title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-500">{selectedTemplate.angle}</p></div>
              <form onSubmit={sendCampaign} className="space-y-5 p-5">
                <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Send to</legend><div className="grid gap-2 sm:grid-cols-2">
                  {selectedTemplate.deliveryMode === 'broadcast' ? <button type="button" onClick={() => setRecipientMode('ALL')} className={`rounded-xl border p-3 text-left ${mode === 'ALL' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Users size={16} />All active {selectedTemplate.recipientRole === 'BUDDY' ? 'buddies' : 'customers'}</span><span className="mt-1 block text-xs text-ink-500">Send to this platform audience.</span></button> : <button type="button" onClick={() => setRecipientMode('MATCHED')} className={`rounded-xl border p-3 text-left ${mode === 'MATCHED' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Users size={16} />Trigger-matched accounts</span><span className="mt-1 block text-xs text-ink-500">{selectedTemplate.angle}</span></button>}
                  <button type="button" onClick={() => setRecipientMode('SINGLE')} className={`rounded-xl border p-3 text-left ${mode === 'SINGLE' ? 'border-blue-300 bg-blue-50' : 'border-[#e8edf6] bg-white'}`}><span className="block text-sm font-semibold text-ink-900">One email address</span><span className="mt-1 block text-xs text-ink-500">Manual send; trigger matching is only used for the matched audience.</span></button>
                </div></fieldset>

                {mode === 'SINGLE' && <label className="block text-sm font-semibold text-ink-700">Recipient email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="input-field mt-1" /></label>}
                {selectedTemplate.variables?.includes('promoCode') && <label className="block text-sm font-semibold text-ink-700">Promo code<input required maxLength={30} value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} className="input-field mt-1" /></label>}
                {selectedTemplate.variables?.includes('promoExpiry') && <label className="block text-sm font-semibold text-ink-700">Promo expiry date<input type="date" required min={new Date().toISOString().slice(0, 10)} value={promoExpiry} onChange={(event) => setPromoExpiry(event.target.value)} className="input-field mt-1" /></label>}
                {selectedTemplate.variables?.includes('milestone') && <label className="block text-sm font-semibold text-ink-700">Booking milestone<select value={milestone} onChange={(event) => setMilestone(event.target.value)} className="input-field mt-1"><option value="5">5 completed bookings</option><option value="10">10 completed bookings</option><option value="18">18 completed bookings</option></select></label>}

                <div className="rounded-xl bg-[#f6f8fc] p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Subject preview</p><p className="mt-1 text-sm font-semibold text-ink-900">{selectedTemplate.id === 'buddy_milestone' ? `🔥 You just hit ${milestone} completed bookings! Keep it up.` : selectedTemplate.subject}</p><p className="mt-3 text-xs text-ink-600">Call to action: <span className="font-semibold">{selectedTemplate.ctaLabel}</span></p></div>
                <button type="submit" disabled={sending || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />{sending ? 'Sending email...' : mode === 'SINGLE' ? 'Send email' : 'Send campaign'}</button>
              </form>
            </>}
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}