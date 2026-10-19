import { useEffect, useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const formatDate = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function AdminAdministratorsPage({ onNavigate }) {
  const [administrators, setAdministrators] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadAdministrators = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiRequest(`/admin/administrators?page=${page}&limit=20`, { includeMetadata: true });
        if (!active) return;
        setAdministrators(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination || null);
      } catch (loadError) {
        if (active) {
          setAdministrators([]);
          setPagination(null);
          setError(loadError.message || 'Unable to load admin accounts.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAdministrators();
    return () => { active = false; };
  }, [page]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <AdminLayout activePage="administrators" onNavigate={onNavigate}>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Shield size={22} />
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Admin accounts</h1>
              <p className="mt-1 text-sm text-ink-500">Administrator accounts and, when recorded, the administrator who created each account.</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#e8edf6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e8edf6] px-5 py-4">
              <div>
                <h2 className="font-display font-bold text-ink-900">Administrators</h2>
                <p className="mt-1 text-xs text-ink-500">{pagination?.total ?? 0} accounts visible to your role</p>
              </div>
              <Users size={20} className="text-ink-400" />
            </div>

            {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {loading ? (
              <p className="p-8 text-center text-sm text-ink-500">Loading admin accounts…</p>
            ) : administrators.length === 0 && !error ? (
              <p className="p-8 text-center text-sm text-ink-500">No administrator accounts found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#f8faff] text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Account</th>
                      <th className="px-5 py-3 font-semibold">Role</th>
                      <th className="px-5 py-3 font-semibold">Created by</th>
                      <th className="px-5 py-3 font-semibold">Account created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1f7]">
                    {administrators.map((administrator) => {
                      const creator = administrator.adminCreatedBy;
                      return (
                        <tr key={administrator._id}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-ink-900">{administrator.name}</p>
                            <p className="mt-1 text-ink-500">{administrator.email}</p>
                            {administrator.phone && <p className="mt-1 text-xs text-ink-400">{administrator.phone}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${administrator.role === 'MASTER_ADMIN' ? 'bg-amber-100 text-amber-800' : administrator.role === 'SUPER_ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                              {administrator.role === 'MASTER_ADMIN' ? 'Master admin' : administrator.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
                            </span>
                            <p className="mt-2 text-xs text-ink-500">Level {administrator.adminLevel ?? 0}</p>
                          </td>
                          <td className="px-5 py-4">
                            {creator && typeof creator === 'object' ? (
                              <>
                                <p className="font-medium text-ink-800">{creator.name || 'Unnamed account'}</p>
                                <p className="mt-1 text-ink-500">{creator.email || 'Email unavailable'}</p>
                                <p className="mt-1 text-xs text-ink-400">{creator.role || 'Admin role unavailable'}</p>
                              </>
                            ) : creator ? (
                              <span className="text-ink-500">Creator account unavailable</span>
                            ) : (
                              <span className="text-ink-500">Creator attribution unavailable</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-ink-600">{formatDate(administrator.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#e8edf6] px-5 py-4">
              <span className="text-xs text-ink-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#dce4f0] px-3 py-2 text-xs font-semibold text-ink-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#dce4f0] px-3 py-2 text-xs font-semibold text-ink-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminLayout>
  );
}
