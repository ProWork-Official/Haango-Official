import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, BadgeCheck, Banknote, ChevronLeft, ChevronRight, EllipsisVertical, ImagePlus, MapPin, Plus, Search, ShieldCheck, Trash2, UserRound, Users, WalletCards, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import HaangoDialog from '../Components/HaangoDialog';
import AdminLayout from '../Components/AdminLayout';

export default function AdminAllBuddiesPage({ onNavigate }) {
  const [buddies, setBuddies] = useState([]);
  const [summary, setSummary] = useState({ totalBuddies: 0, verifiedBuddies: 0, pendingBuddies: 0, suspendedBuddies: 0, activeBuddies: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [buddyWallet, setBuddyWallet] = useState(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletAdjustment, setWalletAdjustment] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);
  const [withdrawalActionId, setWithdrawalActionId] = useState('');
  const [editError, setEditError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (appliedSearch) params.set('search', appliedSearch);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      try {
        const [buddiesResult, statsResult] = await Promise.allSettled([
          apiRequest(`/admin/buddies?${params.toString()}`, { includeMetadata: true }),
          apiRequest('/admin/buddies/stats'),
        ]);
        if (!active) return;
        if (buddiesResult.status === 'rejected') throw buddiesResult.reason;
        setBuddies(Array.isArray(buddiesResult.value.data) ? buddiesResult.value.data : []);
        setPagination(buddiesResult.value.pagination || null);
        if (statsResult.status === 'fulfilled') {
          setSummary(statsResult.value?.data || statsResult.value || {});
        } else {
          setError(statsResult.reason.message || 'Buddies loaded, but summary counts are unavailable.');
        }
      } catch (loadError) {
        if (active) {
          setBuddies([]);
          setPagination(null);
          setError(loadError.message || 'Unable to load buddies.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [page, appliedSearch, statusFilter, refreshKey]);

  const saveBuddy = async (event) => {
    event.preventDefault();
    if (editing.profileImages.length < 3) {
      setEditError('Keep at least 3 profile photos to save. Add a replacement photo before saving.');
      return;
    }
    setEditError('');
    try {
      const payload = {
        displayName: editing.displayName,
        ...(editing.age === '' || editing.age == null ? {} : { age: Number(editing.age) }),
        gender: editing.gender,
        hobbies: editing.hobbies.split(',').map((item) => item.trim()).filter(Boolean),
        city: editing.city,
        languages: editing.languages.split(',').map((item) => item.trim()).filter(Boolean),
        profileImages: editing.profileImages,
        summary: editing.summary,
        about: editing.about,
        hourlyRate: Number(editing.hourlyRate),
        responseTime: editing.responseTime,
        availability: editing.availability,
        user: {
          name: editing.userId?.name,
          email: editing.userId?.email,
          phone: editing.userId?.phone,
        },
      };
      await apiRequest(`/admin/buddies/${editing._id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditing(null);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setEditError(saveError.message || 'Unable to update buddy.');
    }
  };

  const openEditForm = (buddy, account) => {
    setEditError('');
    setEditing({
      ...buddy,
      userId: account,
      hobbies: (Array.isArray(buddy.hobbies) ? buddy.hobbies : Array.isArray(buddy.interests) ? buddy.interests : []).join(', '),
      languages: (Array.isArray(buddy.languages) ? buddy.languages : []).join(', '),
      profileImages: Array.isArray(buddy.profileImages) && buddy.profileImages.length
        ? buddy.profileImages
        : Array.isArray(buddy.gallery) ? buddy.gallery : [],
      availability: Array.isArray(buddy.availability)
        ? buddy.availability.map((slot) => ({ ...slot, isAvailable: slot.isAvailable !== false }))
        : [],
    });
    setBuddyWallet(null);
    setWalletDialogOpen(false);
    setWalletError('');
    setWalletAdjustment('');
    setWalletLoading(true);
    apiRequest(`/admin/buddies/${buddy._id}/wallet`)
      .then((wallet) => setBuddyWallet(wallet?.data || wallet))
      .catch((walletLoadError) => setWalletError(walletLoadError.message || 'Unable to load buddy wallet.'))
      .finally(() => setWalletLoading(false));
  };

  const saveBuddyWalletAdjustment = async (event) => {
    event.preventDefault();
    const amount = Number(walletAdjustment);
    if (!editing || !Number.isSafeInteger(amount) || amount === 0) {
      setWalletError('Enter a non-zero whole-rupee adjustment. Use a negative amount to debit.');
      return;
    }
    setWalletSaving(true);
    setWalletError('');
    try {
      const response = await apiRequest(`/admin/buddies/${editing._id}/wallet`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, requestId: crypto.randomUUID() }),
      });
      setBuddyWallet(response?.data || response);
      setWalletAdjustment('');
    } catch (adjustError) {
      setWalletError(adjustError.message || 'Unable to update buddy wallet.');
    } finally {
      setWalletSaving(false);
    }
  };

  const updateWithdrawal = async (withdrawal, status) => {
    setWithdrawalActionId(String(withdrawal._id));
    setWalletError('');
    try {
      await apiRequest(`/admin/withdrawals/${withdrawal._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNote: status === 'PAID' ? 'Approved and marked paid by admin.' : 'Withdrawal could not be completed. Please try again.',
        }),
      });
      const refreshedWallet = await apiRequest(`/admin/buddies/${editing._id}/wallet`);
      setBuddyWallet(refreshedWallet?.data || refreshedWallet);
    } catch (withdrawalError) {
      setWalletError(withdrawalError.message || 'Unable to update withdrawal.');
    } finally {
      setWithdrawalActionId('');
    }
  };

  const addPhotoFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) {
      setEditError('Choose one or more image files to add.');
      event.target.value = '';
      return;
    }

    try {
      const images = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
            if (dataUrl.length > 2_000_000) {
              reject(new Error('A photo is too large after compression. Choose a smaller image.'));
              return;
            }
            resolve(dataUrl);
          };
          image.onerror = () => reject(new Error('Image upload failed.'));
          image.src = String(reader.result);
        };
        reader.onerror = () => reject(new Error('Image upload failed.'));
        reader.readAsDataURL(file);
      })));
      setEditing((current) => ({ ...current, profileImages: [...current.profileImages, ...images] }));
      setEditError('');
    } catch (uploadError) {
      setEditError(uploadError.message || 'Unable to add photos.');
    } finally {
      event.target.value = '';
    }
  };

  const updateAvailability = (index, field, value) => {
    setEditing((current) => ({
      ...current,
      availability: current.availability.map((slot, slotIndex) => (
        slotIndex === index ? { ...slot, [field]: value } : slot
      )),
    }));
  };

  const updateStatus = async (buddy, action) => {
    try {
      await apiRequest(`/admin/buddies/${buddy._id}/${action}`, { method: 'PATCH' });
      setEditing((current) => current?._id === buddy._id
        ? { ...current, verificationStatus: action === 'suspend' ? 'SUSPENDED' : 'VERIFIED' }
        : current);
      setRefreshKey((value) => value + 1);
    } catch (statusError) {
      setError(statusError.message || 'Unable to update buddy status.');
    }
  };

  const deleteBuddy = (buddy) => {
    const accountId = buddy.userId?._id || buddy.userId;
    if (!accountId) {
      setError('This buddy profile is not linked to a user account and cannot be deleted here.');
      return;
    }
    const name = buddy.displayName || buddy.userId?.name || 'this buddy';
    setDialog({
      title: `Delete ${name}?`,
      description: 'This removes their user account, buddy profile, bookings, and reports.',
      confirmLabel: 'Delete buddy',
      tone: 'danger',
      onConfirm: async () => {
        setDialog(null);
        try {
          await apiRequest(`/admin/users/${accountId}`, { method: 'DELETE' });
          if (editing?._id === buddy._id) setEditing(null);
          if (buddies.length === 1 && page > 1) setPage((value) => value - 1);
          else setRefreshKey((value) => value + 1);
        } catch (deleteError) {
          setError(deleteError.message || 'Unable to delete buddy.');
        }
      },
    });
  };

  const statusTabs = [
    { id: 'ALL', label: 'All buddies' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'VERIFIED', label: 'Verified' },
    { id: 'SUSPENDED', label: 'Suspended' },
  ];
  const cards = [
    { label: 'Total buddies', value: summary.totalBuddies, Icon: Users, color: 'orange' },
    { label: 'Verified', value: summary.verifiedBuddies, Icon: BadgeCheck, color: 'blue' },
    { label: 'Pending verification', value: summary.pendingBuddies, Icon: ShieldCheck, color: 'orange' },
    { label: 'Active buddies', value: summary.activeBuddies, Icon: Activity, color: 'blue' },
  ];

  return (
    <AdminLayout activePage="buddies" onNavigate={onNavigate}>
      <main className="mx-auto w-full max-w-370 flex-1 px-4 py-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-500">Review profiles and manage buddy accounts.</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Every Haango buddy</h1>
          </div>
          <button onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Admin dashboard</button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, Icon, color }) => <article key={label} className="relative isolate min-h-30 overflow-hidden rounded-2xl border border-white bg-white p-4 shadow-[0_8px_24px_rgba(36,72,130,0.06)] sm:p-5"><span className={`absolute -bottom-8 -right-5 -z-10 h-24 w-24 rounded-full ${color === 'orange' ? 'bg-orange-50' : 'bg-blue-50'}`} /><span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color === 'orange' ? 'bg-orange-100 text-[#ff681f]' : 'bg-blue-100 text-blue-600'}`}><Icon size={19} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</p><p className="mt-1 text-xs font-medium text-ink-500">{label}</p></article>)}
        </div>

        {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
        <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Buddy profiles">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f7] p-3 sm:p-4">
            <div className="relative min-w-56 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, phone, or city..." className="w-full rounded-full border border-[#e8edf6] bg-[#fafbfd] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-300" aria-label="Search buddies" />
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[#f4f7fc] p-1" aria-label="Filter buddies by verification status">
              {statusTabs.map((tab) => <button key={tab.id} onClick={() => { setStatusFilter(tab.id); setPage(1); }} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${statusFilter === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`} aria-pressed={statusFilter === tab.id}>{tab.label}</button>)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-205 border-collapse text-left">
              <thead><tr className="bg-[#f6f8fc] text-[11px] font-semibold text-ink-500"><th className="w-12 px-4 py-3">#</th><th className="px-3 py-3">Buddy</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">City</th><th className="px-3 py-3">Rate / hour</th><th className="px-3 py-3">Status</th><th className="w-16 px-4 py-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-[#edf1f7]">
                {loading ? <tr><td colSpan="8" className="px-4 py-14 text-center text-sm text-ink-500">Loading buddies...</td></tr> : buddies.length ? buddies.map((buddy, index) => {
                  const account = typeof buddy.userId === 'object' ? buddy.userId : {};
                  const name = buddy.displayName || account.name || 'Buddy';
                  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
                  const isPending = buddy.verificationStatus === 'PENDING';
                  const isSuspended = buddy.verificationStatus === 'SUSPENDED';
                  return <tr key={buddy._id} tabIndex={0} aria-label={`Edit ${name}`} onClick={() => openEditForm(buddy, account)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openEditForm(buddy, account); } }} className="cursor-pointer transition hover:bg-[#fbfcff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300">
                    <td className="px-4 py-3.5 text-xs font-semibold text-ink-500">{(page - 1) * (pagination?.limit || 10) + index + 1}</td>
                    <td className="px-3 py-3.5"><div className="flex min-w-44 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isSuspended ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-[#e95718]'}`}>{initials || '?'}</span><span className="truncate text-sm font-semibold text-ink-800">{name}</span></div></td>
                    <td className="max-w-56 truncate px-3 py-3.5 text-xs text-ink-600">{account.email || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-ink-600">{account.phone || '—'}</td>
                    <td className="px-3 py-3.5"><span className="inline-flex max-w-32 items-center gap-1.5 truncate rounded-full bg-[#f4f7fc] px-2.5 py-1.5 text-xs text-ink-600"><MapPin size={13} className="shrink-0 text-blue-600" />{buddy.city || account.city || '—'}</span></td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-ink-700">₹{Number(buddy.hourlyRate || 0).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${isPending ? 'bg-amber-50 text-amber-700' : isSuspended ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{buddy.verificationStatus || 'UNKNOWN'}</span></td>
                    <td className="relative px-4 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => setOpenMenuId((current) => current === buddy._id ? null : buddy._id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-[#f0f4fb] hover:text-ink-900" aria-label={`Actions for ${name}`} aria-expanded={openMenuId === buddy._id}><EllipsisVertical size={18} /></button>
                      {openMenuId === buddy._id && <div className="absolute right-12 top-2 z-10 w-40 rounded-xl border border-[#e8edf6] bg-white p-1 text-left shadow-xl">
                        <button onClick={() => { openEditForm(buddy, account); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-ink-700 hover:bg-blue-50"><UserRound size={14} /> Edit</button>
                        {isPending && <button onClick={() => { setOpenMenuId(null); updateStatus(buddy, 'verify'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><BadgeCheck size={14} /> Verify</button>}
                        {!isPending && !isSuspended && <button onClick={() => { setOpenMenuId(null); updateStatus(buddy, 'suspend'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"><ShieldCheck size={14} /> Suspend</button>}
                        {isSuspended && <button onClick={() => { setOpenMenuId(null); updateStatus(buddy, 'unsuspend'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><BadgeCheck size={14} /> Restore</button>}
                        <button onClick={() => { setOpenMenuId(null); deleteBuddy(buddy); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                      </div>}
                    </td>
                  </tr>;
                }) : <tr><td colSpan="8" className="px-4 py-14 text-center"><p className="text-sm font-semibold text-ink-700">No buddies found</p><p className="mt-1 text-xs text-ink-500">Try another name, email, phone number, or status.</p></td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] px-4 py-3">
            <p className="text-xs text-ink-500">Showing {buddies.length ? (page - 1) * (pagination?.limit || 10) + 1 : 0}–{(page - 1) * (pagination?.limit || 10) + buddies.length} of {pagination?.total ?? 0} buddies</p>
            <div className="flex items-center gap-1"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-[#f4f7fc] disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17} /></button><span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-bold text-white">{page}</span><span className="px-1 text-xs text-ink-400">of {pagination?.totalPages || 1}</span><button disabled={page >= (pagination?.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-[#f4f7fc] disabled:opacity-40" aria-label="Next page"><ChevronRight size={17} /></button></div>
          </div>
        </section>
      </main>

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-3 py-5 sm:px-6">
        <div className="grid max-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl md:h-[min(48rem,calc(100dvh-2.5rem))] md:max-h-[calc(100dvh-2.5rem)] md:overflow-hidden md:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden border-b border-[#edf1f7] bg-[#f8faff] p-4 md:border-b-0 md:border-r md:p-5">
            <span className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#ff681f]" />
            <span className="pointer-events-none absolute -bottom-20 left-20 h-36 w-36 rounded-full bg-blue-600" />
            <div className="relative z-10 flex flex-col items-center text-center">
              {editing.profileImages[0]
                ? <img src={editing.profileImages[0]} alt={`${editing.displayName || 'Buddy'} profile`} className="mb-3 h-24 w-24 rounded-full bg-white object-cover ring-4 ring-white shadow-md" />
                : <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 font-display text-3xl font-extrabold text-[#ff681f] ring-4 ring-white shadow-md">{String(editing.displayName || 'Buddy').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div>}
              <h2 className="max-w-full wrap-break-word font-display text-xl font-bold text-ink-900">{editing.displayName || 'Buddy profile'}</h2>
              <span className={`mt-2 rounded-full px-2.5 py-1 text-[10px] font-bold ${editing.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : editing.verificationStatus === 'SUSPENDED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{editing.verificationStatus || 'PENDING'}</span>
            </div>
            <div className="relative z-10 mt-4 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600"><WalletCards size={15} className="text-emerald-700" />Buddy wallet</span><strong className="font-display text-sm font-extrabold text-ink-900">{walletLoading ? '…' : `₹${Number(buddyWallet?.availableBalance || 0).toLocaleString('en-IN')}`}</strong></div>
              <p className="mt-1 text-right text-[11px] text-ink-500">Available to withdraw</p>
            </div>
            <div className="relative z-10 mt-4 space-y-3 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-ink-500">Age</span><strong className="text-sm text-ink-900">{editing.age || '—'}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="text-xs text-ink-500">City</span><strong className="max-w-32 truncate text-sm text-ink-900">{editing.city || '—'}</strong></div>
              <div className="flex items-center justify-between gap-3 border-t border-[#edf1f7] pt-2.5"><span className="text-xs text-ink-500">Hourly rate</span><strong className="font-display text-sm font-extrabold text-ink-900">₹{Number(editing.hourlyRate || 0).toLocaleString('en-IN')}/hr</strong></div>
            </div>
            <div className="relative z-10 mt-3 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Account owner</span>
              <p className="mt-1 break-all text-sm font-semibold text-ink-900">{editing.userId?.name || '—'}</p>
              <p className="mt-1 break-all text-xs text-ink-500">{editing.userId?.email || '—'}</p>
            </div>
          </aside>

          <form onSubmit={saveBuddy} className="relative flex min-h-0 flex-col overflow-hidden">
            <span className="pointer-events-none absolute -right-5 -top-12 z-0 hidden h-32 w-32 rounded-full bg-blue-50 md:block" />
            <span className="pointer-events-none absolute right-7 top-5 z-0 hidden h-7 w-7 rounded-full bg-orange-200 md:block" />
            <div className="relative z-10 flex items-start justify-between gap-4 border-b border-[#edf1f7] px-5 py-4 sm:px-7"><div><h2 className="font-display text-xl font-bold text-ink-900">Edit buddy</h2><p className="mt-1 text-xs text-ink-500">Update the profile, photos, availability, and account details.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-ink-500 hover:bg-[#f4f7fc]" aria-label="Close edit form"><X size={18} /></button></div>

            <div className="relative z-10 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-7">
              {editError && <p className="rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{editError}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-700">Display name<input value={editing.displayName || ''} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} className="input-field mt-1" minLength="2" maxLength="100" required /></label>
            <label className="text-sm font-medium text-ink-700">Age<input type="number" min="18" max="120" value={editing.age ?? ''} onChange={(event) => setEditing({ ...editing, age: event.target.value })} className="input-field mt-1" /></label>
            <label className="text-sm font-medium text-ink-700">Gender<select value={editing.gender || 'PREFER_NOT_TO_SAY'} onChange={(event) => setEditing({ ...editing, gender: event.target.value })} className="input-field mt-1"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
            <label className="text-sm font-medium text-ink-700">City<input value={editing.city || ''} onChange={(event) => setEditing({ ...editing, city: event.target.value })} className="input-field mt-1" maxLength="100" /></label>
            <label className="text-sm font-medium text-ink-700">Hobbies <span className="font-normal text-ink-400">(comma-separated)</span><input value={editing.hobbies} onChange={(event) => setEditing({ ...editing, hobbies: event.target.value })} className="input-field mt-1" /></label>
            <label className="text-sm font-medium text-ink-700">Languages <span className="font-normal text-ink-400">(comma-separated)</span><input value={editing.languages} onChange={(event) => setEditing({ ...editing, languages: event.target.value })} className="input-field mt-1" /></label>
              </div>

            <section className="border-t border-[#edf1f7] pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-ink-800">Profile photos</h3><p className="mt-1 text-xs text-ink-500">At least 3 photos are required to save. Remove a photo, then add its replacement.</p></div>
              <label className="btn-ghost inline-flex cursor-pointer items-center gap-2 text-xs"><ImagePlus size={15} /> Add photos<input type="file" accept="image/*" multiple onChange={addPhotoFiles} className="hidden" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {editing.profileImages.map((image, index) => <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                <img src={image} alt={`Profile photo ${index + 1}`} className="h-28 w-full object-cover" />
                <button type="button" onClick={() => setEditing({ ...editing, profileImages: editing.profileImages.filter((_, photoIndex) => photoIndex !== index) })} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink-700 shadow-sm" aria-label={`Remove profile photo ${index + 1}`}><X size={14} /></button>
              </div>)}
            </div>
            <p className="mt-2 text-xs font-medium text-ink-500">{editing.profileImages.length} photo{editing.profileImages.length === 1 ? '' : 's'} selected</p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-700">Short summary<textarea value={editing.summary || ''} onChange={(event) => setEditing({ ...editing, summary: event.target.value })} className="input-field mt-1" rows="3" maxLength="300" /></label>
            <label className="text-sm font-medium text-ink-700">About<textarea value={editing.about || ''} onChange={(event) => setEditing({ ...editing, about: event.target.value })} className="input-field mt-1" rows="3" maxLength="2000" /></label>
            <label className="text-sm font-medium text-ink-700">Hourly rate (INR)<input type="number" min="300" max="400" value={editing.hourlyRate ?? ''} onChange={(event) => setEditing({ ...editing, hourlyRate: event.target.value })} className="input-field mt-1" required /></label>
            <label className="text-sm font-medium text-ink-700">Response time<input value={editing.responseTime || ''} onChange={(event) => setEditing({ ...editing, responseTime: event.target.value })} className="input-field mt-1" maxLength="200" /></label>
          </div>

          <section className="border-t border-[#edf1f7] pt-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-ink-800">Availability</h3><button type="button" onClick={() => setEditing({ ...editing, availability: [...editing.availability, { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true }] })} className="btn-ghost inline-flex items-center gap-1.5 text-xs"><Plus size={14} /> Add time</button></div>
            {editing.availability.map((slot, index) => <div key={`availability-${index}`} className="mb-2 grid grid-cols-2 items-end gap-2 rounded-xl bg-[#f7f9fc] p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <label className="text-xs font-medium text-ink-600">Day<input value={slot.day || ''} onChange={(event) => updateAvailability(index, 'day', event.target.value)} className="input-field mt-1" maxLength="30" required /></label>
              <label className="text-xs font-medium text-ink-600">From<input type="time" value={slot.startTime || ''} onChange={(event) => updateAvailability(index, 'startTime', event.target.value)} className="input-field mt-1" required /></label>
              <label className="text-xs font-medium text-ink-600">To<input type="time" value={slot.endTime || ''} onChange={(event) => updateAvailability(index, 'endTime', event.target.value)} className="input-field mt-1" required /></label>
              <label className="flex items-center gap-2 pb-2 text-xs font-medium text-ink-600"><input type="checkbox" checked={slot.isAvailable !== false} onChange={(event) => updateAvailability(index, 'isAvailable', event.target.checked)} /> Available</label>
              <button type="button" onClick={() => setEditing({ ...editing, availability: editing.availability.filter((_, slotIndex) => slotIndex !== index) })} className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove availability slot ${index + 1}`}><Trash2 size={15} /></button>
            </div>)}
          </section>

          <section className="border-t border-[#edf1f7] pt-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-800">Account details</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {['name', 'email', 'phone'].map((field) => <label key={field} className="text-sm font-medium capitalize text-ink-700">Account {field}<input type={field === 'email' ? 'email' : 'text'} value={editing.userId?.[field] || ''} onChange={(event) => setEditing({ ...editing, userId: { ...editing.userId, [field]: event.target.value } })} className="input-field mt-1" required /></label>)}
            </div>
          </section>

            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1f7] px-4 py-3 sm:px-7"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setWalletDialogOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><WalletCards size={15} />Bank details & withdrawals</button><button type="button" onClick={() => deleteBuddy(editing)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50"><Trash2 size={15} />Delete Buddy</button><button type="button" onClick={() => updateStatus(editing, editing.verificationStatus === 'SUSPENDED' ? 'unsuspend' : 'suspend')} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2.5 text-xs font-bold transition ${editing.verificationStatus === 'SUSPENDED' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}>{editing.verificationStatus === 'SUSPENDED' ? <BadgeCheck size={15} /> : <ShieldCheck size={15} />}{editing.verificationStatus === 'SUSPENDED' ? 'Unsuspend Buddy' : 'Suspend Buddy'}</button></div><div className="flex shrink-0 justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button><button className="inline-flex items-center gap-2 rounded-full bg-[#ff681f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e95718]">Save changes</button></div></div>
          </form>
        </div>
      </div>}
      {walletDialogOpen && editing && <div className="fixed inset-0 z-70 flex items-center justify-center bg-ink-900/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setWalletDialogOpen(false); }}>
        <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]" role="dialog" aria-modal="true" aria-labelledby="buddy-wallet-title">
          <header className="flex items-start justify-between gap-4 border-b border-[#edf1f7] px-5 py-4 sm:px-7">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Buddy finance</p><h2 id="buddy-wallet-title" className="mt-1 font-display text-xl font-bold text-ink-900">{editing.displayName || editing.userId?.name}&apos;s wallet & payout details</h2><p className="mt-1 text-xs text-ink-500">{editing.userId?.email || ''}</p></div>
            <button type="button" onClick={() => setWalletDialogOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50" aria-label="Close wallet details"><X size={18} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {walletError && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{walletError}</p>}
            {walletLoading ? <p className="py-16 text-center text-sm text-ink-500">Loading wallet and payout information…</p> : buddyWallet && <>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <article className="rounded-xl border border-[#e8edf6] bg-[#f8fafc] p-4"><p className="text-xs text-ink-500">Available balance</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">₹{Number(buddyWallet.availableBalance || 0).toLocaleString('en-IN')}</p></article>
                <article className="rounded-xl border border-[#e8edf6] bg-[#f8fafc] p-4"><p className="text-xs text-ink-500">Total earned</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">₹{Number(buddyWallet.totalEarned || 0).toLocaleString('en-IN')}</p></article>
                <article className="rounded-xl border border-[#e8edf6] bg-[#f8fafc] p-4"><p className="text-xs text-ink-500">In withdrawal pipeline</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">₹{Number(buddyWallet.totalWithdrawn || 0).toLocaleString('en-IN')}</p></article>
              </div>
              <div className="grid items-start gap-5 xl:grid-cols-[0.85fr_1.4fr]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-[#e8edf6] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-display text-base font-bold text-ink-900">Payout destination</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">{buddyWallet.wallet?.payoutMethod || 'NOT SET'}</span></div>
                    {buddyWallet.wallet ? <dl className="space-y-3 text-sm">
                      <div><dt className="text-xs text-ink-500">Account holder</dt><dd className="mt-0.5 break-all font-semibold text-ink-900">{buddyWallet.wallet.accountHolderName || '—'}</dd></div>
                      {buddyWallet.wallet.bankName && <div><dt className="text-xs text-ink-500">Bank name</dt><dd className="mt-0.5 font-semibold text-ink-900">{buddyWallet.wallet.bankName}</dd></div>}
                      {buddyWallet.wallet.accountNumber && <div><dt className="text-xs text-ink-500">Account number</dt><dd className="mt-0.5 break-all font-semibold text-ink-900">{buddyWallet.wallet.accountNumber}</dd></div>}
                      {buddyWallet.wallet.ifscCode && <div><dt className="text-xs text-ink-500">IFSC code</dt><dd className="mt-0.5 font-semibold text-ink-900">{buddyWallet.wallet.ifscCode}</dd></div>}
                      {buddyWallet.wallet.upiId && <div><dt className="text-xs text-ink-500">UPI ID</dt><dd className="mt-0.5 break-all font-semibold text-ink-900">{buddyWallet.wallet.upiId}</dd></div>}
                      <div><dt className="text-xs text-ink-500">Verification</dt><dd className="mt-0.5 font-semibold text-ink-900">{buddyWallet.wallet.isVerified ? 'Verified' : 'Not verified'}</dd></div>
                    </dl> : <p className="text-sm text-ink-500">No payout details saved.</p>}
                  </section>

                  <form onSubmit={saveBuddyWalletAdjustment} className="rounded-xl border border-[#e8edf6] p-4">
                    <h3 className="font-display text-base font-bold text-ink-900">Adjust buddy wallet</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">Enter a positive amount to credit or a negative amount to debit.</p>
                    <label className="mt-3 block text-xs font-semibold text-ink-700">Adjustment (₹)<input type="number" step="1" value={walletAdjustment} onChange={(event) => setWalletAdjustment(event.target.value)} placeholder="e.g. 500 or -100" className="input-field mt-1" required /></label>
                    <button type="submit" disabled={walletSaving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><WalletCards size={15} />{walletSaving ? 'Updating…' : 'Update wallet'}</button>
                  </form>
                </div>

                <section className="overflow-hidden rounded-xl border border-[#e8edf6]">
                  <div className="border-b border-[#edf1f7] px-4 py-3"><h3 className="font-display text-base font-bold text-ink-900">Withdrawal history</h3><p className="mt-1 text-xs text-ink-500">Latest {buddyWallet.withdrawals?.length || 0} requests</p></div>
                  <div className="max-h-[min(55vh,34rem)] overflow-auto">
                    {buddyWallet.withdrawals?.length ? <div className="divide-y divide-[#edf1f7]">{buddyWallet.withdrawals.map((withdrawal) => {
                      const isPending = ['PENDING', 'PROCESSING'].includes(withdrawal.status);
                      const actionBusy = withdrawalActionId === String(withdrawal._id);
                      const statusLabel = withdrawal.status === 'PAID' ? 'COMPLETED' : withdrawal.status;
                      return <article key={withdrawal._id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><p className="font-display text-lg font-bold text-ink-900">₹{Number(withdrawal.amount || 0).toLocaleString('en-IN')}</p><p className="mt-0.5 text-xs text-ink-500">{new Date(withdrawal.createdAt).toLocaleString('en-IN')} · {withdrawal.payoutMethod} · {withdrawal.destinationMasked}</p></div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${withdrawal.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : withdrawal.status === 'REJECTED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel}</span>
                        </div>
                        {withdrawal.status === 'REJECTED' && <p className="mt-2 text-xs font-medium text-red-700">Withdrawal could not be completed. Please try again.</p>}
                        {withdrawal.adminNote && withdrawal.status !== 'REJECTED' && <p className="mt-2 text-xs text-ink-500">{withdrawal.adminNote}</p>}
                        {isPending && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => updateWithdrawal(withdrawal, 'PAID')} disabled={actionBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><Banknote size={13} />{actionBusy ? 'Updating…' : 'Approve & mark paid'}</button><button type="button" onClick={() => updateWithdrawal(withdrawal, 'REJECTED')} disabled={actionBusy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button></div>}
                      </article>;
                    })}</div> : <p className="p-8 text-center text-sm text-ink-500">No withdrawal requests yet.</p>}
                  </div>
                </section>
              </div>
            </>}
          </div>
          <footer className="flex justify-end border-t border-[#edf1f7] px-5 py-3 sm:px-7"><button type="button" onClick={() => setWalletDialogOpen(false)} className="btn-ghost">Close</button></footer>
        </section>
      </div>}
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </AdminLayout>
  );
}