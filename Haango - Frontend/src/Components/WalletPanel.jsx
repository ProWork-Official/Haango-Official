import { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Landmark, Loader2, Save, Send, WalletCards } from 'lucide-react';
import { apiRequest } from '../lib/api';

const emptyForm = {
  payoutMethod: 'BANK',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
};

function currency(value = 0) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function WalletPanel({ onboardingOnly = false, onSaved }) {
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadWallet = async () => {
    try {
      setLoading(true);
      const nextSummary = await apiRequest('/wallet');
      setSummary(nextSummary);
      if (nextSummary.wallet) {
        setForm((current) => ({
          ...current,
          payoutMethod: nextSummary.wallet.payoutMethod || 'BANK',
          accountHolderName: nextSummary.wallet.accountHolderName || '',
          bankName: nextSummary.wallet.bankName || '',
          ifscCode: nextSummary.wallet.ifscCode || '',
          upiId: nextSummary.wallet.upiId || '',
        }));
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load wallet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchWallet = async () => {
      try {
        const nextSummary = await apiRequest('/wallet');
        if (!active) return;
        setSummary(nextSummary);
        if (nextSummary.wallet) {
          setForm((current) => ({
            ...current,
            payoutMethod: nextSummary.wallet.payoutMethod || 'BANK',
            accountHolderName: nextSummary.wallet.accountHolderName || '',
            bankName: nextSummary.wallet.bankName || '',
            ifscCode: nextSummary.wallet.ifscCode || '',
            upiId: nextSummary.wallet.upiId || '',
          }));
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load wallet.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchWallet();
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => {
    setMessage('');
    setError('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveDetails = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');
      await apiRequest('/wallet/payout-details', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setMessage('Payout details saved. They will be reviewed before your first withdrawal.');
      await loadWallet();
      if (typeof onSaved === 'function') onSaved();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save payout details.');
    } finally {
      setSaving(false);
    }
  };

  const requestWithdrawal = async (event) => {
    event.preventDefault();
    const availableBalance = Number(summary?.availableBalance || 0);
    const minimumWithdrawal = Number(summary?.minimumWithdrawal || 300);
    const requestedAmount = Number(amount);

    if (availableBalance < minimumWithdrawal) {
      setError(`You need at least ${currency(minimumWithdrawal)} in completed earnings before requesting a withdrawal.`);
      return;
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount < minimumWithdrawal || requestedAmount > availableBalance) {
      setError(`Enter an amount between ${currency(minimumWithdrawal)} and ${currency(availableBalance)}.`);
      return;
    }

    try {
      setWithdrawing(true);
      setMessage('');
      setError('');
      await apiRequest('/wallet/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amount: requestedAmount }),
      });
      setAmount('');
      setMessage('Withdrawal request submitted for review.');
      await loadWallet();
    } catch (withdrawalError) {
      setError(withdrawalError.message || 'Unable to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  const inputClass = 'input-field mt-1';

  if (loading) {
    return <div className="card flex items-center gap-2 p-6 text-sm text-ink-500"><Loader2 size={18} className="animate-spin" /> Loading wallet...</div>;
  }

  return (
    <section className="space-y-6" id="companion-wallet">
      <div className="flex items-center gap-2">
        <WalletCards size={20} className="text-coral-500" />
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">Wallet & withdrawals</h2>
          <p className="text-sm text-ink-500">Set where your earnings should be sent and request a payout.</p>
        </div>
      </div>

      {!onboardingOnly && <div className="grid gap-4 sm:grid-cols-3">
        <div className="card bg-ink-900 p-5 text-black"><p className="text-xs text-ink-400">Available to withdraw</p><p className="mt-2 font-display text-2xl font-extrabold">{currency(summary?.availableBalance)}</p><p className="mt-1 text-xs text-ink-400">Minimum withdrawal: {currency(summary?.minimumWithdrawal || 300)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-400">Total earned</p><p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{currency(summary?.totalEarned)}</p></div>
        <div className="card p-5"><p className="text-xs text-ink-400">In withdrawal pipeline</p><p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{currency(summary?.totalWithdrawn)}</p></div>
      </div>}

      <div className={onboardingOnly ? '' : 'grid gap-6 lg:grid-cols-2'}>
        <form onSubmit={saveDetails} className="card p-6">
          <div className="mb-5 flex items-center gap-2"><Landmark size={18} className="text-coral-500" /><h3 className="font-display text-lg font-bold text-ink-900">{onboardingOnly ? 'Payout details' : 'Update payout details'}</h3></div>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-ink-50 p-1">
            {['BANK', 'UPI'].map((method) => (
              <button key={method} type="button" onClick={() => updateField('payoutMethod', method)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${form.payoutMethod === method ? 'bg-white text-coral-600 shadow-sm' : 'text-ink-500'}`}>
                {method === 'BANK' ? 'Bank account' : 'UPI ID'}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-ink-700">Account holder name<input className={inputClass} value={form.accountHolderName} onChange={(event) => updateField('accountHolderName', event.target.value)} required /></label>
          {form.payoutMethod === 'BANK' ? (
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-ink-700">Bank name<input className={inputClass} value={form.bankName} onChange={(event) => updateField('bankName', event.target.value)} required /></label>
              <label className="block text-sm font-medium text-ink-700">Account number<input className={inputClass} inputMode="numeric" value={form.accountNumber} onChange={(event) => updateField('accountNumber', event.target.value)} placeholder="Enter account number to update" required /></label>
              <label className="block text-sm font-medium text-ink-700">IFSC code<input className={inputClass} value={form.ifscCode} onChange={(event) => updateField('ifscCode', event.target.value.toUpperCase())} required /></label>
            </div>
          ) : (
            <label className="mt-4 block text-sm font-medium text-ink-700">UPI ID<input className={inputClass} value={form.upiId} onChange={(event) => updateField('upiId', event.target.value)} placeholder="name@upi" required /></label>
          )}
          {summary?.wallet?.destinationMasked && <p className="mt-4 flex items-center gap-2 text-xs text-ink-500"><CheckCircle2 size={15} className="text-success-600" /> Current destination: {summary.wallet.destinationMasked}</p>}
          <button type="submit" disabled={saving} className="btn-primary mt-5 w-full disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : onboardingOnly ? 'Save and continue' : 'Save payout details'}</button>
        </form>

        {!onboardingOnly && <div className="space-y-6">
          <form onSubmit={requestWithdrawal} className="card p-6">
            <div className="mb-5 flex items-center gap-2"><Send size={18} className="text-coral-500" /><h3 className="font-display text-lg font-bold text-ink-900">Withdraw earnings</h3></div>
            <p className="text-sm text-ink-500">Minimum withdrawal: {currency(summary?.minimumWithdrawal || 300)}. Eligible requests are sent automatically through RazorpayX.</p>
            <label className="mt-4 block text-sm font-medium text-ink-700">Amount<input className={inputClass} type="number" min={summary?.minimumWithdrawal || 300} max={summary?.availableBalance > 0 ? summary.availableBalance : undefined} value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); }} placeholder="Enter amount" required /></label>
            <button type="submit" disabled={withdrawing || !summary?.wallet || Number(summary?.availableBalance || 0) < Number(summary?.minimumWithdrawal || 300)} className="btn-primary mt-5 w-full disabled:opacity-50"><Banknote size={16} /> {withdrawing ? 'Submitting...' : 'Request withdrawal'}</button>
            {!summary?.wallet && <p className="mt-3 text-xs text-amber-600">Save your payout details before requesting a withdrawal.</p>}
            {summary?.wallet && Number(summary?.availableBalance || 0) < Number(summary?.minimumWithdrawal || 300) && <p className="mt-3 text-xs text-amber-600">No withdrawable balance yet. You need at least ₹300 available to withdraw.</p>}
          </form>

          <div className="card p-6"><h3 className="font-display text-lg font-bold text-ink-900">Withdrawal history</h3><div className="mt-4 space-y-3">{summary?.withdrawals?.length ? summary.withdrawals.map((withdrawal) => <div key={withdrawal._id} className="flex items-center justify-between border-b border-ink-100 pb-3 text-sm last:border-0"><span><span className="font-semibold text-ink-900">{currency(withdrawal.amount)}</span><span className="ml-2 text-xs text-ink-400">{withdrawal.destinationMasked}</span></span><span className="text-xs font-semibold text-ink-500">{withdrawal.status}</span></div>) : <p className="text-sm text-ink-500">No withdrawal requests yet.</p>}</div></div>
        </div>}
      </div>
      {(message || error) && <p className={`rounded-2xl p-4 text-sm ${error ? 'bg-error-50 text-error-600' : 'bg-success-50 text-success-700'}`}>{error || message}</p>}
    </section>
  );
}
