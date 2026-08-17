import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { api } from '../api.js';
import { pageVariants, Btn, Field, AlertBanner, DisplayItalic } from '../ui.jsx';

export const AuthPage = ({ type, navigate, user, setUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isLogin = type === 'login';

  useEffect(() => {
    if (user) {
      if (user.role === 'admin_plateforme') {
        navigate('/admin/dashboard');
      } else {
        navigate(user.onboarding_complete ? '/dashboard' : '/onboarding');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const password = fd.get('password');
    const pseudonyme = fd.get('pseudonyme') || '';
    try {
      if (isLogin) {
        const res = await api.login(email, password);
        const [kyc, onboarding] = await Promise.all([
          api.getKycStatus().catch(() => ({ statut_verification: 'none' })),
          api.getOnboarding().catch(() => ({ onboarding_complete: false })),
        ]);
        const isAdmin = res.user.role === 'admin_plateforme';
        setUser({
          ...res.user,
          kyc_status: kyc.statut_verification,
          onboarding_complete: onboarding.onboarding_complete,
        });
        if (isAdmin) {
          navigate('/admin/dashboard');
        } else {
          navigate(onboarding.onboarding_complete ? '/dashboard' : '/onboarding');
        }
      } else {
        await api.register(email, password, pseudonyme);
        const res = await api.login(email, password);
        setUser({ ...res.user, kyc_status: 'none', onboarding_complete: false });
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageVariants} className="auth-page-container" style={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left form panel ── */}
      <div className="auth-panel-left" style={{ width: '100%', maxWidth: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(2rem, 5vw, 4rem)', paddingTop: '7rem' }}>
        <div style={{ width: '100%' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <img src="/icone.png" alt="TrustPool" style={{ height: '2rem', width: 'auto', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--paper-dim)', fontSize: '0.875rem' }}>TrustPool</span>
          </button>

          <p className="text-label" style={{ marginBottom: '0.75rem' }}>{isLogin ? 'Connexion' : 'Inscription'}</p>
          <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
            {isLogin ? 'Bon retour,' : 'Créer un compte,'}
          </h1>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem' }}>
            {isLogin ? 'Connectez-vous pour accéder à vos groupes.' : 'Rejoignez la révolution de l\'assurance P2P.'}
          </p>

          {error && <div style={{ marginBottom: '1.25rem' }}><AlertBanner type="error">{error}</AlertBanner></div>}

          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={(e) => { e.preventDefault(); alert("Pour activer Google Sign-In, vous devez configurer un Client ID dans Google Cloud Console et installer @react-oauth/google."); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                background: '#ffffff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                padding: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              {isLogin ? 'Se connecter avec Google' : "S'inscrire avec Google"}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--ink-90)', borderBottom: '1px solid var(--gold-line)' }}></div>
            <span style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ou avec email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--ink-90)', borderBottom: '1px solid var(--gold-line)' }}></div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!isLogin && (
              <Field label="Pseudonyme" name="pseudonyme" type="text" placeholder="Gamer123" required />
            )}
            <Field label="Email" name="email" type="email" placeholder="votre@email.com" required />
            <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" required />
            <Btn type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {isLogin ? 'Se connecter' : 'S\'inscrire'}
            </Btn>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--paper-dim)' }}>
            {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}
            {' '}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', textDecoration: 'underline', fontSize: 'inherit' }}
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>

      {/* ── Right decorative panel ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--ink-90)',
      }} className="auth-panel-right">
        {/* KMS Security Presentation Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
          aria-label="Présentation de la sécurité KMS TrustPool"
        >
          <source src="/TITRE_TrustPool_—_Connexion.mp4" type="video/mp4" />
          Votre navigateur ne prend pas en charge la lecture de cette vidéo.
        </video>

        {/* Dark / translucent overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(12, 12, 12, 0.4)',
          zIndex: 1,
        }} />

        {/* Content card */}
        <div className="auth-content-card" style={{
          position: 'absolute',
          background: 'rgba(12,12,12,0.85)', border: '1px solid var(--gold-line)',
          backdropFilter: 'blur(20px)',
        }}>
          <p className="text-label" style={{ marginBottom: '0.75rem' }}>Sécurité garantie</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 400, color: 'var(--paper)', lineHeight: 1.5 }}>
            Vos données sont chiffrées via <DisplayItalic>KMS</DisplayItalic>. Vous naviguez sous pseudonyme. L'anonymat n'est levé que lors d'un audit légal strict.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                  border: '2px solid var(--ink-90)',
                  background: `linear-gradient(135deg, hsl(${220 + i * 20},40%,35%), hsl(${40 - i * 5},60%,50%))`,
                  marginLeft: i > 0 ? '-0.5rem' : 0,
                }} />
              ))}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>+1 200 membres vérifiés</span>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        
        .auth-panel-left {
          margin: 0 auto;
        }
        
        .auth-panel-right {
          display: block;
          position: relative;
          overflow: hidden;
          height: 320px;
          width: 100%;
          border-top: 1px solid var(--gold-line);
        }
        
        .auth-content-card {
          bottom: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
          padding: 1.25rem;
          z-index: 2;
        }
        
        @media (min-width: 900px) {
          .auth-page-container {
            flex-direction: row;
          }
          
          .auth-panel-left {
            margin: 0;
          }
          
          .auth-panel-right {
            flex: 1;
            height: auto;
            border-top: none;
            border-left: 1px solid var(--gold-line);
          }
          
          .auth-content-card {
            bottom: 3rem;
            left: 3rem;
            right: 3rem;
            padding: 2rem;
          }
        }
      `}</style>
    </motion.div>
  );
};
