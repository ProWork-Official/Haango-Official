import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Components/Navbar';
import BottomNav from './Components/BottomNav';
import Footer from './Components/Footer';
import HomePage from './Pages/HomePage';
import ExplorePage from './Pages/ExplorePage';
import ProfilePage from './Pages/ProfilePage';
import BookingPage from './Pages/BookingPage';
import MessagesPage from './Pages/MessagesPage';
import DashboardPage from './Pages/DashboardPage';
import AdminPage from './Pages/AdminPage';
import FAQSection from './Components/FAQ';
import AuthPage from './Pages/AuthPage';
import ExperiencePage from './Pages/ExperiencePage';
import HowItWorksPage from './Pages/HowItWorksPage';
import SafetyPage from './Pages/SafetyPage';
import AboutPage from './Pages/AboutPage';
import BecomeBuddyPage from './Pages/BecomeBuddyPage';
import BuddyDashboardPage from './Pages/BuddyDashboardPage';
import BookingsPage from './Pages/BookingsPage';
import BuddyBookingsPage from './Pages/BuddyBookingsPage';
import { AuthProvider, useAuth } from './lib/auth';
import { apiRequest } from './lib/api';
import AdminAllUsersPage from './Pages/AdminAllUsersPage';
import AdminCouponsPage from './Pages/AdminCouponsPage';
import ContactPage from './Pages/ContactPage';
import SupportPage from './Pages/SupportPage';
import CommunityGuidelinesPage from './Pages/CommunityGuidelinesPage';
import BuddyGuidelinesPage from './Pages/BuddyGuidelinesPage';
import PrivacyPolicyPage from './Pages/PrivacyPolicyPage';
import TermsPage from './Pages/TermsPage';
import CancellationPolicyPage from './Pages/CancellationPolicyPage';

const protectedPaths = ['/dashboard', '/bookings', '/buddy-bookings', '/messages', '/admin', '/buddy-dashboard'];

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
  if (pathname.startsWith('/booking')) return 'booking';
  if (pathname.startsWith('/messages')) return 'messages';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/bookings')) return 'bookings';
  if (pathname.startsWith('/buddy-bookings')) return 'buddy-bookings';
  if (pathname.startsWith('/become-buddy')) return 'become-buddy';
  if (pathname.startsWith('/buddy-dashboard')) return 'buddy-dashboard';
  if (pathname.startsWith('/experience')) return 'experience';
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

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedBuddy, setSelectedBuddy] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [prevPage, setPrevPage] = useState('/');
  const [pendingAuthPath, setPendingAuthPath] = useState(null);

  useEffect(() => {
    const storageKey = 'haango_visitor_id';
    let visitorId = localStorage.getItem(storageKey);
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, visitorId);
    }
    const startedAt = Date.now();
    const track = () => {
      const timeSpent = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      apiRequest('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({ visitorId, page: location.pathname, timeSpent, referrer: document.referrer }),
      }).catch(() => {});
    };
    window.addEventListener('pagehide', track);
    return () => {
      window.removeEventListener('pagehide', track);
      track();
    };
  }, [location.pathname]);

  const currentPage = getPageKeyFromPath(location.pathname);

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
    if (!loading && !user && protectedPaths.includes(location.pathname)) {
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

  const showFooter = !['/messages'].includes(location.pathname) || !activeConversation;
  const showBottomNav = !['/booking', '/messages', '/login', '/signup'].includes(location.pathname) || (location.pathname === '/messages' && !activeConversation);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf5]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ece3d8] border-t-[#ff7418]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar
        current={currentPage}
        onNavigate={routeNavigate}
        isLoggedIn={!!user}
        userName={profile?.full_name}
        onSignOut={handleSignOut}
      />

      <main>
        <Routes>
          <Route path="/" element={
            <HomePage
              onNavigate={routeNavigate}
              onSelectActivity={selectActivity}
              onSelectBuddy={selectBuddy}
            />
          } />

          <Route path="/explore" element={
            <ExplorePage
              initialActivity={selectedActivity}
              onSelectBuddy={(id) => {
                selectBuddy(id);
                routeNavigate('/profile');
              }}
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
                onSelectBuddy={(id) => {
                  selectBuddy(id);
                  routeNavigate('/profile');
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          <Route path="/bookings" element={
            user ? <BookingsPage onBack={() => routeNavigate('/dashboard')} onMessage={startConversation} /> : <Navigate to="/login" replace />
          } />

          <Route path="/buddy-bookings" element={
            user ? <BuddyBookingsPage onBack={() => routeNavigate('/buddy-dashboard')} onMessage={startConversation} /> : <Navigate to="/login" replace />
          } />

          <Route path="/become-buddy" element={<BecomeBuddyPage onNavigate={routeNavigate} />} />
          <Route path="/buddy-dashboard" element={
            user ? <BuddyDashboardPage onNavigate={routeNavigate} /> : <Navigate to="/login" replace />
          } />

          <Route path="/experience" element={<ExperiencePage onNavigate={routeNavigate} />} />
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

          <Route path="/admin" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role) ? <AdminPage onNavigate={routeNavigate} /> : <Navigate to="/" replace />
          } />
          <Route path="/admin/users" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminAllUsersPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
          } />
          <Route path="/admin/coupons" element={
            ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(profile?.role)
              ? <AdminCouponsPage onNavigate={routeNavigate} />
              : <Navigate to="/" replace />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showFooter && <Footer onNavigate={routeNavigate} />}

      {showBottomNav && <BottomNav current={currentPage} onNavigate={routeNavigate} />}
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
