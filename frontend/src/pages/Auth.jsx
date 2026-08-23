import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { api } from '../api.js';
import { pageVariants, Btn, Field, AlertBanner, DisplayItalic } from '../ui.jsx';

export const AuthPage = ({ type, navigate, user, setUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [authStep, setAuthStep] = useState('form'); // 'form' | 'otp'
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendStatus, setResendStatus] = useState('');
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
    setEmailError('');
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
        setRegisteredEmail(email);
        setAuthStep('otp');
      }
    } catch (err) {

      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && typeof detail === 'string' && (detail.toLowerCase().includes('activ') || detail.toLowerCase().includes('code') || detail.toLowerCase().includes('confirm'))) {
        setRegisteredEmail(email);
        setAuthStep('otp');
        setError(detail);
      } else if (err.response?.status === 422 || (typeof detail === 'string' && (detail.toLowerCase().includes('email') || detail.toLowerCase().includes('adresse')))) {
        setEmailError(detail || "Cette adresse email semble invalide. Vérifiez qu'elle est correctement orthographiée.");
      } else {
        setError(detail || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Veuillez saisir les 6 chiffres du code reçu par email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyCode(registeredEmail, otpCode);
      const [kyc, onboarding] = await Promise.all([
        api.getKycStatus().catch(() => ({ statut_verification: 'none' })),
        api.getOnboarding().catch(() => ({ onboarding_complete: false })),
      ]);
      setUser({
        ...res.user,
        kyc_status: kyc.statut_verification,
        onboarding_complete: onboarding.onboarding_complete,
      });
      navigate(onboarding.onboarding_complete ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.response?.data?.detail || 'Code de vérification invalide.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResendStatus('Envoi...');
      await api.resendCode(registeredEmail);
      setResendStatus('Nouveau code envoyé par email !');
      setTimeout(() => setResendStatus(''), 4000);
    } catch (err) {
      setResendStatus('Erreur lors de l\'envoi du code.');
    }
  };

  return (
    <motion.div {...pageVariants} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '1rem', background: '#0C0C0C' }}>

      {/* ── Fullscreen Video Background ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/hero_background.png"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: 0,
        }}
        aria-label="Arrière-plan vidéo TrustPool"
      >
        <source src="/TITRE_TrustPool_—_Vidéo_Land.mp4" type="video/mp4" />
        <source src="/video_land.mp4" type="video/mp4" />
      </video>

      {/* ── Dark Translucent Overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(12, 12, 12, 0.72)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 1,
        }}
      />

      {/* ── Centered Glassmorphism Card ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(18, 18, 18, 0.78)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(200, 169, 110, 0.25)',
          borderRadius: '6px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          padding: 'clamp(1.75rem, 5vw, 2.5rem)',
          marginBlock: '2rem',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: 0,
          }}
        >
          <img
            src="/icone.png"
            alt="TrustPool"
            style={{ height: '1.875rem', width: 'auto', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--paper)', fontSize: '0.9375rem', fontWeight: 600 }}>
            TrustPool
          </span>
        </button>

        {authStep === 'otp' ? (
          /* ── OTP Verification Screen ── */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-label" style={{ marginBottom: '0.5rem', color: 'var(--gold)' }}>Vérification de sécurité</p>
            <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
              Code de confirmation
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', fontWeight: 300, marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Un code d'activation à 6 chiffres a été envoyé à <strong style={{ color: 'var(--paper)', fontWeight: 500 }}>{registeredEmail}</strong>.
            </p>

            {error && <div style={{ marginBottom: '1.25rem' }}><AlertBanner type="error">{error}</AlertBanner></div>}
            {resendStatus && (
              <div style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                background: 'rgba(90, 158, 124, 0.15)',
                border: '1px solid rgba(90, 158, 124, 0.35)',
                color: 'var(--success)',
                fontSize: '0.8125rem',
                borderRadius: '3px'
              }}>
                {resendStatus}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    letterSpacing: '0.5rem',
                    fontWeight: 700,
                    padding: '0.75rem',
                    background: 'rgba(12, 12, 12, 0.85)',
                    border: '1px solid var(--gold-line)',
                    color: 'var(--gold)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              <Btn type="submit" variant="primary" loading={loading} style={{ width: '100%' }}>
                Valider et accéder à l'application →
              </Btn>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                <button
                  type="button"
                  onClick={() => { setAuthStep('form'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--paper-dim)', cursor: 'pointer', padding: 0 }}
                >
                  ← Modifier l'email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Renvoyer le code
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* ── Login / Register Form ── */
          <>
            <p className="text-label" style={{ marginBottom: '0.5rem' }}>{isLogin ? 'Connexion' : 'Inscription'}</p>
            <h1 className="text-display-sm" style={{ marginBottom: '0.35rem' }}>
              {isLogin ? 'Bon retour,' : 'Créer un compte,'}
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', fontWeight: 300, marginBottom: '1.75rem' }}>
              {isLogin ? 'Connectez-vous pour accéder à vos groupes.' : 'Rejoignez la révolution de l\'assurance P2P.'}
            </p>

            {error && <div style={{ marginBottom: '1.25rem' }}><AlertBanner type="error">{error}</AlertBanner></div>}

            <div style={{ marginBottom: '1.25rem' }}>
              <button
                onClick={(e) => { e.preventDefault(); alert("Pour activer Google Sign-In, vous devez configurer un Client ID dans Google Cloud Console."); }}
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
                  padding: '0.7rem',
                  fontSize: '0.875rem',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(200, 169, 110, 0.2)' }}></div>
              <span style={{ color: 'var(--paper-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ou avec email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(200, 169, 110, 0.2)' }}></div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {!isLogin && (
                <Field label="Pseudonyme" name="pseudonyme" type="text" placeholder="Gamer123" required />
              )}
              <div>
                <Field label="Email" name="email" type="email" placeholder="votre@email.com" required />
                {emailError && (
                  <p style={{
                    marginTop: '0.4rem',
                    fontSize: '0.78125rem',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    lineHeight: 1.4,
                  }}>
                    <span>⚠️</span> {emailError}
                  </p>
                )}
              </div>
              <div>
                <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" required />
                {isLogin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gold)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'none',
                        fontWeight: 400,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
              </div>

              <Btn type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: '0.25rem' }}>
                {isLogin ? 'Se connecter' : 'S\'inscrire'}
              </Btn>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
              {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}
              {' '}
              <button
                onClick={() => navigate(isLogin ? '/register' : '/login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', textDecoration: 'underline', fontSize: 'inherit' }}
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </>
        )}
      </div>

    </motion.div>
  );
};
