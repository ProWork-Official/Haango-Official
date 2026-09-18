import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Ticket } from 'lucide-react';
import { apiRequest } from '../lib/api';

const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function AdminCouponsPage({ onNavigate }) {
  const [coupons, setCoupons] = useState([]);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('BUDDY_SIGNUP');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCoupons = async () => {
    const response = await apiRequest('/admin/coupons');
    setCoupons(Array.isArray(response) ? response : response?.data || []);
  };

  useEffect(() => { loadCoupons().catch((loadError) => setError(loadError.message)); }, []);

  const createCoupon = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/admin/coupons', { method: 'POST', body: JSON.stringify({ code, amount: Number(amount), type }) });
      setCode('');
      setAmount('');
      await loadCoupons();
    } catch (saveError) {
      setError(saveError.message || 'Unable to create coupon.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await apiRequest(`/admin/coupons/${coupon._id}`, { method: 'DELETE' });
      setCoupons((current) => current.filter((item) => item._id !== coupon._id));
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete coupon.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-20 pt-16 md:pt-18">
      <div className="container-max section-pad py-8">
        <button type="button" onClick={() => onNavigate('admin')} className="btn-ghost mb-5"><ArrowLeft size={16} /> Back to admin</button>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral-50 text-coral-500"><Ticket size={21} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-coral-500">Admin tools</p><h1 className="font-display text-3xl font-extrabold text-ink-900">Coupon management</h1></div>
        </div>

        <form onSubmit={createCoupon} className="card mb-8 grid gap-4 p-6 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
          <label className="text-sm font-medium text-ink-700">Coupon ID<input className="input-field mt-1" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME100" required /></label>
          <label className="text-sm font-medium text-ink-700">Amount<input className="input-field mt-1" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100" required /></label>
          <label className="text-sm font-medium text-ink-700">Coupon type<select className="input-field mt-1" value={type} onChange={(event) => setType(event.target.value)}><option value="BUDDY_SIGNUP">Buddy signup coupon</option><option value="USER_SIGNUP">User signup coupon</option><option value="DISCOUNT">Booking discount coupon</option></select></label>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50"><Plus size={16} /> {saving ? 'Adding...' : 'Add coupon'}</button>
        </form>

        {error && <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}
        <div className="card overflow-hidden"><div className="border-b border-ink-100 p-5"><h2 className="font-display text-lg font-bold text-ink-900">Active coupons</h2></div><div className="divide-y divide-ink-100">{coupons.length ? coupons.map((coupon) => <div key={coupon._id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-display font-bold tracking-wider text-ink-900">{coupon.code}</p><p className="mt-1 text-sm text-ink-500">{coupon.type === 'BUDDY_SIGNUP' ? 'Buddy signup coupon' : coupon.type === 'USER_SIGNUP' ? 'User signup coupon' : 'Booking discount coupon'} · {currency(coupon.amount)}</p></div><button type="button" onClick={() => deleteCoupon(coupon)} className="btn-ghost text-red-600"><Trash2 size={16} /> Delete coupon</button></div>) : <p className="p-5 text-sm text-ink-500">No coupons added yet.</p>}</div></div>
      </div>
    </div>
  );
}
