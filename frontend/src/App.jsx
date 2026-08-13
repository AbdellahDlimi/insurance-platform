import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Scale } from 'lucide-react';
import './index.css';

import { api } from './api.js';
import { Btn } from './ui.jsx';
import { Navbar, Footer } from './layout.jsx';
import { LandingPage }       from './pages/Landing.jsx';
import { AuthPage }          from './pages/Auth.jsx';
import { DashboardPage }     from './pages/Dashboard.jsx';
import { KYCPage }           from './pages/KYC.jsx';
import { GroupsExplorer }    from './pages/Groups.jsx';
import { GroupDetails }      from './pages/GroupDetails.jsx';
import { KYCAdmin }          from './pages/KYCAdmin.jsx';
import { AdminDashboard }    from './pages/AdminDashboard.jsx';
import { ClaimsPage, DeclareClaimPage } from './pages/Claims.jsx';
import { OnboardingPage }    from './pages/Onboarding.jsx';
import { HowItWorksPage }   from './pages/HowItWorks.jsx';
import { FeaturesPage }     from './pages/Features.jsx';
import { ProfilePage }      from './pages/Profile.jsx';
import { PaymentSuccess }   from './pages/PaymentSuccess.jsx';
import { PaymentCancel }    from './pages/PaymentCancel.jsx';
import { StripeCheckout }   from './pages/StripeCheckout.jsx';
/* ── Placeholder for future modules ── */
const ComingSoon = ({ navigate }) => (
  <div style={{
    minHeight: '100vh', paddingTop: '6rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
    textAlign: 'center',
  }}>
    <Scale size={40} color="rgba(200,169,110,0.2)" />
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', color: 'var(--paper)', fontWeight: 400 }}>
      Module en <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>construction</em>
    </h2>
    <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300 }}>Partie du sprint suivant.</p>
    <Btn variant="ghost" onClick={() => navigate('/dashboard')}>← Retour</Btn>
  </div>
);

/* ── Not Found ── */
const NotFound = ({ navigate }) => (
  <div style={{
    minHeight: '100vh', paddingTop: '6rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
    textAlign: 'center',
  }}>
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 'clamp(5rem, 15vw, 10rem)', fontWeight: 900,
      color: 'rgba(200,169,110,0.08)', lineHeight: 1, letterSpacing: '-0.05em',
      fontVariationSettings: '"opsz" 144',
    }}>
      404
    </div>
    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--paper)', marginTop: '-1rem' }}>Page introuvable</p>
    <Btn variant="primary" onClick={() => navigate('/')}>Retour à l'accueil</Btn>
  </div>
);

/* ── Root App ── */
export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);
  const [user, setUser]               = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  /* Restore session */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    api.getMe()
      .then(async (userData) => {
        const [kyc, onboarding] = await Promise.all([
          api.getKycStatus().catch(() => ({ statut_verification: 'none' })),
          api.getOnboarding().catch(() => ({ onboarding_complete: false })),
        ]);
        setUser({
          ...userData,
          kyc_status:          kyc.statut_verification,
          onboarding_complete: onboarding.onboarding_complete,
        });
        // Charger le compteur de demandes en attente pour les admins
        if (userData.role === 'admin_groupe') {
          api.getAdminPendingRequests().then(reqs => setPendingCount(reqs.length)).catch(() => {});
        }
        
        // Respect the current URL if it's a payment callback from Stripe
        const browserPath = window.location.pathname;
        const isPaymentCallback = browserPath.startsWith('/payment/') || browserPath.startsWith('/stripe-checkout');
        
        if (isPaymentCallback) {
          setCurrentPath(browserPath + window.location.search);
        } else if (userData.role === 'admin_plateforme') {
          setCurrentPath('/admin/dashboard');
        } else {
          setCurrentPath(onboarding.onboarding_complete ? '/dashboard' : '/onboarding');
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      });
  }, []);

  const navigate = (path) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPath(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/');
  };

  /* Route guard + rendering */
  const renderRoute = () => {
    const PROTECTED = ['/dashboard', '/kyc', '/claims', '/claims/new', '/groups', '/onboarding', '/profile', '/admin/dashboard', '/admin/kyc', '/stripe-checkout'];
    
    // Strip query params and hash fragments for route matching
    const basePath = currentPath.split('?')[0].split('#')[0];

    if (PROTECTED.includes(basePath) && !user) {
      return <AuthPage type="login" navigate={navigate} user={user} setUser={setUser} />;
    }
    if (user && user.role !== 'admin_plateforme' && !user.onboarding_complete && basePath !== '/onboarding' && !basePath.startsWith('/payment/') && !basePath.startsWith('/stripe-checkout')) {
      return <OnboardingPage navigate={navigate} user={user} setUser={setUser} />;
    }
    if (basePath.startsWith('/groups/')) {
      const groupId = basePath.split('/groups/')[1];
      return <GroupDetails navigate={navigate} user={user} groupId={groupId} />;
    }

    switch (basePath) {
      case '/':
        if (user) return user.onboarding_complete ? <DashboardPage user={user} navigate={navigate} /> : <OnboardingPage navigate={navigate} user={user} setUser={setUser} />;
        return <LandingPage navigate={navigate} />;
      case '/login':         return <AuthPage type="login"     navigate={navigate} user={user} setUser={setUser} />;
      case '/register':      return <AuthPage type="register"  navigate={navigate} user={user} setUser={setUser} />;
      case '/onboarding':    return <OnboardingPage navigate={navigate} user={user} setUser={setUser} />;
      case '/dashboard':     return <DashboardPage  user={user} navigate={navigate} />;
      case '/kyc':           return <KYCPage navigate={navigate} />;
      case '/admin/dashboard': return <AdminDashboard navigate={navigate} user={user} />;
      case '/admin/kyc':     return <KYCAdmin navigate={navigate} user={user} />;
      case '/groups':        return <GroupsExplorer navigate={navigate} />;
      case '/claims':        return <ClaimsPage navigate={navigate} />;
      case '/claims/new':    return <DeclareClaimPage navigate={navigate} />;
      case '/profile':       return <ProfilePage user={user} navigate={navigate} setUser={setUser} />;
      case '/how-it-works':  return <HowItWorksPage navigate={navigate} />;
      case '/features':      return <FeaturesPage navigate={navigate} />;
      case '/payment/success': return <PaymentSuccess navigate={navigate} />;
      case '/payment/cancel':  return <PaymentCancel navigate={navigate} />;
      case '/stripe-checkout': return <StripeCheckout navigate={navigate} />;
      case '/notifications':
      case '/cotisations':
      case '/audit':         return <ComingSoon navigate={navigate} />;
      default:               return <NotFound navigate={navigate} />;
    }
  };

  const hideFooter = ['/login', '/register'].includes(currentPath);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--paper)', overflowX: 'hidden' }}>
      <Navbar currentPath={currentPath} navigate={navigate} user={user} logout={handleLogout} pendingCount={pendingCount} />

      <main style={{ minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          <React.Fragment key={currentPath}>
            {renderRoute()}
          </React.Fragment>
        </AnimatePresence>
      </main>

      {!hideFooter && <Footer navigate={navigate} />}
    </div>
  );
}