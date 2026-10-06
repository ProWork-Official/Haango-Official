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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7f2_0%,_#fff_42%,_#f5f7fb_100%)] pb-20 pt-20 md:pt-24">
      <div className="container-max section-pad mx-auto max-w-6xl py-8">
        <button
          type="button"
          onClick={() => onNavigate('/dashboard')}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-sm transition hover:border-coral-200 hover:text-coral-600"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral-500">Invite friends</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900 md:text-4xl">Your referrals</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-500 md:text-base">
            Track signups and claim wallet rewards when their first qualifying booking is complete.
          </p>
        </div>

        {error && (
          <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center text-sm text-ink-500 shadow-sm">
            Loading referral activity…
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b1d27] via-[#111827] to-[#2d2e38] p-6 text-white shadow-lg shadow-[#1b1d27]/10 sm:p-7">
                <div className="flex items-center gap-2 text-coral-300">
                  <Gift size={18} />
                  <span className="text-xs font-bold uppercase tracking-[0.22em]">Referral reward</span>
                </div>

                <p className="mt-4 font-display text-4xl font-extrabold text-white md:text-5xl">
                  Earn {currency(referralData?.rewardAmount || 100)}
                </p>

                <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-200 md:text-[15px]">
                  When a friend signs up with your code and completes their first paid booking of {currency(referralData?.minimumBookingAmount || 500)} or more, you unlock {currency(referralData?.rewardAmount || 100)} in your Haango wallet.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 font-mono text-sm font-bold tracking-[0.18em] text-white">
                    {referralData?.referralCode || '—'}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    disabled={!referralData?.referralCode}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-black transition hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy size={14} />
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2 text-blue-700">
                  <Users size={18} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">Your activity</span>
                </div>

                <p className="mt-4 font-display text-4xl font-extrabold text-ink-900">
                  {referralData?.referrals?.length || 0}
                </p>
                <p className="mt-1 text-sm text-ink-500">friends signed up</p>

                <div className="mt-5 rounded-2xl bg-coral-50 px-3 py-2.5 text-sm font-semibold text-coral-700">
                  {walletBalance !== null
                    ? `${currency(referralData?.rewardAmount || 100)} claimed · wallet balance ${currency(walletBalance)}`
                    : `Minimum booking: ${currency(referralData?.minimumBookingAmount || 500)}`}
                </div>
              </div>
            </section>

            {referralData?.referredBy && (
              <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">You were referred by</p>
                <p className="mt-2 text-lg font-bold text-ink-900">{referralData.referredBy.name}</p>
              </section>
            )}

            <section className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6">
                <h2 className="font-display text-xl font-bold text-ink-900">Friends who used your code</h2>
                <span className="rounded-full bg-coral-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-coral-600">
                  {referralData?.referrals?.length || 0} total
                </span>
              </div>

              {referralData?.referrals?.length ? (
                <div className="divide-y divide-ink-100">
                  {referralData.referrals.map((referral) => (
                    <article
                      key={referral.id}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-ink-900">{referral.name}</p>
                        <p className="mt-1 text-xs text-ink-500">
                          Signed up {formatDate(referral.signedUpAt)} · {referral.role === 'BUDDY' ? 'Buddy account' : 'Customer account'}
                        </p>
                        <p
                          className={`mt-2 text-xs font-semibold ${
                            referral.progress === 'CLAIMED'
                              ? 'text-emerald-700'
                              : referral.canClaim
                                ? 'text-blue-700'
                                : 'text-ink-500'
                          }`}
                        >
                          {statusLabel(referral.progress)}
                        </p>
                        {referral.qualifyingBookingAt && (
                          <p className="mt-1 text-xs text-ink-500">
                            First qualifying booking: {currency(referral.qualifyingBookingAmount)} on {formatDate(referral.qualifyingBookingAt)}
                          </p>
                        )}
                      </div>

                      {referral.canClaim && (
                        <button
                          type="button"
                          onClick={() => claimReward(referral)}
                          disabled={claimingId === referral.id}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <BadgeCheck size={15} />
                          {claimingId === referral.id ? 'Claiming…' : `Claim ${currency(referralData.rewardAmount)}`}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-14 text-center sm:px-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
                    <Users size={22} />
                  </div>
                  <p className="text-base font-semibold text-ink-800">No referrals yet</p>
                  <p className="mt-1 text-sm text-ink-500">Share your code and your friends will appear here once they sign up.</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}