import {
  Home,
  Compass,
  CalendarDays,
  MessageCircle,
  User,
} from 'lucide-react';

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'dashboard', label: 'Profile', icon: User },
];

export default function BottomNav({ current, onNavigate, unreadCount = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#f1ece6] bg-white/95 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          const isMessagesItem = item.id === 'messages';
          const hasUnread = isMessagesItem && unreadCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="no-tap relative flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 transition-all duration-200"
            >
              {hasUnread && (
                <span className="absolute right-1 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={`transition-colors duration-200 ${
                  active
                    ? 'text-[#ff7418]'
                    : 'text-[#a3b0c4]'
                }`}
              />

              <span
                className={`text-[10px] font-display font-semibold transition-colors duration-200 ${
                  active
                    ? 'text-[#ff7418]'
                    : 'text-[#a3b0c4]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
