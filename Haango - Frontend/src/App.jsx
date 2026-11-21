import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Navbar from './Components/Navbar';
import BottomNav from './Components/BottomNav';
import Footer from './Components/Footer';
import FAQSection from './Components/FAQ';
import { AuthProvider, useAuth } from './lib/auth';
import { apiRequest } from './lib/api';
import { registerPushSubscription, requestBrowserNotificationPermission, triggerBrowserNotification } from './lib/browserNotifications';
import { shouldTrackPageVisit } from './lib/pageVisitTracking';
import { createBreadcrumbStructuredData, extractIdFromSeoParam, SEO_PAGES, setPageSeo } from './lib/seo';

const HomePage = lazy(() => import('./Pages/HomePage'));
const ExplorePage = lazy(() => import('./Pages/ExplorePage'));
const ProfilePage = lazy(() => import('./Pages/ProfilePage'));
const BookingPage = lazy(() => import('./Pages/BookingPage'));
const MessagesPage = lazy(() => import('./Pages/MessagesPage'));
const DashboardPage = lazy(() => import('./Pages/DashboardPage'));
const ReferralsPage = lazy(() => import('./Pages/ReferralsPage'));
const AdminPage = lazy(() => import('./Pages/AdminPage'));
const AuthPage = lazy(() => import('./Pages/AuthPage'));
const ExperiencePage = lazy(() => import('./Pages/ExperiencePage'));
const HowItWorksPage = lazy(() => import('./Pages/HowItWorksPage'));
const SafetyPage = lazy(() => import('./Pages/SafetyPage'));
const AboutPage = lazy(() => import('./Pages/AboutPage'));
const BecomeBuddyPage = lazy(() => import('./Pages/BecomeBuddyPage'));
const BuddyDashboardPage = lazy(() => import('./Pages/BuddyDashboardPage'));
const BookingsPage = lazy(() => import('./Pages/BookingsPage'));
const BuddyBookingsPage = lazy(() => import('./Pages/BuddyBookingsPage'));
const AdminAllUsersPage = lazy(() => import('./Pages/AdminAllUsersPage'));
const AdminPlatformActivityPage = lazy(() => import('./Pages/AdminPlatformActivityPage'));
const AdminAllBuddiesPage = lazy(() => import('./Pages/AdminAllBuddiesPage'));
const AdminReportsReviewsPage = lazy(() => import('./Pages/AdminReportsReviewsPage'));
const AdminEmailPage = lazy(() => import('./Pages/AdminEmailPage'));
const UnsubscribePage = lazy(() => import('./Pages/UnsubscribePage'));
const AdminWhatsAppPage = lazy(() => import('./Pages/AdminWhatsAppPage'));
const AdminCouponsPage = lazy(() => import('./Pages/AdminCouponsPage'));
const AdminSupportRequestsPage = lazy(() => import('./Pages/AdminSupportRequestsPage'));
const AdminBookingsPage = lazy(() => import('./Pages/AdminBookingsPage'));
const AdminAdministratorsPage = lazy(() => import('./Pages/AdminAdministratorsPage'));
const ContactPage = lazy(() => import('./Pages/ContactPage'));
const SupportPage = lazy(() => import('./Pages/SupportPage'));
const CommunityGuidelinesPage = lazy(() => import('./Pages/CommunityGuidelinesPage'));
const BuddyGuidelinesPage = lazy(() => import('./Pages/BuddyGuidelinesPage'));
const PrivacyPolicyPage = lazy(() => import('./Pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./Pages/TermsPage'));
const CancellationPolicyPage = lazy(() => import('./Pages/CancellationPolicyPage'));
const BlogPage = lazy(() => import('./Pages/BlogPage'));
const AdminBlogsPage = lazy(() => import('./Pages/AdminBlogsPage'));
const NotFoundPage = lazy(() => import('./Pages/NotFoundPage'));

const protectedPaths = ['/dashboard', '/bookings', '/buddy-bookings', '/messages', '/admin', '/buddy-dashboard', '/referrals'];
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5005';

