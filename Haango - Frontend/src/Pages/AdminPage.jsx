import { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, Calendar, Check, Edit3, IndianRupee, Save, Shield, Trash2, Users, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import HaangoDialog from '../Components/HaangoDialog';

const currency = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const unwrap = (value) => value?.data ?? value ?? {};
const unwrapList = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : (Array.isArray(result?.data) ? result.data : []);
};
const unwrapArray = (value) => {
  const result = unwrap(value);
  return Array.isArray(result) ? result : [];
};
const unwrapDashboard = (value) => {
  const result = unwrap(value);
  return result?.stats ?? result;
};
const optionalRequest = (path) => apiRequest(path).catch(() => null);

export default function AdminPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [featuredBuddyIds, setFeaturedBuddyIds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [buddyEditing, setBuddyEditing] = useState(null);
  const [analytics, setAnalytics] = useState({ daily: null, trend: [], pages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboard, usersData, adminUsersData, buddiesData, featuredData, bookingsData, reportsData, reviewsData, cancellationsData, daily, trend, pages] = await Promise.all([
        apiRequest('/admin/dashboard'),
        apiRequest('/admin/users?limit=50'),
        apiRequest('/admin/admin-users?limit=50'),
        apiRequest('/admin/buddies?limit=50'),
        optionalRequest('/admin/featured-buddies'),
        apiRequest('/bookings/admin/all?limit=50'),
        apiRequest('/admin/reports?limit=50'),
        optionalRequest('/admin/reviews?limit=50'),
        apiRequest('/admin/cancellation-requests'),
        apiRequest('/analytics/daily-traffic'),
        apiRequest('/analytics/traffic-trend?days=7'),
        apiRequest('/analytics/popular-pages?days=7'),
      ]);
      setStats(unwrapDashboard(dashboard));
      setUsers(unwrapList(usersData));
      setAdminUsers(unwrapList(adminUsersData));
      setBuddies(unwrapList(buddiesData));
      setFeaturedBuddyIds(unwrap(featuredData)?.pinnedBuddyIds || []);
      setBookings(unwrapList(bookingsData));
      setReports(unwrapList(reportsData));
      setReviews(unwrapList(reviewsData));
      setCancellationRequests(unwrapList(cancellationsData));
      setAnalytics({ daily: unwrap(daily), trend: unwrapArray(trend), pages: unwrapArray(pages) });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboard, usersData, adminUsersData, buddiesData, featuredData, bookingsData, reportsData, reviewsData, cancellationsData, daily, trend, pages] = await Promise.all([
          apiRequest('/admin/dashboard'),
          apiRequest('/admin/users?limit=50'),
          apiRequest('/admin/admin-users?limit=50'),
          apiRequest('/admin/buddies?limit=50'),
          optionalRequest('/admin/featured-buddies'),
          apiRequest('/bookings/admin/all?limit=50'),
          apiRequest('/admin/reports?limit=50'),
          optionalRequest('/admin/reviews?limit=50'),
          apiRequest('/admin/cancellation-requests'),
          apiRequest('/analytics/daily-traffic'),
          apiRequest('/analytics/traffic-trend?days=7'),
          apiRequest('/analytics/popular-pages?days=7'),
        ]);
        if (!active) return;
        setStats(unwrapDashboard(dashboard));
        setUsers(unwrapList(usersData));
        setAdminUsers(unwrapList(adminUsersData));
        setBuddies(unwrapList(buddiesData));
        setFeaturedBuddyIds(unwrap(featuredData)?.pinnedBuddyIds || []);
        setBookings(unwrapList(bookingsData));
        setReports(unwrapList(reportsData));
        setReviews(unwrapList(reviewsData));
        setCancellationRequests(unwrapList(cancellationsData));
        setAnalytics({ daily: unwrap(daily), trend: unwrapArray(trend), pages: unwrapArray(pages) });
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load admin data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    apiRequest('/admin/audit-logs?limit=25')
      .then((data) => setAuditLogs(unwrapList(data)))
      .catch(() => {});
  }, []);

  const updateUser = async (event) => {
    event.preventDefault();
    try {
      await apiRequest(`/admin/users/${editing._id}`, { method: 'PATCH', body: JSON.stringify(editing) });
      setEditing(null);
      await loadData();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update user.');
    }
  };

  const updateBuddy = async (event) => {
    event.preventDefault();
    try {
      await apiRequest(`/admin/buddies/${buddyEditing._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: buddyEditing.displayName,
          age: Number(buddyEditing.age),
          city: buddyEditing.city,
          hourlyRate: Number(buddyEditing.hourlyRate),
          about: buddyEditing.about,
          summary: buddyEditing.summary,
          user: {
            name: buddyEditing.userId?.name,
            email: buddyEditing.userId?.email,
            phone: buddyEditing.userId?.phone,
          },
        }),
      });
      setBuddyEditing(null);
      await loadData();
    } catch (updateError) {
      setError(updateError.message || 'Unable to update buddy.');
    }
  };

  const deleteUser = async (user) => {
    setDialog({ title: `Delete ${user.name}?`, description: 'This removes their profile, bookings, and reports.', confirmLabel: 'Delete user', tone: 'danger', onConfirm: async () => {
      setDialog(null);
      try { await apiRequest(`/admin/users/${user._id}`, { method: 'DELETE' }); await loadData(); } catch (deleteError) { setError(deleteError.message || 'Unable to delete user.'); }
    } });
  };

  const setBuddyStatus = async (buddy, action) => {
    try {
      await apiRequest(`/admin/buddies/${buddy._id}/${action}`, { method: 'PATCH' });
      await loadData();
    } catch (statusError) {
      setError(statusError.message || 'Unable to update buddy.');
    }
  };

  const unsuspendBuddy = async (buddy) => {
    try {
      await apiRequest(`/admin/buddies/${buddy._id}/unsuspend`, { method: 'PATCH' });
      await loadData();
    } catch (unsuspendError) {
      setError(unsuspendError.message || 'Unable to unsuspend buddy.');
    }
  };

  const toggleFeaturedBuddy = async (buddy) => {
    const buddyId = buddy._id || buddy.id;
    const isFeatured = featuredBuddyIds.includes(buddyId);
    try {
      const response = await apiRequest(`/admin/buddies/${buddyId}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured: !isFeatured }),
      });
      setFeaturedBuddyIds(unwrap(response)?.pinnedBuddyIds || []);
    } catch (featureError) {
      setError(featureError.message || 'Unable to update featured companion.');
    }
  };

  const updateReport = async (report, status) => {
    try {
      await apiRequest(`/admin/reports/${report._id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData();
    } catch (reportError) {
      setError(reportError.message || 'Unable to update report.');
    }
  };

  const deleteReview = async (review) => {
    setDialog({ title: 'Delete this review?', description: 'The companion rating will be recalculated after deletion.', confirmLabel: 'Delete review', tone: 'danger', onConfirm: async () => {
      setDialog(null);
      try { await apiRequest(`/admin/reviews/${review._id}`, { method: 'DELETE' }); await loadData(); } catch (deleteError) { setError(deleteError.message || 'Unable to delete review.'); }
    } });
  };

  const reviewCancellation = async (request, status) => {
    try {
      await apiRequest(`/admin/cancellation-requests/${request._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes: status === 'APPROVED' ? 'Approved by admin' : '' }),
      });
      await loadData();
    } catch (reviewError) { setError(reviewError.message || 'Unable to review cancellation request.'); }
  };

  const promoteToAdmin = async (userId) => {
    try {
      await apiRequest(`/admin/users/${userId}/promote-to-admin`, { method: 'POST', body: JSON.stringify({ userId }) });
      await loadData();
    } catch (promoteError) {
      setError(promoteError.message || 'Unable to promote user to admin.');
    }
  };

  const promoteToSuperAdmin = async (userId) => {
    try {
      await apiRequest(`/admin/users/${userId}/promote-to-super-admin`, { method: 'POST', body: JSON.stringify({ userId }) });
      await loadData();
    } catch (promoteError) {
      setError(promoteError.message || 'Unable to promote user to super admin.');
    }
  };

  const demoteFromAdmin = async (userId) => {
    setDialog({ title: 'Demote this administrator?', description: 'The user will move down one administrative level.', confirmLabel: 'Demote', tone: 'danger', onConfirm: async () => {
      setDialog(null);
      try { await apiRequest(`/admin/users/${userId}/demote-from-admin`, { method: 'POST', body: JSON.stringify({ userId }) }); await loadData(); } catch (demoteError) { setError(demoteError.message || 'Unable to demote user.'); }
    } });
  };

  const getRoleLabel = (role) => {
    if (role === 'MASTER_ADMIN') return '👑 Master Admin';
    if (role === 'SUPER_ADMIN') return '⭐ Super Admin';
    if (role === 'ADMIN') return '🛡️ Admin';
    return 'User';
  };

  const getBuddyStatusButton = (buddy) => {
    const status = buddy?.verificationStatus?.trim?.() || buddy?.verificationStatus || 'UNKNOWN';
    
    if (status === 'PENDING') {
      return (
        <button 
          onClick={() => setBuddyStatus(buddy, 'verify')} 
          className="rounded-xl bg-success-500 px-3 py-2 text-xs font-semibold text-white hover:bg-success-600"
        >
          Verify
        </button>
      );
    }
    if (status === 'VERIFIED') {
      return (
        <button 
          onClick={() => setBuddyStatus(buddy, 'suspend')} 
          className="rounded-xl bg-error-50 px-3 py-2 text-xs font-semibold text-error-600 hover:bg-error-100"
        >
          Suspend
        </button>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <button 
          onClick={() => unsuspendBuddy(buddy)} 
          className="rounded-xl bg-success-500 px-3 py-2 text-xs font-semibold text-black hover:bg-green-600"
        >
          Approve
        </button>
      );
    }
    return null;
  };

  const metrics = [
    ['Users', stats?.totalUsers, Users],
    ['Admins', stats?.totalAdmins, Shield],
    ['Buddies', stats?.totalBuddies, BadgeCheck],
    ['Bookings', stats?.totalBookings, Calendar],
    ['Completed', stats?.completedBookings, Check],
    ['Revenue', currency(stats?.totalRevenue), IndianRupee],
    ['Platform revenue', currency(stats?.platformRevenue), Shield],
    ['Haango earnings', currency(stats?.haangoEarnings), IndianRupee],
  ];

  return (
    <div className="min-h-screen bg-ink-50 pb-20 pt-16 md:pt-18">
      <div className="border-b border-ink-100 bg-white"><div className="container-max section-pad flex items-center justify-between gap-4 py-6"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white"><Shield size={14} /> Admin Dashboard</div><h1 className="font-display text-3xl font-extrabold text-ink-900">Haango Operations</h1></div><div className="flex items-center gap-2"><button onClick={() => onNavigate('/admin/coupons')} className="btn-secondary">Manage coupons</button><button onClick={() => onNavigate('home')} className="btn-ghost">Back to Haango</button></div></div></div>
      <div className="container-max section-pad py-8">
        {error && <p className="mb-6 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}
        {loading ? <p className="text-ink-500">Loading live admin data...</p> : <>
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{metrics.map(([label, value, Icon]) => <div key={label} className="card p-4"><Icon size={18} className="mb-3 text-coral-500" /><p className="font-display text-xl font-extrabold text-ink-900">{value ?? 0}</p><p className="text-xs text-ink-400">{label}</p></div>)}</div>
          <section className="card mb-8 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-ink-900">Cancellation requests</h2><p className="text-sm text-ink-500">Requests submitted after the call unlock window.</p></div><span className="text-xs text-ink-400">{cancellationRequests.filter((item) => item.status === 'PENDING').length} pending</span></div>{cancellationRequests.length ? <div className="space-y-3">{cancellationRequests.map((request) => <div key={request._id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink-50 p-4"><div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{request.reason} · {request.bookingId?.bookingId || 'Booking'}</p><p className="text-xs text-ink-500">{request.requesterId?.name || 'User'} · {request.details || 'No additional details'} · {request.status}</p></div>{request.status === 'PENDING' && <div className="flex gap-2"><button onClick={() => reviewCancellation(request, 'APPROVED')} className="rounded-xl bg-success-500 px-3 py-2 text-xs font-semibold text-white">Approve</button><button onClick={() => reviewCancellation(request, 'REJECTED')} className="rounded-xl bg-error-50 px-3 py-2 text-xs font-semibold text-error-600">Reject</button><button onClick={() => reviewCancellation(request, 'CANCELLED')} className="rounded-xl bg-ink-200 px-3 py-2 text-xs font-semibold text-ink-700">Cancel request</button></div>}</div>)}</div> : <p className="text-sm text-ink-500">No cancellation requests.</p>}</section>
          <section className="card mb-8 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-ink-900">Website analytics</h2><p className="text-sm text-ink-500">Traffic and engagement tracked by Haango.</p></div><span className="text-xs text-ink-500">Today</span></div><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-ink-50 p-4"><p className="text-2xl font-bold">{analytics.daily?.totalVisits || 0}</p><p className="text-xs text-ink-500">Page visits</p></div><div className="rounded-2xl bg-ink-50 p-4"><p className="text-2xl font-bold">{analytics.daily?.uniqueUsers || 0}</p><p className="text-xs text-ink-500">Unique visitors</p></div><div className="rounded-2xl bg-ink-50 p-4"><p className="text-2xl font-bold">{Math.round((analytics.daily?.totalTimeSpent || 0) / 60)}m</p><p className="text-xs text-ink-500">Time spent</p></div><div className="rounded-2xl bg-ink-50 p-4"><p className="text-2xl font-bold">{Math.round(analytics.daily?.avgTimePerVisit || 0)}s</p><p className="text-xs text-ink-500">Average visit</p></div></div><div className="mt-5 grid gap-6 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">Last 7 days</h3>{analytics.trend.map((item) => <div key={item.date} className="flex justify-between border-b border-ink-100 py-2 text-sm"><span>{item.date}</span><span>{item.visits} visits · {Math.round(item.avgTimeSpent || 0)}s avg</span></div>)}</div><div><h3 className="mb-2 text-sm font-semibold">Popular pages</h3>{analytics.pages.map((item) => <div key={item.page} className="flex justify-between border-b border-ink-100 py-2 text-sm"><span className="truncate">{item.page}</span><span>{item.visits}</span></div>)}</div></div></section>
          <section className="card mb-8 p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-ink-900">Admin audit log</h2><p className="text-sm text-ink-500">Append-only record of privileged operational decisions.</p></div><span className="text-xs text-ink-400">{auditLogs.length} recent</span></div>{auditLogs.length ? <div className="space-y-2">{auditLogs.map((log) => <div key={log._id} className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-3 text-sm"><span className="font-semibold text-ink-900">{log.action}</span><span className="text-ink-500">{log.actorId?.name || log.actorRole} · {log.targetType}</span><time className="ml-auto text-xs text-ink-400">{new Date(log.createdAt).toLocaleString()}</time></div>)}</div> : <p className="text-sm text-ink-500">No audit entries yet.</p>}</section>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-900">Admin Management</h2><span className="text-xs text-ink-400">{adminUsers.length} admins</span></div><div className="space-y-3">{adminUsers.map((admin) => <div key={admin._id} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3"><div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{admin.name}</p><p className="text-xs text-ink-500">{getRoleLabel(admin.role, admin.adminLevel)}</p></div><div className="flex gap-1">{admin.role === 'ADMIN' && <button onClick={() => promoteToSuperAdmin(admin._id)} className="rounded-lg bg-success-50 px-2 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100">Promote to Super</button>}{(admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN') && <button onClick={() => demoteFromAdmin(admin._id)} className="rounded-lg bg-error-50 px-2 py-1.5 text-xs font-semibold text-error-600 hover:bg-error-100">Demote</button>}</div></div>)}</div></section>
            <section className="card p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-bold text-ink-900">Users</h2><span className="text-xs text-ink-400">{users.length} loaded</span></div>{users.length > 3 && <button onClick={() => onNavigate('/admin/users')} className="btn-ghost text-xs">View all users</button>}</div><div className="space-y-3">{users.slice(0, 3).map((user) => <div key={user._id} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3"><div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{user.name}</p><p className="truncate text-xs text-ink-500">{user.email} · {user.phone} · {user.role}</p></div><button onClick={() => setEditing({ ...user })} className="p-2 text-ink-500 hover:text-coral-600"><Edit3 size={16} /></button><button onClick={() => deleteUser(user)} className="p-2 text-error-500"><Trash2 size={16} /></button><button onClick={() => promoteToAdmin(user._id)} className="rounded-lg bg-success-50 px-2 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100">Make Admin</button></div>)}</div></section>
            <section className="card p-6">
              <h2 className="mb-4 font-display text-xl font-bold text-ink-900">Buddy verification</h2>
              <div className="space-y-3">
                {buddies.length > 0 ? (
                  buddies.map((buddy) => (
                    <div key={buddy._id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">{buddy.displayName || 'Buddy'}</p>
                        <p className="text-xs text-ink-500">{buddy.city} · {buddy.verificationStatus || 'NO_STATUS'}</p>
                        <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
                      </div>
                      <div className="flex gap-2">
                      {buddy.verificationStatus === 'VERIFIED' && buddy.isAvailable !== false && buddy.showOnFindCompanions !== false && buddy.profileCompletion === 100 && (
                        <button onClick={() => toggleFeaturedBuddy(buddy)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${featuredBuddyIds.includes(buddy._id) ? 'bg-coral-500 text-white' : 'bg-coral-50 text-coral-700'}`}>
                          {featuredBuddyIds.includes(buddy._id) ? 'Featured' : 'Feature'}
                        </button>
                      )}
                      <button onClick={() => setBuddyEditing({ ...buddy, userId: typeof buddy.userId === 'object' ? buddy.userId : {} })} className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-semibold text-ink-700">Edit</button>
                      {getBuddyStatusButton(buddy)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">No buddy profiles found.</p>
                )}
              </div>
            </section>
            <section className="card p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-900">Reviews</h2><span className="text-xs text-ink-400">{reviews.length} loaded</span></div><div className="space-y-3">{reviews.length ? reviews.map((review) => <div key={review._id} className="rounded-2xl bg-ink-50 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-ink-900">{review.buddyId?.name || 'Companion'} · {review.rating}/5</p><p className="text-xs text-ink-500">{review.customerId?.name || 'User'} · {review.comment || 'No comment'}</p></div><button onClick={() => deleteReview(review)} className="p-2 text-error-500" aria-label="Delete review"><Trash2 size={16} /></button></div></div>) : <p className="text-sm text-ink-500">No reviews found.</p>}</div></section>
            <section className="card p-6"><h2 className="mb-4 font-display text-xl font-bold text-ink-900">Recent bookings</h2><div className="space-y-3">{bookings.slice(0, 10).map((booking) => <div key={booking._id} className="flex items-center justify-between rounded-2xl bg-ink-50 p-3 text-sm"><span className="font-semibold text-ink-800">{booking.bookingId}</span><span className="text-ink-500">{booking.bookingStatus} · {currency(booking.totalAmount)}</span></div>)}</div></section>
            <section className="card p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-900">Reports</h2><AlertCircle size={18} className="text-error-500" /></div><div className="space-y-3">{reports.length ? reports.map((report) => <div key={report._id} className="rounded-2xl bg-ink-50 p-3"><p className="font-semibold text-ink-900">{report.reason}</p><p className="text-xs text-ink-500">{report.reporterId?.name || 'User'} reported {report.reportedUserId?.name || 'user'} · {report.status}</p><div className="mt-3 flex gap-2"><button onClick={() => updateReport(report, 'REVIEWED')} className="rounded-xl bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700">Mark reviewed</button><button onClick={() => updateReport(report, 'RESOLVED')} className="rounded-xl bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700">Resolve</button></div></div>) : <p className="text-sm text-ink-500">No reports found.</p>}</div></section>
          </div>
        </>}
      </div>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"><form onSubmit={updateUser} className="w-full max-w-lg rounded-3xl bg-white p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-900">Edit user</h2><button type="button" onClick={() => setEditing(null)}><X size={20} /></button></div><div className="grid gap-4 sm:grid-cols-2">{['name', 'email', 'phone', 'city'].map((field) => <label key={field} className="text-sm font-medium capitalize text-ink-700">{field}<input className="input-field mt-1" value={editing[field] || ''} onChange={(event) => setEditing({ ...editing, [field]: event.target.value })} required={field !== 'city'} /></label>)}</div><label className="mt-4 block text-sm font-medium text-ink-700">Address<textarea className="input-field mt-1" value={editing.address || ''} onChange={(event) => setEditing({ ...editing, address: event.target.value })} /></label><button className="btn-primary mt-5 w-full"><Save size={16} /> Save changes</button></form></div>}
      {buddyEditing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"><form onSubmit={updateBuddy} className="w-full max-w-lg rounded-3xl bg-white p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-ink-900">Edit buddy</h2><button type="button" onClick={() => setBuddyEditing(null)}><X size={20} /></button></div><div className="grid gap-4 sm:grid-cols-2">{['displayName', 'age', 'city', 'hourlyRate'].map((field) => <label key={field} className="text-sm font-medium capitalize text-ink-700">{field}<input className="input-field mt-1" value={buddyEditing[field] || ''} onChange={(event) => setBuddyEditing({ ...buddyEditing, [field]: event.target.value })} required /></label>)}</div><label className="mt-4 block text-sm font-medium text-ink-700">About<textarea className="input-field mt-1" value={buddyEditing.about || ''} onChange={(event) => setBuddyEditing({ ...buddyEditing, about: event.target.value })} /></label><button className="btn-primary mt-5 w-full"><Save size={16} /> Save buddy changes</button></form></div>}
    </div>
  );
}
