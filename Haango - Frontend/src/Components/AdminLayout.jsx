import { Activity, AlertCircle, BadgeCheck, Check, ClipboardList, Headset, IndianRupee, LayoutDashboard, Mail, MessageCircle, MessageSquareText, Ticket, Users } from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin', Icon: LayoutDashboard },
  { id: 'platform-activity', label: 'Platform activity', path: '/admin/platform-activity', Icon: Activity },
  { id: 'users', label: 'Users', path: '/admin/users', Icon: Users },
  { id: 'buddies', label: 'Buddies', path: '/admin/buddies', Icon: BadgeCheck },
  { id: 'reports', label: 'Reports', path: '/admin/reports', Icon: AlertCircle },
  { id: 'reviews', label: 'Reviews', path: '/admin/reviews', Icon: MessageSquareText },
  { id: 'email', label: 'Email campaigns', path: '/admin/emails', Icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp campaigns', path: '/admin/whatsapp', Icon: MessageCircle },
  { id: 'completed', label: 'Completed', path: '/admin#admin-metrics', Icon: Check },
  { id: 'revenue', label: 'Revenue', path: '/admin#admin-metrics', Icon: IndianRupee },
  { id: 'platform-revenue', label: 'Platform revenue', path: '/admin#admin-metrics', Icon: Activity },
  { id: 'haango-earnings', label: 'Haango earnings', path: '/admin#admin-metrics', Icon: ClipboardList },
  { id: 'coupons', label: 'Manage coupons', path: '/admin/coupons', Icon: Ticket },
  { id: 'support', label: 'Support tickets', path: '/admin/support-requests', Icon: Headset },
];

export default function AdminLayout({ activePage = 'dashboard', onNavigate, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fc] text-ink-900 lg:flex-row">
      <aside className="sticky top-0 z-30 flex w-full shrink-0 items-center gap-3 border-b border-[#e8edf6] bg-white px-3 py-2 lg:h-screen lg:w-60 lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <button onClick={() => onNavigate('/admin')} className="mb-0 flex shrink-0 items-center gap-2 px-2 text-left font-display text-xl font-extrabold text-ink-900 lg:mb-10 lg:text-2xl" aria-label="Haango admin dashboard">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#ff681f] to-blue-600 text-lg font-black text-white">H</span>
          <span>Haang<span className="text-[#ff681f]">o</span></span>
        </button>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto lg:block lg:space-y-1" aria-label="Admin sections">
          {navigationItems.map(({ id, label, path, Icon }) => (
            <button key={id} onClick={() => onNavigate(path)} className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition lg:w-full lg:gap-3 lg:py-3 lg:text-sm ${activePage === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-ink-600 hover:bg-blue-50 hover:text-blue-700'}`} aria-current={activePage === id ? 'page' : undefined}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-2xl bg-[#f3f7ff] p-4 lg:block">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600"><Activity size={18} /></span>
          <p className="font-display text-sm font-bold">Haango</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">More rides. Happier people.</p>
        </div>
      </aside>
      {children}
    </div>
  );
}