const getRoutePath = (page) => {
  const pathMap = {
    home: '/',
    explore: '/explore',
    profile: '/profile',
    booking: '/booking',
    messages: '/messages',
    dashboard: '/dashboard',
    bookings: '/bookings',
    'buddy-bookings': '/buddy-bookings',
    'become-buddy': '/become-buddy',
    'buddy-dashboard': '/buddy-dashboard',
    experience: '/experience',
    blog: '/blog',
    'how-it-works': '/how-it-works',
    safety: '/safety',
    about: '/about',
    admin: '/admin',
    login: '/login',
    signup: '/signup',
    faq: '/faq',
    contact: '/contact',
    support: '/support',
    'community-guidelines': '/community-guidelines',
    'buddy-guidelines': '/buddy-guidelines',
    'privacy-policy': '/privacy-policy',
    terms: '/terms',
    'cancellation-policy': '/cancellation-policy',
  };

  return pathMap[page] || '/';
};

const getPageKeyFromPath = (pathname) => {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/explore')) return 'explore';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/bookings')) return 'bookings';
  if (pathname.startsWith('/booking')) return 'booking';
  if (pathname.startsWith('/messages')) return 'messages';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/buddy-bookings')) return 'buddy-bookings';
  if (pathname.startsWith('/become-buddy')) return 'become-buddy';
  if (pathname.startsWith('/buddy-dashboard')) return 'buddy-dashboard';
  if (pathname.startsWith('/experience')) return 'experience';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/how-it-works')) return 'how-it-works';
  if (pathname.startsWith('/safety')) return 'safety';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/signup')) return 'signup';
  if (pathname.startsWith('/faq')) return 'faq';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/community-guidelines')) return 'community-guidelines';
  if (pathname.startsWith('/buddy-guidelines')) return 'buddy-guidelines';
  if (pathname.startsWith('/privacy-policy')) return 'privacy-policy';
  if (pathname.startsWith('/terms')) return 'terms';
  if (pathname.startsWith('/cancellation-policy')) return 'cancellation-policy';
  return 'home';
};

