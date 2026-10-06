import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowLeft, BadgeCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Copy, Eye, Heart, Mail, MapPin, Phone, Search, Trash2, UserRound, Users, WalletCards, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import HaangoDialog from '../Components/HaangoDialog';
import AdminLayout from '../Components/AdminLayout';

const formatDuration = (seconds = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const formatLastActive = (date, now, isCurrentlyActive = false) => {
  if (!date) return 'No activity recorded';
  if (isCurrentlyActive) return 'Active Now';
  const elapsed = Math.max(0, now - new Date(date).getTime());
  if (!Number.isFinite(elapsed)) return 'No activity recorded';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getActivityStatus = (date, now) => {
  if (!date) return 'INACTIVE';
  const elapsed = Math.max(0, now - new Date(date).getTime());
  if (!Number.isFinite(elapsed) || elapsed >= 30 * 24 * 60 * 60 * 1000) return 'INACTIVE';
  if (elapsed >= 14 * 24 * 60 * 60 * 1000) return 'SLEEPING';
  if (elapsed >= 7 * 24 * 60 * 60 * 1000) return 'AWAY';
  return 'ACTIVE';
};

export default function AdminAllUsersPage({ onNavigate }) {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, activeAccounts: 0, sleepingAccounts: 0, inactiveAccounts: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editingDetailsLoading, setEditingDetailsLoading] = useState(false);
  const [userIdCopied, setUserIdCopied] = useState(false);
  const [pageVisitedOpen, setPageVisitedOpen] = useState(false);
  const [pageVisitedPosition, setPageVisitedPosition] = useState(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [dialog, setDialog] = useState(null);
  const pageVisitedButtonRef = useRef(null);
  const walletSavingRef = useRef(false);
  const walletRequestRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(Date.now());
    const initialUpdate = window.setTimeout(updateCurrentTime, 0);
    const interval = window.setInterval(updateCurrentTime, 60 * 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (appliedSearch) params.set('search', appliedSearch);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (activityFilter !== 'ALL') params.set('status', activityFilter);
      try {
        const [usersResult, statsResult] = await Promise.allSettled([
          apiRequest(`/admin/users?${params.toString()}`, { includeMetadata: true }),
          apiRequest('/admin/user-stats'),
        ]);
        if (!active) return;
        if (usersResult.status === 'rejected') throw usersResult.reason;
        setUsers(Array.isArray(usersResult.value.data) ? usersResult.value.data : []);
        setPagination(usersResult.value.pagination || null);
        if (statsResult.status === 'fulfilled') {
          setSummary(statsResult.value?.data || statsResult.value || {});
        } else {
          setError(statsResult.reason.message || 'Users loaded, but summary counts are unavailable.');
        }
      } catch (loadError) {
        if (active) {
          setUsers([]);
          setPagination(null);
          setError(loadError.message || 'Unable to load users.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [page, appliedSearch, roleFilter, activityFilter, refreshKey]);

  const openUserEditor = async (user) => {
    setEditing({
      ...user,
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
      hobbiesText: Array.isArray(user.hobbies) ? user.hobbies.join(', ') : '',
      joinedAt: user.createdAt || null,
    });
    setEditingDetailsLoading(true);
    setUserIdCopied(false);
    setPageVisitedOpen(false);
    setWalletDialogOpen(false);
    setReferralDialogOpen(false);
    try {
      const details = await apiRequest(`/admin/users/${user._id}/summary`);
      setEditing((current) => current?._id === user._id ? { ...current, ...details } : current);
    } catch (detailsError) {
      setError(detailsError.message || 'Unable to load user details.');
    } finally {
      setEditingDetailsLoading(false);
    }
  };

  const copyUserId = async () => {
    if (!editing?.referralCode) return;
    try {
      await navigator.clipboard.writeText(editing.referralCode);
      setUserIdCopied(true);
    } catch {
      setError('Unable to copy the referral link in this browser.');
    }
  };

  const openReferralDialog = async () => {
    if (!editing?._id) return;
    setReferralDialogOpen(true);
    setReferralData(null);
    setReferralError('');
    setReferralLoading(true);
    try {
      const response = await apiRequest(`/admin/users/${editing._id}/referrals`);
      setReferralData(response?.data || response);
    } catch (loadError) {
      setReferralError(loadError.message || 'Unable to load referral activity.');
    } finally {
      setReferralLoading(false);
    }
  };

  const togglePageVisited = () => {
    if (pageVisitedOpen) {
      setPageVisitedOpen(false);
      return;
    }
    const bounds = pageVisitedButtonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(416, window.innerWidth - 32);
    setPageVisitedPosition({
      top: Math.max(16, bounds.top - 340),
      left: Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16)),
      width,
    });
    setPageVisitedOpen(true);
  };

  const getLastActiveLabel = (user) => {
    if (!user.lastSeenAt) return '—';
    const elapsed = Math.max(0, currentTime - new Date(user.lastSeenAt).getTime());
    if (user.isActive && elapsed <= 2 * 60 * 1000) return 'Active Now';
    return formatLastActive(user.lastSeenAt, currentTime);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    try {
      const updates = {
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        address: editing.address,
        dateOfBirth: editing.dateOfBirth || null,
        hobbies: String(editing.hobbiesText || '').split(/[\n,]/).map((hobby) => hobby.trim()).filter(Boolean),
      };
      await apiRequest(`/admin/users/${editing._id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      setEditing(null);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError.message || 'Unable to update user.');
    }
  };

  const openWalletDialog = () => {
    if (!editing || editingDetailsLoading) return;
    setWalletAmount('00');
    setWalletDialogOpen(true);
  };

  const saveWalletBalance = async (event) => {
    event.preventDefault();
    if (!editing || walletSavingRef.current) return;
    const adjustment = Number(walletAmount);
    const previousRequest = walletRequestRef.current;
    const request = previousRequest?.adjustment === adjustment
      ? previousRequest
      : { adjustment, requestId: globalThis.crypto.randomUUID() };
    walletRequestRef.current = request;
    walletSavingRef.current = true;
    setWalletSaving(true);
    try {
      const result = await apiRequest(`/admin/users/${editing._id}/wallet`, {
        method: 'PATCH',
        body: JSON.stringify({ amount: adjustment, requestId: request.requestId }),
      });
      setEditing((current) => current?._id === editing._id ? {
        ...current,
        walletBalance: result.walletBalance,
      } : current);
      walletRequestRef.current = null;
      setWalletDialogOpen(false);
    } catch (saveError) {
      setError(saveError.message || 'Unable to update wallet balance.');
    } finally {
      walletSavingRef.current = false;
      setWalletSaving(false);
    }
  };

  const deleteUser = async (user) => {
    setDialog({ title: `Delete ${user.name}?`, description: 'This action cannot be undone.', confirmLabel: 'Delete user', tone: 'danger', onConfirm: async () => {
      setDialog(null);
      try {
        await apiRequest(`/admin/users/${user._id}`, { method: 'DELETE' });
        if (editing?._id === user._id) setEditing(null);
        if (users.length === 1 && page > 1) setPage((value) => value - 1);
        else setRefreshKey((value) => value + 1);
      } catch (deleteError) { setError(deleteError.message || 'Unable to delete user.'); }
    } });
  };

  const roleTabs = [
    { id: 'ALL', label: 'All users' },
    { id: 'CUSTOMER', label: 'Customers' },
    { id: 'BUDDY', label: 'Buddies' },
  ];
  const cards = [
    { label: 'Total users', value: summary.totalUsers, Icon: Users, color: 'orange', filter: 'ALL' },
    { label: 'Active accounts', value: summary.activeAccounts, Icon: Activity, color: 'blue', filter: 'ACTIVE' },
    { label: 'Sleeping accounts', value: summary.sleepingAccounts, Icon: Clock3, color: 'orange', filter: 'SLEEPING' },
    { label: 'Inactive accounts', value: summary.inactiveAccounts, Icon: UserRound, color: 'blue', filter: 'INACTIVE' },
  ];
  const activityStatus = getActivityStatus(editing?.lastActiveAt, currentTime);
  const activityStatusLabel = {
    ACTIVE: 'Active',
    AWAY: 'Away',
    SLEEPING: 'Sleeping',
    INACTIVE: 'Inactive',
  }[activityStatus];
  const activityStatusStyle = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    AWAY: 'bg-blue-50 text-blue-700',
    SLEEPING: 'bg-amber-50 text-amber-700',
    INACTIVE: 'bg-red-50 text-red-700',
  }[activityStatus];

  return (
    <AdminLayout activePage="users" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-370 px-4 py-6 sm:px-6 xl:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-ink-500">Manage and keep track of all your users in one place.</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Every Haan<span className='text-[#ff681f]'>g</span><span className="text-blue-600">o</span> user</h1></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => onNavigate('/admin/buddies')} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><BadgeCheck size={15} /> All buddies</button><button onClick={() => onNavigate('/admin')} className="inline-flex items-center gap-2 rounded-full border border-[#e4ebf7] bg-white px-4 py-2.5 text-xs font-bold text-ink-600 transition hover:bg-[#f7f9fd]"><ArrowLeft size={15} /> Admin dashboard</button></div>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {cards.map(({ label, value, Icon, color, filter }) => <button key={label} type="button" onClick={() => { setActivityFilter(filter); setPage(1); }} aria-pressed={activityFilter === filter} className={`relative isolate min-h-30 cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-[0_8px_24px_rgba(36,72,130,0.06)] transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:p-5 ${activityFilter === filter ? 'border-blue-300 ring-1 ring-blue-200' : 'border-white'}`}><span className={`absolute -bottom-8 -right-5 -z-10 h-24 w-24 rounded-full ${color === 'orange' ? 'bg-orange-50' : 'bg-blue-50'}`} /><span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color === 'orange' ? 'bg-orange-100 text-[#ff681f]' : 'bg-blue-100 text-blue-600'}`}><Icon size={19} /></span><p className="font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</p><p className="mt-1 text-xs font-medium text-ink-500">{label}</p></button>)}
          </div>
          {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{error}</p>}
          <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(36,72,130,0.06)]" aria-label="Users list">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f7] p-3 sm:p-4">
              <div className="relative min-w-56 flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or phone..." className="w-full rounded-full border border-[#e8edf6] bg-[#fafbfd] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-300" aria-label="Search users" />
              </div>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-[#f4f7fc] p-1" aria-label="Filter by user type">
                {roleTabs.map((tab) => <button key={tab.id} onClick={() => { setRoleFilter(tab.id); setPage(1); }} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${roleFilter === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`} aria-pressed={roleFilter === tab.id}>{tab.label}</button>)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 border-collapse text-left">
                <thead><tr className="bg-[#f6f8fc] text-[11px] font-semibold text-ink-500"><th className="w-12 px-4 py-3">#</th><th className="px-3 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">DOB</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Last Active</th></tr></thead>
                <tbody className="divide-y divide-[#edf1f7]">
                  {loading ? <tr><td colSpan="7" className="px-4 py-14 text-center text-sm text-ink-500">Loading users...</td></tr> : users.length ? users.map((user, index) => {
                    const initials = String(user.name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
                    const activeNow = Boolean(currentTime && user.isActive && user.lastSeenAt && currentTime - new Date(user.lastSeenAt).getTime() <= 5 * 60 * 1000);
                    return <tr key={user._id} tabIndex={0} aria-label={`Edit ${user.name}`} onClick={() => openUserEditor(user)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openUserEditor(user); } }} className="cursor-pointer transition hover:bg-[#fbfcff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300">
                      <td className="px-4 py-3.5 text-xs font-semibold text-ink-500">{(page - 1) * (pagination?.limit || 10) + index + 1}</td>
                      <td className="px-3 py-3.5"><div className="flex min-w-44 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${user.role === 'BUDDY' ? 'bg-orange-100 text-[#e95718]' : 'bg-blue-100 text-blue-700'}`}>{initials || '?'}</span><span className="truncate text-sm font-semibold text-ink-800">{user.name}</span></div></td>
                      <td className="max-w-56 truncate px-3 py-3.5 text-xs text-ink-600">{user.email}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-ink-600">{user.phone}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-ink-600">{user.dateOfBirth ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(user.dateOfBirth)) : '—'}</td>
                      <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${user.role === 'BUDDY' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>{user.role === 'BUDDY' ? 'Buddy' : 'Customer'}</span></td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs">{activeNow ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active Now</span> : <span className="text-ink-500">{getLastActiveLabel(user)}</span>}</td>
                    </tr>;
                  }) : <tr><td colSpan="7" className="px-4 py-14 text-center"><p className="text-sm font-semibold text-ink-700">No users found</p><p className="mt-1 text-xs text-ink-500">Try another name, email, or phone number.</p></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] px-4 py-3">
              <p className="text-xs text-ink-500">Showing {users.length ? (page - 1) * (pagination?.limit || 10) + 1 : 0}–{(page - 1) * (pagination?.limit || 10) + users.length} of {pagination?.total ?? 0} users</p>
              <div className="flex items-center gap-1"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-[#f4f7fc] disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17} /></button><span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-bold text-white">{page}</span><span className="px-1 text-xs text-ink-400">of {pagination?.totalPages || 1}</span><button disabled={page >= (pagination?.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-[#f4f7fc] disabled:opacity-40" aria-label="Next page"><ChevronRight size={17} /></button></div>
            </div>
          </section>
        </div>
      </main>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-3 py-5 sm:px-6"><div className="grid max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl md:h-[min(42rem,calc(100dvh-2.5rem))] md:max-h-[calc(100dvh-2.5rem)] md:overflow-hidden md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="relative overflow-hidden border-b border-[#edf1f7] bg-[#f8faff] p-4 md:border-b-0 md:border-r md:p-5">
          <span className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#ff681f]" />
          <span className="pointer-events-none absolute -bottom-20 left-20 h-36 w-36 rounded-full bg-blue-600" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-orange-100 font-display text-3xl font-extrabold text-[#ff681f] ring-4 ring-white shadow-md">{String(editing.name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}</div>
            <h2 className="max-w-full wrap-break-word font-display text-xl font-bold text-ink-900">{editing.name || 'User'}</h2>
          </div>

          <div className="relative z-10 mt-4 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600"><WalletCards size={15} className="text-blue-600" />User wallet</span><strong className="font-display text-sm font-extrabold text-ink-900">{editingDetailsLoading ? '…' : `₹${Number(editing.walletBalance || 0).toLocaleString('en-IN')}`}</strong></div>
          </div>

          <div className="relative z-10 mt-3 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
            <span className="text-[12px] font-bold uppercase tracking-wide text-ink-400">USER ID: {editing.referralCode} </span>
            <button type="button" disabled={!editing.referralCode} onClick={copyUserId} className="mt-2 pl-4 relative top-[2px] inline-flex items-center gap-2 text-xs font-bold text-blue-700 disabled:opacity-50">{userIdCopied ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>

          <div className="relative z-10 mt-3 space-y-2.5 rounded-xl border border-[#e7edf7] bg-white/95 p-3.5">
            <div className="flex items-center justify-between gap-3"><span className="text-xs text-ink-500">Total bookings</span><strong className="text-sm text-ink-900">{editingDetailsLoading ? '…' : editing.totalBookings ?? 0}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-xs text-ink-500">Total bookings completed</span><strong className="text-sm text-ink-900">{editingDetailsLoading ? '…' : editing.completedBookings ?? 0}</strong></div>
            <div className="flex items-center justify-between border-t border-[#edf1f7] pt-2.5"><span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Joined on</span><span className="mt-1 text-xs font-semibold text-ink-800">{editing.joinedAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(editing.joinedAt)) : '—'}</span></div>
            <div className="flex items-center justify-between border-t border-[#edf1f7] pt-2.5"><span className="text-xs text-ink-500">Status</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${activityStatusStyle}`}>{editingDetailsLoading ? 'Loading…' : activityStatusLabel}</span></div>
              <div className="border-t border-[#edf1f7] pt-2.5"><div className="flex items-center justify-between gap-3"><span className="text-xs text-ink-500">Last Active</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${activityStatusStyle}`}><span className={`h-1.5 w-1.5 rounded-full ${editing.isCurrentlyActive || activityStatus === 'ACTIVE' ? 'bg-emerald-500' : activityStatus === 'SLEEPING' ? 'bg-amber-500' : activityStatus === 'AWAY' ? 'bg-blue-500' : 'bg-red-500'}`} />{editingDetailsLoading ? 'Loading…' : formatLastActive(editing.lastActiveAt, currentTime, editing.isCurrentlyActive)}</span></div></div>
          </div>
        </aside>

        <form onSubmit={saveUser} className="relative flex min-h-0 flex-col overflow-hidden">
          <span className="pointer-events-none absolute -right-5 -top-12 z-0 hidden h-32 w-32 rounded-full bg-blue-50 md:block" />
          <span className="pointer-events-none absolute right-7 top-5 z-0 hidden h-7 w-7 rounded-full bg-orange-200 md:block" />
          <div className="relative z-10 flex items-start justify-between gap-4 border-b border-[#edf1f7] px-5 py-4 sm:px-7"><div><h2 className="font-display text-xl font-bold text-ink-900">Edit user</h2><p className="mt-1 text-xs text-ink-500">Update user details and save the changes.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-ink-500 hover:bg-[#f4f7fc]" aria-label="Close edit form"><X size={18} /></button></div>
          <div className="relative z-10 grid flex-1 content-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2 sm:px-7">
            <label className="block text-xs font-semibold text-ink-700 sm:col-span-2"><span className="flex items-center gap-2"><UserRound size={15} className="text-[#ff681f]" />Name <span className="text-red-500">*</span></span><input className="input-field mt-1.5" value={editing.name || ''} onChange={(event) => setEditing({ ...editing, name: event.target.value })} required /></label>
            <label className="block text-xs font-semibold text-ink-700"><span className="flex items-center gap-2"><Mail size={15} className="text-blue-600" />Email <span className="text-red-500">*</span></span><input type="email" className="input-field mt-1.5" value={editing.email || ''} onChange={(event) => setEditing({ ...editing, email: event.target.value })} required /></label>
            <label className="block text-xs font-semibold text-ink-700"><span className="flex items-center gap-2"><Phone size={15} className="text-[#ff681f]" />Phone <span className="text-red-500">*</span></span><input type="tel" className="input-field mt-1.5" value={editing.phone || ''} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} required /></label>
            <label className="block text-xs font-semibold text-ink-700"><span className="flex items-center gap-2"><MapPin size={15} className="text-blue-600" />Address</span><textarea rows="2" className="input-field mt-1.5" value={editing.address || ''} onChange={(event) => setEditing({ ...editing, address: event.target.value })} /></label>
            <label className="block text-xs font-semibold text-ink-700"><span className="flex items-center gap-2"><CalendarDays size={15} className="text-[#ff681f]" />Date of birth</span><input type="date" className="input-field mt-1.5" value={editing.dateOfBirth || ''} onChange={(event) => setEditing({ ...editing, dateOfBirth: event.target.value })} /></label>
            <label className="block text-xs font-semibold text-ink-700 sm:col-span-2"><span className="flex items-center gap-2"><Heart size={15} className="text-[#ff681f]" />Hobbies</span><textarea rows="2" className="input-field mt-1.5" placeholder="Separate hobbies with commas" value={editing.hobbiesText || ''} onChange={(event) => setEditing({ ...editing, hobbiesText: event.target.value })} /></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] px-4 py-3 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={openWalletDialog} disabled={editingDetailsLoading} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"><WalletCards size={15} />Add Money</button>
              <button ref={pageVisitedButtonRef} type="button" onClick={togglePageVisited} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50" aria-expanded={pageVisitedOpen}><Eye size={14} />Page Visited</button>
              <button type="button" onClick={openReferralDialog} className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-3 py-2.5 text-xs font-bold text-orange-700 transition hover:bg-orange-50"><Users size={14} />Referrals</button>
              <button type="button" onClick={() => deleteUser(editing)} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50"><Trash2 size={15} />Delete User</button>
            </div>
            <div className="flex shrink-0 justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="btn-ghost">Cancel</button><button className="inline-flex items-center gap-2 rounded-full bg-[#ff681f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#e95718] sm:px-5">Save changes</button></div>
          </div>
        </form>
      </div></div>}
      {walletDialogOpen && editing && <div className="fixed inset-0 z-70 flex items-center justify-center bg-ink-900/45 px-4 py-6" role="presentation"><form onSubmit={saveWalletBalance} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-title">
        <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="wallet-dialog-title" className="font-display text-lg font-bold text-ink-900">Add Money</h2><p className="mt-1 text-xs text-ink-500">Adjust {editing.name}&apos;s user wallet balance.</p></div><button type="button" onClick={() => setWalletDialogOpen(false)} disabled={walletSaving} className="rounded-lg p-2 text-ink-500 hover:bg-[#f4f7fc] disabled:opacity-50" aria-label="Close Add Money dialog"><X size={18} /></button></div>
        <p className="mb-3 text-xs text-ink-500">Current balance: <strong className="text-ink-800">₹{Number(editing.walletBalance || 0).toLocaleString('en-IN')}</strong></p>
        <label className="block text-xs font-semibold text-ink-700">Add wallet balance (₹)<input type="number" step="1" placeholder="00" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} className="input-field mt-1.5" disabled={walletSaving} required /></label>
        <p className="mt-2 text-xs text-ink-500">Enter a negative amount to subtract funds.</p>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setWalletDialogOpen(false)} disabled={walletSaving} className="btn-ghost disabled:opacity-50">Cancel</button><button disabled={walletSaving} className="inline-flex items-center gap-2 rounded-full bg-[#ff681f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#e95718] disabled:opacity-50">{walletSaving ? 'Updating…' : 'Update wallet'}</button></div>
      </form></div>}
      {referralDialogOpen && editing && <div className="fixed inset-0 z-70 flex items-center justify-center bg-ink-900/55 p-4 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReferralDialogOpen(false); }}>
        <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="user-referral-title">
          <header className="flex items-start justify-between gap-4 border-b border-[#edf1f7] px-5 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Referral details</p><h2 id="user-referral-title" className="mt-1 font-display text-xl font-bold text-ink-900">{editing.name}&apos;s referrals</h2></div><button type="button" onClick={() => setReferralDialogOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50" aria-label="Close referral history"><X size={18} /></button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            {referralError && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600" role="alert">{referralError}</p>}
            {referralLoading ? <p className="py-14 text-center text-sm text-ink-500">Loading referral activity…</p> : referralData && <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#e8edf6] bg-[#f8fafc] p-4"><p className="text-xs text-ink-500">Referral code</p><p className="mt-1 font-mono text-base font-bold tracking-wider text-ink-900">{referralData.referralCode || '—'}</p></div>
                <div className="rounded-xl border border-[#e8edf6] bg-[#f8fafc] p-4"><p className="text-xs text-ink-500">Referral reward</p><p className="mt-1 font-display text-xl font-extrabold text-ink-900">₹{Number(referralData.rewardAmount || 100)} after first completed booking of ₹{Number(referralData.minimumBookingAmount || 500)}+</p></div>
              </div>
              {referralData.referredBy && <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Referred by</p><p className="mt-1 font-semibold text-ink-900">{referralData.referredBy.name}</p><p className="mt-1 text-xs text-ink-500">Code: {referralData.referredBy.referralCode || '—'}</p></section>}
              <section className="mt-5 overflow-hidden rounded-xl border border-[#e8edf6]"><div className="border-b border-[#edf1f7] px-4 py-3"><h3 className="font-display font-bold text-ink-900">People referred by this user</h3></div>
                {referralData.referrals?.length ? <div className="divide-y divide-[#edf1f7]">{referralData.referrals.map((referral) => <article key={referral.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold text-ink-900">{referral.name}</p><p className="mt-1 text-xs text-ink-500">{referral.email} · {referral.role} · Signed up {referral.signedUpAt ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(referral.signedUpAt)) : '—'}</p><p className={`mt-2 text-xs font-semibold ${referral.progress === 'CLAIMED' ? 'text-emerald-700' : referral.canClaim ? 'text-blue-700' : 'text-ink-500'}`}>{referral.progress === 'CLAIMED' ? '₹100 claimed' : referral.canClaim ? 'Qualifying booking completed · reward ready to claim' : 'Signed up · qualifying booking pending'}</p>{referral.qualifyingBookingAt && <p className="mt-1 text-xs text-ink-500">First qualifying booking ₹{Number(referral.qualifyingBookingAmount).toLocaleString('en-IN')} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(referral.qualifyingBookingAt))}</p>}{referral.claimedAt && <p className="mt-1 text-xs text-ink-500">Claimed {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(referral.claimedAt))}</p>}</div><span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${referral.progress === 'CLAIMED' ? 'bg-emerald-50 text-emerald-700' : referral.canClaim ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{referral.progress === 'CLAIMED' ? 'CLAIMED' : referral.canClaim ? 'ELIGIBLE' : 'SIGNED UP'}</span></article>)}</div> : <p className="px-4 py-10 text-center text-sm text-ink-500">No users have signed up with this referral code yet.</p>}
              </section>
            </>}
          </div>
          <footer className="flex justify-end border-t border-[#edf1f7] px-5 py-3 sm:px-7"><button type="button" onClick={() => setReferralDialogOpen(false)} className="btn-ghost">Close</button></footer>
        </section>
      </div>}
      {pageVisitedOpen && pageVisitedPosition && createPortal(<section className="fixed z-65 max-h-[min(22rem,calc(100dvh-2rem))] overflow-hidden rounded-xl border border-[#e4ebf7] bg-white shadow-2xl" style={{ top: pageVisitedPosition.top, left: pageVisitedPosition.left, width: pageVisitedPosition.width }} aria-label="Pages visited in the latest session">
        <div className="flex items-center justify-between gap-3 border-b border-[#edf1f7] px-4 py-3"><div><h3 className="text-sm font-bold text-ink-900">Pages visited</h3><p className="mt-0.5 text-[11px] text-ink-500">Latest active session</p></div><button type="button" onClick={() => setPageVisitedOpen(false)} className="rounded-lg p-1.5 text-ink-500 hover:bg-[#f4f7fc]" aria-label="Close page history"><X size={15} /></button></div>
        <div className="flex items-center justify-between bg-[#f8faff] px-4 py-2.5"><span className="text-xs font-medium text-ink-500">Time spent on Haango</span><strong className="text-xs text-ink-900">{editingDetailsLoading ? '…' : formatDuration(editing?.lastSessionTimeSpent || 0)}</strong></div>
        <div className="max-h-60 divide-y divide-[#edf1f7] overflow-y-auto">
          {editingDetailsLoading ? <p className="px-4 py-6 text-center text-xs text-ink-500">Loading visit history…</p> : editing?.visitedPages?.length ? editing.visitedPages.map((visit) => <div key={visit.page} className="flex items-start justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="break-all text-xs font-semibold text-ink-800">{visit.page}</p><p className="mt-1 text-[10px] text-ink-400">Last visited {visit.lastVisitedAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(visit.lastVisitedAt)) : '—'}</p></div><span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-blue-700"><Clock3 size={12} />{formatDuration(visit.timeSpent)}</span></div>) : <p className="px-4 py-6 text-center text-xs text-ink-500">No linked page visits for this account yet.</p>}
        </div>
      </section>, document.body)}
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </AdminLayout>
  );
}
