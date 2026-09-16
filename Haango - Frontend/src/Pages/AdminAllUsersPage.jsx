import { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, Trash2, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import HaangoDialog from '../Components/HaangoDialog';

export default function AdminAllUsersPage({ onNavigate }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await apiRequest(`/admin/users?page=${page}&limit=50&includeAdmins=true`);
      setUsers(Array.isArray(result) ? result : result?.data || []);
      setPagination(result?.pagination || null);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (!active) return;
      setLoading(true);
      try {
        const result = await apiRequest(`/admin/users?page=${page}&limit=50`);
        if (!active) return;
        setUsers(Array.isArray(result) ? result : result?.data || []);
        setPagination(result?.pagination || null);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load users.');
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [page]);

  const saveUser = async (event) => {
    event.preventDefault();
    await apiRequest(`/admin/users/${editing._id}`, { method: 'PATCH', body: JSON.stringify(editing) });
    setEditing(null);
    await loadUsers();
  };

  const deleteUser = async (user) => {
    setDialog({ title: `Delete ${user.name}?`, description: 'This action cannot be undone.', confirmLabel: 'Delete user', tone: 'danger', onConfirm: async () => {
      setDialog(null);
      try { await apiRequest(`/admin/users/${user._id}`, { method: 'DELETE' }); await loadUsers(); } catch (deleteError) { setError(deleteError.message || 'Unable to delete user.'); }
    } });
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-20 pt-16">
      <div className="container-max section-pad py-8">
        <button onClick={() => onNavigate('/admin')} className="btn-ghost mb-6"><ArrowLeft size={16} /> Admin dashboard</button>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="mb-2 inline-flex items-center gap-2 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white"><Users size={14} /> All users</p><h1 className="font-display text-3xl font-extrabold text-ink-900">Every Haango user</h1></div>
          <span className="text-sm text-ink-500">{pagination?.total ?? users.length} users</span>
        </div>
        {error && <p className="mb-4 rounded-xl bg-error-50 p-3 text-sm text-error-600">{error}</p>}
        {loading ? <p>Loading users...</p> : <div className="space-y-3">{users.map((user) => (
          <div key={user._id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{user.name}</p><p className="text-sm text-ink-500">{user.email} · {user.phone} · {user.role}</p></div>
            <button onClick={() => setEditing({ ...user })} className="btn-ghost"><Edit3 size={15} /> Edit</button>
            <button onClick={() => deleteUser(user)} className="rounded-xl p-2 text-error-500"><Trash2 size={16} /></button>
          </div>
        ))}</div>}
        {pagination?.totalPages > 1 && <div className="mt-6 flex gap-3"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="btn-ghost">Previous</button><span className="py-2 text-sm">Page {page} of {pagination.totalPages}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="btn-ghost">Next</button></div>}
      </div>
      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"><form onSubmit={saveUser} className="w-full max-w-lg rounded-3xl bg-white p-6"><h2 className="mb-4 font-display text-xl font-bold">Edit user</h2>{['name', 'email', 'phone', 'city'].map((field) => <label key={field} className="mb-3 block text-sm font-medium capitalize">{field}<input className="input-field mt-1" value={editing[field] || ''} onChange={(event) => setEditing({ ...editing, [field]: event.target.value })} required={field !== 'city'} /></label>)}<div className="flex gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-ghost flex-1">Cancel</button><button className="btn-primary flex-1">Save</button></div></form></div>}
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
    </div>
  );
}
