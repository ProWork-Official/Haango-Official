import InfoPage from './InfoPage';

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { apiRequest } from '../lib/api';

export default function ContactPage({ onNavigate }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: '', userType: 'USER', problemDescription: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return;
    apiRequest('/support-requests/me')
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]));
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMessage('');

    try {
      await apiRequest('/support-requests', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const successMessage = 'We appreciate your patience. Our support team will reply within 24-48 hours.';
      window.alert(successMessage);
      setMessage(successMessage);
      setForm({ fullName: '', userType: 'USER', problemDescription: '' });
      const updated = await apiRequest('/support-requests/me');
      setRequests(Array.isArray(updated) ? updated : []);
    } catch (error) {
      const errorMessage = error.message || 'Unable to submit support request.';
      window.alert(errorMessage);
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-max section-pad py-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6 md:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-coral-600">Contact</p>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">We are here to help.</h1>
          <p className="mt-3 text-base text-ink-600">Have a question, partnership idea, or feedback about Haango? Our team would love to hear from you.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <h2 className="font-display text-lg font-bold text-ink-900">Customer support</h2>
              <p className="mt-2 text-sm text-ink-600">For booking, payment, account, or safety questions, contact our support team at support@haango.in. Please include your registered email and booking ID when relevant.</p>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
              <h2 className="font-display text-lg font-bold text-ink-900">Partnerships</h2>
              <p className="mt-2 text-sm text-ink-600">For business, community, or city partnership enquiries, write to support@haango.in and tell us how you would like to work together.</p>
            </div>
          </div>
        </div>

        <div className="card p-6 md:p-8">
          <h2 className="font-display text-2xl font-bold text-ink-900">Support request form</h2>
          <p className="mt-2 text-sm text-ink-600">Share your issue and our team will get back to you within 24-48 hours.</p>

          {!user ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Login to submit a support request.</div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-ink-700">
                Full Name
                <input className="input-field mt-1 w-full" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
              </label>

              <label className="block text-sm font-medium text-ink-700">
                User Type
                <select className="input-field mt-1 w-full" value={form.userType} onChange={(event) => setForm({ ...form, userType: event.target.value })}>
                  <option value="USER">User</option>
                  <option value="BUDDY">Buddy</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-ink-700">
                Problem Description
                <textarea className="input-field mt-1 min-h-32 w-full" value={form.problemDescription} onChange={(event) => setForm({ ...form, problemDescription: event.target.value })} required />
              </label>

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>

              {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
            </form>
          )}
        </div>
      </div>

      <div className="mt-8 card p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900">Your support requests</h2>
            <p className="text-sm text-ink-600">Your form stays in review until our team marks it resolved.</p>
          </div>
        </div>

        {!user ? (
          <p className="text-sm text-ink-500">Login to view your support request history.</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-ink-500">No support requests yet.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{request.fullName}</p>
                    <p className="text-xs text-ink-500">{request.userType} · Submitted {new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {request.status === 'RESOLVED' ? 'Resolved' : 'In review'}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{request.problemDescription}</p>
                {request.adminReply && (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-ink-700">
                    <p className="font-semibold text-ink-900">Support reply</p>
                    <p className="mt-1 whitespace-pre-line">{request.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