function BuddyProfileRoute({
  selectedBuddy,
  prevPage,
  routeNavigate,
  startBooking,
  startConversation,
}) {
  const { buddyParam } = useParams();
  const buddyId = extractIdFromSeoParam(buddyParam) || selectedBuddy;
  if (!buddyId) return <Navigate to="/explore" replace />;
  return (
    <ProfilePage
      buddyId={buddyId}
      onNavigate={routeNavigate}
      onBack={() => routeNavigate(prevPage || '/')}
      onBook={startBooking}
      onMessage={startConversation}
    />
  );
}

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [prevPage, setPrevPage] = useState('/');
  const [pendingAuthPath, setPendingAuthPath] = useState(null);
  const browserNotificationIdsRef = useRef(new Set());
  const visitSessionRef = useRef(null);

  const refreshUnreadCount = () => {
    if (!user) return;

    apiRequest('/messages/conversations')
      .then((data) => {
        if (!Array.isArray(data)) return;
        setMessageUnreadCount(data.reduce((count, conversation) => count + Number(conversation.unreadCount || 0), 0));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (location.pathname !== '/') return undefined;

    requestBrowserNotificationPermission()
      .then((permission) => {
        if (permission === 'granted' && user) {
          return registerPushSubscription(apiRequest);
        }
        return null;
      })
      .catch(() => {
      // Notification permission must never interrupt the normal home-page flow.
      });

    return undefined;
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') return undefined;
    registerPushSubscription(apiRequest).catch(() => {});
    return undefined;
  }, [user, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return undefined;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      reconnection: true,
      auth: { token: localStorage.getItem('haango_access_token') },
    });

    socket.on('connect', () => {
      socket.emit('join-user', String(profile.id));
    });

    socket.on('message:new', () => {
      refreshUnreadCount();
    });

    socket.on('message:read', () => {
      refreshUnreadCount();
    });

    socket.on('notification:new', (notification) => {
      if (!notification || !['BOOKING_CONFIRMED', 'NEW_MESSAGE'].includes(notification.type)) return;

      const notificationId = String(notification._id || notification.id || `${notification.type}-${notification.createdAt}`);
      if (browserNotificationIdsRef.current.has(notificationId)) return;
      browserNotificationIdsRef.current.add(notificationId);

      triggerBrowserNotification({
        title: notification.title,
        body: notification.message,
        tag: notificationId,
      });
      refreshUnreadCount();
    });

    return () => {
      socket.disconnect();
    };
  }, [profile?.id, user]);

  useEffect(() => {
    if (!shouldTrackPageVisit(window.location.hostname, location.pathname)) return undefined;

    const storageKey = 'haango_visitor_id';
    let visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, visitorId);
    }

    const sessionKey = 'haango_visit_session_id';
    const pagesKey = 'haango_visit_session_pages';
    const pageStartedKey = 'haango_visit_session_page_started_at';
    const attributionUrl = new URL(window.location.href);
    const campaignAttributionToken = attributionUrl.searchParams.get('campaign_link') || '';
    if (campaignAttributionToken) {
      attributionUrl.searchParams.delete('campaign_link');
      window.history.replaceState(
        window.history.state,
        '',
        `${attributionUrl.pathname}${attributionUrl.search}${attributionUrl.hash}`,
      );
    }
    const trackedSearch = new URLSearchParams(location.search);
    trackedSearch.delete('campaign_link');
    const trackedQuery = trackedSearch.toString();
    const pagePath = `${location.pathname}${trackedQuery ? `?${trackedQuery}` : ''}`;

    if (!visitSessionRef.current) {
      visitSessionRef.current = sessionStorage.getItem(sessionKey)
        || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem(sessionKey, visitSessionRef.current);
    }

    const existingPages = JSON.parse(sessionStorage.getItem(pagesKey) || '[]');
    const pageHistory = Array.isArray(existingPages) ? existingPages : [];
    const lastPage = pageHistory[pageHistory.length - 1];
    const nextPageEntry = { page: pagePath, timeSpent: 0, timeSpentMs: 0, timestamp: new Date().toISOString() };

    if (!lastPage || lastPage.page !== pagePath) {
      pageHistory.push(nextPageEntry);
      sessionStorage.setItem(pagesKey, JSON.stringify(pageHistory));
    }

    if (!sessionStorage.getItem(pageStartedKey)) {
      sessionStorage.setItem(pageStartedKey, String(Date.now()));
    }

    const visitId = visitSessionRef.current;
    const track = () => {
      const currentPages = JSON.parse(sessionStorage.getItem(pagesKey) || '[]');
      const trackedPages = Array.isArray(currentPages) ? currentPages : [];
      const currentPage = trackedPages[trackedPages.length - 1];
      const pageStartedAt = Number(sessionStorage.getItem(pageStartedKey) || Date.now());
      if (currentPage?.page === pagePath) {
        const previousTimeSpentMs = Number(currentPage.timeSpentMs ?? Number(currentPage.timeSpent || 0) * 1000);
        currentPage.timeSpentMs = previousTimeSpentMs + Math.max(0, Date.now() - pageStartedAt);
        currentPage.timeSpent = Math.round(currentPage.timeSpentMs / 1000);
        sessionStorage.setItem(pagesKey, JSON.stringify(trackedPages));
        sessionStorage.setItem(pageStartedKey, String(Date.now()));
      }
      const timeSpent = Math.round(trackedPages.reduce(
        (total, page) => total + Number(page.timeSpentMs ?? Number(page.timeSpent || 0) * 1000),
        0,
      ) / 1000);

      apiRequest('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({
          visitorId,
          visitId,
          page: pagePath,
          landingUrl: pagePath,
          timeSpent,
          referrer: document.referrer,
          pagesVisited: trackedPages.map(({ page, timestamp, timeSpent: pageTimeSpent }) => ({
            page,
            timestamp,
            timeSpent: pageTimeSpent,
          })),
          userName: profile?.full_name || profile?.name || user?.name || user?.full_name || null,
          ...(campaignAttributionToken ? { campaignAttributionToken } : {}),
        }),
        keepalive: true,
      }).catch(() => {});
    };

    track();

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') track();
    }, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') track();
      else {
        track();
        sessionStorage.removeItem(pageStartedKey);
      }
    };

    let ended = false;
    const endSession = () => {
      if (ended) return;
      ended = true;
      track();
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(pagesKey);
      sessionStorage.removeItem(pageStartedKey);
      visitSessionRef.current = null;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', endSession);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', endSession);
      if (!ended) {
        track();
        sessionStorage.removeItem(pageStartedKey);
      }
    };
  }, [location.pathname, location.search, profile?.full_name, profile?.name, user?.name, user?.full_name]);

  const currentPage = getPageKeyFromPath(location.pathname);
  useEffect(() => {
    const matchedSeo = Object.entries(SEO_PAGES).find(([path]) =>
      path === '/' ? location.pathname === '/' : location.pathname === path,
    )?.[1];

    if (matchedSeo) {
      setPageSeo({
        ...matchedSeo,
        canonicalPath: location.pathname,
        structuredData: createBreadcrumbStructuredData(location.pathname, {
          experience: 'Experiences',
          'how-it-works': 'How It Works',
          'become-buddy': 'Become a Buddy',
          'community-guidelines': 'Community Guidelines',
          'buddy-guidelines': 'Buddy Guidelines',
          'privacy-policy': 'Privacy Policy',
          'cancellation-policy': 'Cancellation Policy',
        }),
      });
    } else if (location.pathname.startsWith('/blog/')) {
      setPageSeo({
        title: 'Haango Blog | Haango',
        description: 'Read the latest article from the Haango community.',
        canonicalPath: location.pathname,
        structuredData: createBreadcrumbStructuredData(location.pathname, { blog: 'Blog' }),
      });
    } else if (location.pathname.startsWith('/buddies/') || location.pathname === '/profile') {
      setPageSeo({
        title: 'Verified Buddy Profiles | Haango',
        description: 'Discover verified Haango buddies and find a companion for your next local outing.',
        robots: 'index,follow',
        canonicalPath: location.pathname,
        structuredData: createBreadcrumbStructuredData(location.pathname, { buddies: 'Buddies' }),
      });
    } else if (protectedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
      || ['/login', '/signup', '/unsubscribe'].includes(location.pathname)
      || location.pathname.startsWith('/admin')) {
      setPageSeo({ title: 'Haango', robots: 'noindex,nofollow', canonicalPath: location.pathname });
    } else {
      setPageSeo({
        title: 'Page Not Found | Haango',
        description: 'The page you requested could not be found.',
        canonicalPath: location.pathname,
        robots: 'noindex,nofollow',
      });
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: `${location.pathname}${location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  const routeNavigate = (next) => {
    const raw = typeof next === 'string' ? next : 'home';
    const target = raw.startsWith('/') ? raw : getRoutePath(raw);
    setPrevPage(location.pathname || '/');
    navigate(target);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!loading && user && profile) {
      if (location.pathname === '/login' || location.pathname === '/signup') {
        const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role);
        const nextPath = pendingAuthPath || (isAdmin ? '/admin' : '/dashboard');
        setPendingAuthPath(null);
        navigate(nextPath, { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, navigate, pendingAuthPath]);

  useEffect(() => {
    if (!loading && !user && protectedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
      navigate('/login', { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  const selectBuddy = (id) => setSelectedBuddy(id);
  const selectActivity = (id) => setSelectedActivity(id);

  const startBooking = (buddyId) => {
    setSelectedBuddy(buddyId);
    routeNavigate(`/booking?buddyId=${encodeURIComponent(buddyId)}`);
  };

  const requireBookingLogin = () => {
    const params = new URLSearchParams(location.search);
    params.set('resume', 'confirm');
    setPendingAuthPath(`/booking?${params.toString()}`);
    navigate('/login');
  };

  const startConversation = (bookingId) => {
    setActiveConversation(String(bookingId));
    routeNavigate('messages');
  };

  const handleAuthSuccess = () => {
    // route redirection is handled by the auth effect above
  };

  const handleSignOut = async () => {
    await signOut();
    routeNavigate('home');
  };

  useEffect(() => {
    if (!user) {
      setMessageUnreadCount(0);
      return undefined;
    }

    let active = true;
    apiRequest('/messages/conversations')
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        const totalUnread = data.reduce((count, conversation) => count + Number(conversation.unreadCount || 0), 0);
        setMessageUnreadCount(totalUnread);
      })
      .catch(() => {
        if (active) setMessageUnreadCount(0);
      });

    return () => {
      active = false;
    };
  }, [user, location.pathname, profile?.id]);

  const showFooter = !['/messages'].includes(location.pathname) || !activeConversation;
  const showBottomNav = !['/booking', '/messages', '/login', '/signup'].includes(location.pathname) || (location.pathname === '/messages' && !activeConversation);
  const isAdminWorkspace = location.pathname.startsWith('/admin');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf5]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ece3d8] border-t-[#ff7418]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {!isAdminWorkspace && <Navbar
        current={currentPage}
        onNavigate={routeNavigate}
        isLoggedIn={!!user}
        userName={profile?.full_name}
        onSignOut={handleSignOut}
      />}

      <main>
        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center" aria-label="Loading page"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ece3d8] border-t-[#ff7418]" /></div>}>
        <Routes>
          <Route path="/" element={
            <>
              <HomePage
                onNavigate={routeNavigate}
                onSelectActivity={selectActivity}
                onSelectBuddy={selectBuddy}
              />
            </>
          } />

          <Route path="/explore" element={
            <ExplorePage
              initialActivity={selectedActivity}
              onSelectBuddy={(id) => {
                selectBuddy(id);
                routeNavigate(`/buddies/${encodeURIComponent(id)}`);
              }}
            />
          } />

          <Route path="/buddies/:buddyParam" element={
            <BuddyProfileRoute
              selectedBuddy={selectedBuddy}
              prevPage={prevPage}
              routeNavigate={routeNavigate}
              startBooking={startBooking}
              startConversation={startConversation}
            />
          } />

          <Route path="/profile" element={
            (selectedBuddy || new URLSearchParams(location.search).get('buddyId')) ? (
              <ProfilePage
                buddyId={selectedBuddy || new URLSearchParams(location.search).get('buddyId')}
                onNavigate={routeNavigate}
                onBack={() => routeNavigate(prevPage || '/')}
                onBook={startBooking}
                onMessage={startConversation}
              />
            ) : (
              <Navigate to="/explore" replace />
            )
          } />

          <Route path="/faq" element={<FAQSection onNavigate={routeNavigate} />} />

          <Route path="/booking" element={
            (selectedBuddy || new URLSearchParams(location.search).get('buddyId')) ? (
              <BookingPage
                buddyId={selectedBuddy || new URLSearchParams(location.search).get('buddyId')}
                onNavigate={routeNavigate}
                onBack={() => routeNavigate('/profile')}
                onMessage={startConversation}
                onRequireLogin={requireBookingLogin}
              />
            ) : (
              <Navigate to="/explore" replace />
            )
          } />

          <Route path="/messages" element={
            <MessagesPage
              activeConversationId={activeConversation}
              onNavigate={routeNavigate}
              onBack={() => {
                setActiveConversation(null);
                routeNavigate('/dashboard');
              }}
            />
          } />

          <Route path="/dashboard" element={
            user ? (
              <DashboardPage
                onNavigate={routeNavigate}
                onMessage={startConversation}
                unreadCount={messageUnreadCount}
                onSelectBuddy={(id) => {
                  selectBuddy(id);
                  routeNavigate(`/buddies/${encodeURIComponent(id)}`);
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="/referrals" element={user ? <ReferralsPage onNavigate={routeNavigate} /> : <Navigate to="/login" replace />} />

          <Route path="/bookings" element={
            user ? <BookingsPage onBack={() => routeNavigate('/dashboard')} onMessage={startConversation} /> : <Navigate to="/login" replace />
          } />

          <Route path="/buddy-bookings" element={
            user && (profile?.role === 'BUDDY' || profile?.is_buddy)
              ? <BuddyBookingsPage onBack={() => routeNavigate('/buddy-dashboard')} onMessage={startConversation} />
              : <Navigate to={user ? '/dashboard' : '/login'} replace />
          } />

          <Route path="/become-buddy" element={<BecomeBuddyPage onNavigate={routeNavigate} />} />
          <Route path="/buddy-dashboard" element={
            user && (profile?.role === 'BUDDY' || profile?.is_buddy)
              ? <BuddyDashboardPage onNavigate={routeNavigate} unreadCount={messageUnreadCount} />
              : <Navigate to={user ? '/dashboard' : '/login'} replace />
          } />

          <Route path="/experience" element={<ExperiencePage onNavigate={routeNavigate} />} />
          <Route path="/blog" element={<BlogPage onNavigate={routeNavigate} />} />
          <Route path="/blog/:id" element={<BlogPage onNavigate={routeNavigate} />} />
          <Route path="/how-it-works" element={<HowItWorksPage onNavigate={routeNavigate} />} />
          <Route path="/safety" element={<SafetyPage onNavigate={routeNavigate} />} />
          <Route path="/about" element={<AboutPage onNavigate={routeNavigate} />} />
          <Route path="/contact" element={<ContactPage onNavigate={routeNavigate} />} />
          <Route path="/support" element={<SupportPage onNavigate={routeNavigate} />} />
          <Route path="/community-guidelines" element={<CommunityGuidelinesPage onNavigate={routeNavigate} />} />
          <Route path="/buddy-guidelines" element={<BuddyGuidelinesPage onNavigate={routeNavigate} />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage onNavigate={routeNavigate} />} />
          <Route path="/terms" element={<TermsPage onNavigate={routeNavigate} />} />
          <Route path="/cancellation-policy" element={<CancellationPolicyPage onNavigate={routeNavigate} />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          <Route path="/admin" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role) ? <AdminPage onNavigate={routeNavigate} /> : <Navigate to="/" replace />
          } />
          <Route path="/admin/users" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminAllUsersPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/bookings" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminBookingsPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/platform-activity" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminPlatformActivityPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/buddies" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminAllBuddiesPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/reports" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminReportsReviewsPage onNavigate={routeNavigate} pageType="reports" />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/reviews" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminReportsReviewsPage onNavigate={routeNavigate} pageType="reviews" />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/emails" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminEmailPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/whatsapp" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminWhatsAppPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/coupons" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminCouponsPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/blogs" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminBlogsPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/support-requests" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminSupportRequestsPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/administrators" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminAdministratorsPage onNavigate={routeNavigate} />
              : <Navigate to="/admin" replace />
          } />

          <Route path="/login" element={
            <AuthPage
              initialMode="login"
              onSuccess={handleAuthSuccess}
              onSwitchMode={() => {}}
              onNavigateHome={() => routeNavigate('home')}
            />
          } />

          <Route path="/signup" element={
            <AuthPage
              initialMode="signup"
              onSuccess={handleAuthSuccess}
              onSwitchMode={() => {}}
              onNavigateHome={() => routeNavigate('home')}
            />
          } />

          <Route path="*" element={<NotFoundPage onNavigate={routeNavigate} />} />
        </Routes>
        </Suspense>
      </main>

      {showFooter && !isAdminWorkspace && <Footer onNavigate={routeNavigate} />}

      {showBottomNav && !isAdminWorkspace && <BottomNav current={currentPage} onNavigate={routeNavigate} unreadCount={messageUnreadCount} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
