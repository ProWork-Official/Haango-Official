import { useState } from 'react';
import { apiRequest } from '../lib/api';

export default function UnsubscribePage() {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token') || '';
  const [status, setStatus] = useState('ready');

  const unsubscribe = async () => {
    if (!token || status === 'submitting') return;
    setStatus('submitting');
    try {
      await apiRequest('/email/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f6f8fb] px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-[#e8edf3] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Email preferences</h1>
        {status === 'success' ? <p className="mt-4 text-sm leading-relaxed text-ink-600" role="status">You have been unsubscribed from Haango campaign emails. We’ll honor this choice for future campaigns.</p>
          : status === 'error' ? <p className="mt-4 text-sm leading-relaxed text-error-600" role="alert">We couldn’t process this link. Please contact <a className="underline" href="mailto:support@haango.in">support@haango.in</a> for help.</p>
            : !token ? <p className="mt-4 text-sm leading-relaxed text-ink-600">This unsubscribe link is incomplete. Please contact <a className="underline" href="mailto:support@haango.in">support@haango.in</a> for help.</p>
              : <>
                <p className="mt-4 text-sm leading-relaxed text-ink-600">Confirm that you want to stop receiving Haango campaign emails.</p>
                <button type="button" onClick={unsubscribe} disabled={status === 'submitting'} className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {status === 'submitting' ? 'Saving your preference…' : 'Unsubscribe'}
                </button>
              </>}
      </section>
    </main>
  );
}
