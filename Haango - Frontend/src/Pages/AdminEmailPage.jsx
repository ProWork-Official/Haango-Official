import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Send, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';
import { parseBulkEmailRecipients } from '../lib/emailRecipients';

const defaultRecipientMode = (template) => template?.deliveryMode === 'triggered' ? 'MATCHED' : 'ALL';

function campaignHistoryQuery(dateFilter, page) {
  const query = new URLSearchParams({ page: String(page), limit: '25', date: dateFilter });
  if (dateFilter !== 'ALL') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (dateFilter === 'YESTERDAY') start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query.set('from', start.toISOString());
    query.set('to', end.toISOString());
  }
  return query.toString();
}

export default function AdminEmailPage({ onNavigate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [recipientMode, setRecipientMode] = useState('');
  const [senderEmail, setSenderEmail] = useState('haangoofficial@gmail.com');
  const [email, setEmail] = useState('');
  const [bulkEmailText, setBulkEmailText] = useState('');
  const [emailLists, setEmailLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [bulkSource, setBulkSource] = useState('MANUAL');
  const [listName, setListName] = useState('');
  const [listInput, setListInput] = useState('');
  const [editingListId, setEditingListId] = useState('');
  const [listSkipped, setListSkipped] = useState([]);
  const [listError, setListError] = useState('');
  const [listAudit, setListAudit] = useState([]);
  const [promoCode, setPromoCode] = useState('WELCOME100');
  const [promoExpiry, setPromoExpiry] = useState('');
  const [creditAmount, setCreditAmount] = useState('100');
  const [milestone, setMilestone] = useState('10');
  const [loading, setLoading] = useState(true);
  const [previewState, setPreviewState] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [unsubscribes, setUnsubscribes] = useState([]);
  const [unsubscribesLoading, setUnsubscribesLoading] = useState(true);
  const [unsubscribesError, setUnsubscribesError] = useState('');
  const [unsubscribePage, setUnsubscribePage] = useState(1);
  const [unsubscribePagination, setUnsubscribePagination] = useState(null);
  const [campaignHistory, setCampaignHistory] = useState([]);
  const [campaignHistoryLoading, setCampaignHistoryLoading] = useState(true);
  const [campaignHistoryError, setCampaignHistoryError] = useState('');
  const [campaignHistoryDate, setCampaignHistoryDate] = useState('TODAY');
  const [campaignHistoryPage, setCampaignHistoryPage] = useState(1);
  const [campaignHistoryPagination, setCampaignHistoryPagination] = useState(null);

  const loadUnsubscribes = useCallback((page = 1) => {
    setUnsubscribesLoading(true);
    setUnsubscribesError('');
    apiRequest(`/admin/email-campaigns/unsubscribes?page=${page}&limit=100`, { includeMetadata: true })
      .then((response) => {
        setUnsubscribes(Array.isArray(response?.data) ? response.data : []);
        setUnsubscribePagination(response?.pagination || null);
        setUnsubscribePage(page);
      })
      .catch((loadError) => setUnsubscribesError(loadError.message || 'Unable to load opted-out addresses.'))
      .finally(() => setUnsubscribesLoading(false));
  }, []);

  const loadEmailLists = useCallback(() => {
    apiRequest('/admin/email-campaigns/lists')
      .then((lists) => setEmailLists(Array.isArray(lists) ? lists : []))
      .catch((loadError) => setListError(loadError.message || 'Unable to load saved lists.'));
  }, []);

  const loadCampaignHistory = useCallback((page = 1, date = campaignHistoryDate) => {
    setCampaignHistoryLoading(true);
    setCampaignHistoryError('');
    apiRequest(`/admin/email-campaigns/history?${campaignHistoryQuery(date, page)}`, { includeMetadata: true })
      .then((response) => {
        setCampaignHistory(Array.isArray(response?.data) ? response.data : []);
        setCampaignHistoryPagination(response?.pagination || null);
        setCampaignHistoryPage(page);
      })
      .catch((loadError) => setCampaignHistoryError(loadError.message || 'Unable to load campaign history.'))
      .finally(() => setCampaignHistoryLoading(false));
  }, [campaignHistoryDate]);

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

  useEffect(() => {
    loadEmailLists();
    apiRequest('/admin/email-campaigns/lists/signup-audit?page=1&limit=100', { includeMetadata: true })
      .then((response) => setListAudit(Array.isArray(response?.data) ? response.data : []))
      .catch((loadError) => setListError(loadError.message || 'Unable to load signup history.'));
  }, [loadEmailLists]);

  useEffect(() => {
    let active = true;
    apiRequest(`/admin/email-campaigns/history?${campaignHistoryQuery(campaignHistoryDate, 1)}`, { includeMetadata: true })
      .then((response) => {
        if (!active) return;
        setCampaignHistory(Array.isArray(response?.data) ? response.data : []);
        setCampaignHistoryPagination(response?.pagination || null);
        setCampaignHistoryPage(1);
      })
      .catch((loadError) => {
        if (active) setCampaignHistoryError(loadError.message || 'Unable to load campaign history.');
      })
      .finally(() => {
        if (active) setCampaignHistoryLoading(false);
      });
    return () => { active = false; };
  }, [campaignHistoryDate]);

  useEffect(() => {
    let active = true;
    apiRequest('/admin/email-campaigns/unsubscribes?page=1&limit=100', { includeMetadata: true })
      .then((response) => {
        if (!active) return;
        setUnsubscribes(Array.isArray(response?.data) ? response.data : []);
        setUnsubscribePagination(response?.pagination || null);
        setUnsubscribePage(1);
      })
      .catch((loadError) => {
        if (active) setUnsubscribesError(loadError.message || 'Unable to load opted-out addresses.');
      })
      .finally(() => {
        if (active) setUnsubscribesLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selectedTemplate = templates.find((template) => template.id === selectedId);
  const mode = recipientMode || defaultRecipientMode(selectedTemplate);
  const bulkRecipients = parseBulkEmailRecipients(bulkEmailText);
  const listRecipients = parseBulkEmailRecipients(listInput);
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
      if (bulkSource === 'SAVED' && selectedListId) {
        // A saved list has already been validated by the backend.
      } else {
        setError(bulkRecipients.error);
        return;
      }
    }
    if (mode === 'BULK' && bulkSource === 'SAVED' && !selectedListId) {
      setError('Select a saved email list.');
      return;
    }
    const bulkCount = bulkSource === 'SAVED'
      ? (emailLists.find((item) => item._id === selectedListId)?.emails?.length || 0)
      : bulkRecipients.emails.length;
    const confirmation = mode === 'BULK'
      ? `Send “${selectedTemplate.title}” from ${senderEmail} to up to ${bulkCount} unique Gmail addresses? Existing Haango accounts and opted-out addresses will be skipped.`
      : `Send “${selectedTemplate.title}” from ${senderEmail} to ${mode === 'ALL' ? `all active ${selectedTemplate.recipientRole === 'BUDDY' ? 'buddies' : 'customers'}` : mode === 'SINGLE' ? email.trim() : 'all accounts matching this trigger'}? Opted-out addresses will be skipped.`;
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
          senderEmail,
          email: mode === 'SINGLE' ? email.trim() : undefined,
          recipientEmails: mode === 'BULK' && bulkSource === 'MANUAL' ? bulkEmailText : undefined,
          recipientListId: mode === 'BULK' && bulkSource === 'SAVED' ? selectedListId : undefined,
          promoCode: selectedTemplate.variables?.includes('promoCode') ? promoCode : undefined,
          promoExpiry: selectedTemplate.variables?.includes('promoExpiry') ? promoExpiry : undefined,
          creditAmount: selectedTemplate.variables?.includes('creditAmount') ? Number(creditAmount) : undefined,
          milestone: selectedTemplate.variables?.includes('milestone') ? Number(milestone) : undefined,
        }),
      });
      setResult(response?.data || response);
      loadCampaignHistory(1);
    } catch (sendError) {
      setError(sendError.message || 'Unable to send this email.');
      loadCampaignHistory(1);
    } finally {
      setSending(false);
    }
  };

  const saveEmailList = async (event) => {
    event.preventDefault();
    setListError('');
    setListSkipped([]);
    try {
      const saved = await apiRequest(
        editingListId ? `/admin/email-campaigns/lists/${editingListId}` : '/admin/email-campaigns/lists',
        {
          method: editingListId ? 'PATCH' : 'POST',
          body: JSON.stringify({ emails: listInput, name: listName }),
        },
      );
      if (saved?.skipped) setListSkipped(saved.skipped);
      if (saved?.list?._id) setSelectedListId(saved.list._id);
      setListInput('');
      setListName('');
      setEditingListId('');
      loadEmailLists();
    } catch (saveError) {
      setListError(saveError.message || 'Unable to save this list.');
    }
  };

  const removeEmailList = async (listId) => {
    if (!window.confirm('Delete this saved email list?')) return;
    try {
      await apiRequest(`/admin/email-campaigns/lists/${listId}`, { method: 'DELETE' });
      if (selectedListId === listId) setSelectedListId('');
      if (editingListId === listId) {
        setEditingListId('');
        setListInput('');
        setListName('');
      }
      loadEmailLists();
    } catch (deleteError) {
      setListError(deleteError.message || 'Unable to delete this list.');
    }
  };

  const loadListFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setListInput(await file.text());
    event.target.value = '';
  };

  return (
    <AdminLayout activePage="email" onNavigate={onNavigate}>
      <main className="mx-auto w-full max-w-370 flex-1 px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-ink-500">Choose a topic, review its message, and send.</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Email campaigns</h1></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-3 py-2 text-xs font-semibold text-ink-600"><ShieldCheck size={15} className="text-emerald-600" /> Admin only</span>
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
        {result && <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Email delivery complete: {result.sent} sent{result.failed ? `, ${result.failed} failed` : ''} from {result.senderEmail || senderEmail} to {result.recipientCount} {mode === 'BULK' ? 'unique email addresses' : 'matching accounts'}.</p>}
        {Array.isArray(result?.skippedEmails) && result.skippedEmails.length > 0 && <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" aria-label="Skipped existing user addresses">
          <h2 className="font-semibold">Skipped existing Haango accounts ({result.skippedEmails.length})</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 break-all">{result.skippedEmails.map((skippedEmail) => <li key={skippedEmail}>{skippedEmail}</li>)}</ul>
        </section>}
        {Array.isArray(result?.skippedInvalidEmails) && result.skippedInvalidEmails.length > 0 && <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" aria-label="Skipped invalid addresses">
          <h2 className="font-semibold">Skipped invalid or non-Gmail addresses ({result.skippedInvalidEmails.length})</h2>
          <ul className="mt-2 space-y-1 break-all">{result.skippedInvalidEmails.map((entry, index) => <li key={`${entry.value}-${index}`}>{entry.value || '(empty entry)'} — {entry.reason}</li>)}</ul>
        </section>}
        {Array.isArray(result?.optedOutEmails) && result.optedOutEmails.length > 0 && <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" aria-label="Skipped opted-out addresses">
          <h2 className="font-semibold">Skipped opted-out addresses ({result.optedOutEmails.length})</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 break-all">{result.optedOutEmails.map((skippedEmail) => <li key={skippedEmail}>{skippedEmail}</li>)}</ul>
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
                <label className="block text-sm font-semibold text-ink-700">Sender address<select value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} className="input-field mt-1"><option value="haangoofficial@gmail.com">haangoofficial@gmail.com (Gmail)</option><option value="support@haango.in">support@haango.in (Hostinger)</option></select><span className="mt-1 block text-xs text-ink-500">The chosen mailbox must be configured on the backend.</span></label>
                {mode === 'BULK' && <div className="space-y-3">
                  <label className="block text-sm font-semibold text-ink-700">Bulk recipient source<select value={bulkSource} onChange={(event) => setBulkSource(event.target.value)} className="input-field mt-1"><option value="MANUAL">Paste addresses</option><option value="SAVED">Saved list</option></select></label>
                  {bulkSource === 'SAVED'
                    ? <label className="block text-sm font-semibold text-ink-700">Saved recipient list<select value={selectedListId} onChange={(event) => setSelectedListId(event.target.value)} className="input-field mt-1"><option value="">Select a list</option>{emailLists.map((list) => <option key={list._id} value={list._id}>{list.name} ({list.emails?.length || 0} addresses)</option>)}</select><span className="mt-1 block text-xs text-ink-500">Addresses are rechecked for registered accounts and opt-outs before sending.</span></label>
                    : <><label className="block text-sm font-semibold text-ink-700">Recipient emails<textarea rows={6} value={bulkEmailText} onChange={(event) => setBulkEmailText(event.target.value)} placeholder={'name@gmail.com\nanother@gmail.com'} className="input-field mt-1 resize-y font-mono text-sm" /><span className="mt-1 block text-xs text-ink-500">{bulkRecipients.emails.length} accepted Gmail address{bulkRecipients.emails.length === 1 ? '' : 'es'} (maximum 100). Existing Haango users and opted-out addresses are skipped.</span></label>
                      {bulkRecipients.skipped.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Ignored invalid or non-Gmail entries</p><ul className="mt-1 space-y-1 break-all">{bulkRecipients.skipped.map((entry, index) => <li key={`${entry.value}-${index}`}>{entry.value} — {entry.reason}</li>)}</ul></div>}
                      {bulkRecipients.error && bulkEmailText.trim() && <p className="text-xs text-error-600">{bulkRecipients.error}</p>}
                    </>}
                </div>}
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
        <section className="mt-6 rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Saved-list campaign send history">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">Saved-list campaign history</h2>
              <p className="mt-1 text-sm text-ink-500">One entry per saved-list campaign attempt, including partial and failed delivery.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="campaign-history-date" className="sr-only">Campaign history date filter</label>
              <select id="campaign-history-date" value={campaignHistoryDate} onChange={(event) => { setCampaignHistoryLoading(true); setCampaignHistoryError(''); setCampaignHistoryDate(event.target.value); }} className="input-field py-2">
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="ALL">All</option>
              </select>
              <button type="button" onClick={() => loadCampaignHistory(campaignHistoryPage)} disabled={campaignHistoryLoading} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] px-3 py-2 text-sm font-semibold text-ink-700 disabled:opacity-50"><RefreshCw size={15} />Refresh</button>
            </div>
          </div>
          {campaignHistoryError && <p className="mt-3 text-sm text-error-600" role="alert">{campaignHistoryError}</p>}
          {campaignHistoryLoading ? <p className="mt-4 text-sm text-ink-500">Loading campaign history…</p>
            : campaignHistory.length === 0 ? <p className="mt-4 text-sm text-ink-500">No saved-list campaigns for this period.</p>
              : <>
                <div className="mt-4 space-y-2">
                  {campaignHistory.map((entry) => <article key={entry._id} className="grid gap-2 rounded-lg bg-[#f6f8fc] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-semibold text-ink-900">List {entry.listNumber} · {entry.listName} <span className="font-normal text-ink-500">— {entry.templateTitle}</span></p>
                      <p className="mt-1 text-xs text-ink-600">{entry.sent} sent · {entry.failed} failed · {entry.skipped} skipped of {entry.totalRecipients} · {entry.senderEmail}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-semibold text-ink-700">{entry.status}</span>
                      <time className="mt-1 block text-xs text-ink-500" dateTime={entry.attemptedAt}>{new Date(entry.attemptedAt).toLocaleString()}</time>
                    </div>
                  </article>)}
                </div>
                {campaignHistoryPagination?.totalPages > 1 && <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Page {campaignHistoryPagination.page} of {campaignHistoryPagination.totalPages} · {campaignHistoryPagination.total} campaigns</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => loadCampaignHistory(campaignHistoryPage - 1)} disabled={campaignHistoryLoading || campaignHistoryPage <= 1} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
                    <button type="button" onClick={() => loadCampaignHistory(campaignHistoryPage + 1)} disabled={campaignHistoryLoading || campaignHistoryPage >= campaignHistoryPagination.totalPages} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
                  </div>
                </div>}
              </>}
        </section>
        <section className="mt-6 rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Opted-out email addresses">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-lg font-bold text-ink-900">Email opt-outs</h2><p className="mt-1 text-sm text-ink-500">These addresses are excluded from email campaigns.</p></div>
            <button type="button" onClick={() => loadUnsubscribes(unsubscribePage)} disabled={unsubscribesLoading} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] px-3 py-2 text-sm font-semibold text-ink-700 disabled:opacity-50"><RefreshCw size={15} />Refresh</button>
          </div>
          {unsubscribesError && <p className="mt-3 text-sm text-error-600" role="alert">{unsubscribesError}</p>}
          {unsubscribesLoading ? <p className="mt-3 text-sm text-ink-500">Loading opted-out addresses…</p>
            : unsubscribes.length === 0 ? <p className="mt-3 text-sm text-ink-500">No opted-out email addresses.</p>
              : <><ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{unsubscribes.map((entry) => <li key={entry.email} className="rounded-lg bg-[#f6f8fc] p-3 text-sm">
                <span className="block break-all font-medium text-ink-800">{entry.email}</span>
                {entry.optedOutAt && <time className="mt-1 block text-xs text-ink-500" dateTime={entry.optedOutAt}>Opted out {new Date(entry.optedOutAt).toLocaleDateString()}</time>}
              </li>)}</ul>
                {unsubscribePagination?.totalPages > 1 && <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Page {unsubscribePagination.page} of {unsubscribePagination.totalPages} · {unsubscribePagination.total} addresses</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => loadUnsubscribes(unsubscribePage - 1)} disabled={unsubscribesLoading || unsubscribePage <= 1} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
                    <button type="button" onClick={() => loadUnsubscribes(unsubscribePage + 1)} disabled={unsubscribesLoading || unsubscribePage >= unsubscribePagination.totalPages} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
                  </div>
                </div>}
              </>}
        </section>
        <section className="mt-6 grid gap-5 xl:grid-cols-2" aria-label="Saved Gmail recipient lists">
          <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]">
            <h2 className="font-display text-lg font-bold text-ink-900">Manage Gmail lists</h2>
            <p className="mt-1 text-sm text-ink-500">Paste addresses or upload a CSV/TXT file. Invalid and non-Gmail entries are ignored; each saved list holds up to 100 unique addresses.</p>
            {listError && <p className="mt-3 text-sm text-error-600" role="alert">{listError}</p>}
            <form onSubmit={saveEmailList} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-ink-700">
                List name
                <input
                  type="text"
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                  maxLength={40}
                  placeholder="Optional (defaults to List number)"
                  className="input-field mt-1"
                  aria-label="Email list name"
                />
                <span className="mt-1 block text-xs font-normal text-ink-500">Up to 40 characters. Leave blank to use the default list name.</span>
              </label>
              <textarea rows={5} value={listInput} onChange={(event) => setListInput(event.target.value)} placeholder={'name@gmail.com, another@gmail.com'} className="input-field resize-y font-mono text-sm" aria-label="Email addresses for list" />
              <p className="text-xs text-ink-500" aria-live="polite">
                {listRecipients.rawCount} pasted address{listRecipients.rawCount === 1 ? '' : 'es'} · {listRecipients.emails.length} accepted unique Gmail address{listRecipients.emails.length === 1 ? '' : 'es'} · {listRecipients.skipped.length} skipped (invalid or non-Gmail). Maximum 100 accepted addresses.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-full border border-[#e4ebf7] px-4 py-2 text-sm font-semibold text-ink-700">Upload CSV/TXT<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={loadListFile} className="sr-only" /></label>
                <button type="submit" disabled={!listInput.trim()} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{editingListId ? 'Save list changes' : 'Create numbered list'}</button>
                {editingListId && <button type="button" onClick={() => { setEditingListId(''); setListInput(''); setListName(''); setListSkipped([]); }} className="rounded-full border px-4 py-2 text-sm font-semibold">Cancel edit</button>}
              </div>
            </form>
            {listSkipped.length > 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="font-semibold">Ignored entries</p><ul className="mt-1 space-y-1 break-all">{listSkipped.map((entry, index) => <li key={`${entry.value}-${index}`}>{entry.value} — {entry.reason}</li>)}</ul></div>}
            <div className="mt-5 space-y-2">
              {emailLists.length === 0 ? <p className="text-sm text-ink-500">No saved lists yet.</p> : emailLists.map((list) => <div key={list._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f6f8fc] p-3">
                <button type="button" onClick={() => setSelectedListId(list._id)} className="text-left" aria-pressed={selectedListId === list._id}>
                  <span className="block font-semibold text-ink-900">{list.name}</span><span className="text-xs text-ink-500">{list.emails?.length || 0} / 100 Gmail addresses</span>
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditingListId(list._id); setListName(list.name || ''); setListInput((list.emails || []).join('\n')); setListSkipped([]); }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Edit</button>
                  <button type="button" onClick={() => removeEmailList(list._id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button>
                </div>
              </div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(36,72,130,0.06)]">
            <h2 className="font-display text-lg font-bold text-ink-900">List signup history</h2>
            <p className="mt-1 text-sm text-ink-500">Addresses are removed from all lists at signup; these audit records are retained separately.</p>
            {listAudit.length === 0 ? <p className="mt-4 text-sm text-ink-500">No list signups recorded.</p> : <ul className="mt-4 space-y-2">{listAudit.map((entry) => <li key={entry._id} className="rounded-lg bg-[#f6f8fc] p-3 text-sm text-ink-800">{entry.message}<time className="mt-1 block text-xs text-ink-500" dateTime={entry.signedInAt}>{new Date(entry.signedInAt).toLocaleString()}</time></li>)}</ul>}
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}
