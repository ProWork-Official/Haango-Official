import { useState } from 'react';
import { ContactRound, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { apiRequest } from '../lib/api';

const dismissedKey = 'haango_contact_prompt_dismissed';
const completedKey = 'haango_contact_prompt_completed';
const sessionIdKey = 'haango_contact_session_id';
const maximumContacts = 1000;

function getSessionId() {
  let sessionId = sessionStorage.getItem(sessionIdKey);
  if (!sessionId) {
    sessionId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(sessionIdKey, sessionId);
  }
  return sessionId;
}

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : '';
}

export default function HomeContactConsent() {
  const [open, setOpen] = useState(() => (
    typeof window !== 'undefined'
    && !sessionStorage.getItem(dismissedKey)
    && !localStorage.getItem(completedKey)
  ));
  const [contacts, setContacts] = useState([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerSupported] = useState(() => (
    typeof window !== 'undefined'
    && Boolean(window.isSecureContext && navigator.contacts?.select)
  ));

  const chooseContacts = async () => {
    if (!pickerSupported || loading) return;
    setLoading(true);
    setError('');
    try {
      const selected = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (selected.length > maximumContacts) {
        setContacts([]);
        setConsentConfirmed(false);
        setError(`A maximum of ${maximumContacts} contacts can be submitted at once. Please select a smaller group.`);
        return;
      }
      const validContacts = selected.slice(0, maximumContacts).map((contact, index) => ({
        name: String(contact.name?.[0] || `Contact ${index + 1}`).trim().slice(0, 100),
        phone: normalizePhone(contact.tel?.[0]),
      })).filter((contact) => contact.phone);
      setContacts(validContacts);
      setConsentConfirmed(false);
      if (validContacts.length < selected.length) {
        setError('Contacts without valid phone numbers were not included.');
      }
    } catch (pickerError) {
      if (['AbortError', 'NotAllowedError'].includes(pickerError?.name)) {
        await recordDecline();
      } else {
        setError('Unable to open contacts. Check your browser permissions and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const recordDecline = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest('/contact-submissions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'declined',
          consentConfirmed: false,
          sessionId: getSessionId(),
          contacts: [],
        }),
      });
      sessionStorage.setItem(dismissedKey, 'true');
      setOpen(false);
    } catch (declineError) {
      setError(declineError.message || 'Unable to record your choice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitContacts = async () => {
    if (!consentConfirmed || !contacts.length || loading) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest('/contact-submissions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'shared',
          consentConfirmed,
          sessionId: getSessionId(),
          contacts,
        }),
      });
      localStorage.setItem(completedKey, 'true');
      setOpen(false);
    } catch (submitError) {
      setError(submitError.message || 'Unable to share your selected contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-ink-900/55 p-4" role="presentation">
      <section className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="contact-consent-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ContactRound size={22} /></div>
          <button type="button" onClick={recordDecline} disabled={loading} className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 disabled:opacity-50" aria-label="Not now"><X size={18} /></button>
        </div>
        <h2 id="contact-consent-title" className="mt-4 font-display text-xl font-bold text-ink-900">Share contacts with Haango?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">If you choose to continue, your browser will let you select multiple contacts (up to {maximumContacts} per submission). Haango will receive only the names and phone numbers you select and submit. We cannot automatically access or display your entire address book; you control what the picker shares.</p>
        <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>Contact selection is optional. If you choose “Not now,” we record that choice with the time and an approximate region inferred from your IP address, linked only to a random session ID. We do not record your account identity or GPS location for a declined choice. The prompt may appear again in a new browser session.</p>
        </div>

        {!pickerSupported && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">This browser does not support the secure contact picker. You can continue using Haango normally; contact access is unavailable here.</p>}
        {error && <p className="mt-4 rounded-lg bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}

        {pickerSupported && <div className="mt-5">
          <button type="button" onClick={chooseContacts} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60">
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : <ContactRound size={16} />}
            {contacts.length ? 'Choose again' : 'Choose multiple contacts'}
          </button>
          {contacts.length > 0 && <div className="mt-4 rounded-xl border border-[#e8edf6] p-3">
            <p className="text-sm font-bold text-ink-800">{contacts.length} selected</p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-ink-600">
              {contacts.map((contact, index) => <li key={`${contact.phone}-${index}`}>{contact.name} · {contact.phone}</li>)}
            </ul>
          </div>}
          {contacts.length > 0 && <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-700">
            <input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-700" />
            <span>I agree to send the selected contact names and phone numbers to Haango for follow-up.</span>
          </label>}
        </div>}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={recordDecline} disabled={loading} className="rounded-full border border-[#e4ebf7] px-4 py-2.5 text-sm font-bold text-ink-600 hover:bg-[#f7f9fd] disabled:opacity-50">{loading ? 'Saving…' : 'Not now'}</button>
          {contacts.length > 0 && <button type="button" onClick={submitContacts} disabled={!consentConfirmed || loading} className="rounded-full bg-[#ff681f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e95718] disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Sharing…' : 'Share selected contacts'}
          </button>}
        </div>
      </section>
    </div>
  );
}
