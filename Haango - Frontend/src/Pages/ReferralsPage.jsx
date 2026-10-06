import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Copy, Gift, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';

const unwrap = (value) => value?.data ?? value ?? {};
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

function statusLabel(status) {
  if (status === 'CLAIMED') return 'Reward claimed';
  if (status === 'ELIGIBLE_TO_CLAIM') return 'Booking complete · reward ready';
  return 'Signed up · booking pending';
}

export default function ReferralsPage({ onNavigate }) {
  const [referralData, setReferralData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [claimingId, setClaimingId] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/profile/referrals/me')
      .then((response) => { if (active) setReferralData(unwrap(response)); })
      .catch((loadError) => { if (active) setError(loadError.message || 'Unable to load your referrals.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const copyCode = async () => {
    if (!referralData?.referralCode) return;
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Unable to copy the referral code in this browser.');
    }
  };

  const claimReward = async (referral) => {
    setClaimingId(referral.id);
    setError('');
    try {
      const result = unwrap(await apiRequest(`/profile/referrals/${referral.id}/claim`, { method: 'POST' }));
      setWalletBalance(result.walletBalance);
      setReferralData((current) => ({
        ...current,
        referrals: current.referrals.map((item) => item.id === referral.id
          ? { ...item, progress: 'CLAIMED', canClaim: false, claimedAt: new Date().toISOString() }
          : item),
      }));
    } catch (claimError) {
      setError(claimError.message || 'Unable to claim this referral reward.');
    } finally {
      setClaimingId('');
    }
  };

  return (
    <main className="min-h-screen bg-ink-50 pb-20 pt-20 md:pt-24">
      <div className="container-max section-pad mx-auto max-w-5xl py-8">
        <button type="button" onClick={() => onNavigate('/dashboard')} className="btn-ghost mb-5"><ArrowLeft size={16} /> Back to dashboard</button>
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-wider text-coral-500">Invite friends</p><h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900">Your referrals</h1><p className="mt-2 text-sm text-ink-500">Track signups and claim wallet rewards when their first qualifying booking is complete.</p></div>

        {error && <p className="mb-5 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}

        {loading ? <p className="rounded-xl bg-white p-8 text-center text-sm text-ink-500">Loading referral activity…</p> : <>
          <section className="mb-5 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl bg-ink-900 p-6 text-white sm:p-7">
              <div className="flex items-center gap-2 text-coral-300"><Gift size={18} /><span className="text-xs font-bold uppercase tracking-wide">Referral reward</span></div>
              <p className="mt-4 font-display text-3xl font-extrabold">Earn {currency(referralData?.rewardAmount || 100)}</p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-200">When a friend signs up with your code and completes their first paid booking of {currency(referralData?.minimumBookingAmount || 500)} or more, claim {currency(referralData?.rewardAmount || 100)} into your Haango wallet.</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-white/10 px-4 py-2.5 font-mono text-sm font-bold tracking-wider">{referralData?.referralCode || '—'}</span>
                <button type="button" onClick={copyCode} disabled={!referralData?.referralCode} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-ink-900 hover:bg-ink-100 disabled:opacity-50"><Copy size={14} />{copied ? 'Copied' : 'Copy code'}</button>
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-7">
              <div className="flex items-center gap-2 text-blue-700"><Users size={18} /><span className="text-xs font-bold uppercase tracking-wide">Your activity</span></div>
              <p className="mt-4 font-display text-3xl font-extrabold text-ink-900">{referralData?.referrals?.length || 0}</p><p className="mt-1 text-sm text-ink-500">friends signed up</p>
              {walletBalance !== null && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{currency(referralData?.rewardAmount || 100)} claimed · wallet balance {currency(walletBalance)}</p>}
            </div>
          </section>

          {referralData?.referredBy && <section className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">You were referred by</p><p className="mt-1 font-semibold text-ink-900">{referralData.referredBy.name}</p></section>}

          <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <div className="border-b border-ink-100 px-5 py-4"><h2 className="font-display text-lg font-bold text-ink-900">Friends who used your code</h2></div>
            {referralData?.referrals?.length ? <div className="divide-y divide-ink-100">{referralData.referrals.map((referral) => <article key={referral.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="truncate font-semibold text-ink-900">{referral.name}</p><p className="mt-1 text-xs text-ink-500">Signed up {formatDate(referral.signedUpAt)} · {referral.role === 'BUDDY' ? 'Buddy account' : 'Customer account'}</p><p className={`mt-2 text-xs font-semibold ${referral.progress === 'CLAIMED' ? 'text-emerald-700' : referral.canClaim ? 'text-blue-700' : 'text-ink-500'}`}>{statusLabel(referral.progress)}</p>
                {referral.qualifyingBookingAt && <p className="mt-1 text-xs text-ink-500">First qualifying booking: {currency(referral.qualifyingBookingAmount)} on {formatDate(referral.qualifyingBookingAt)}</p>}
              </div>
              {referral.canClaim && <button type="button" onClick={() => claimReward(referral)} disabled={claimingId === referral.id} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-coral-600 disabled:opacity-50"><BadgeCheck size={15} />{claimingId === referral.id ? 'Claiming…' : `Claim ${currency(referralData.rewardAmount)}`}</button>}
            </article>)}</div> : <p className="px-5 py-12 text-center text-sm text-ink-500">No friends have signed up with your code yet.</p>}
          </section>
        </>}
      </div>
    </main>
  );
}