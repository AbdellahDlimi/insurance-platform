import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { api } from '../api.js';
import { pageVariants, Btn, Field, AlertBanner } from '../ui.jsx';

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
        setEmailError(detail || "Cette adresse email me semble invalide. Vérifiez qu'elle est correctement orthographiée.");
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
    <motion.div {...pageVariants} className="flex w-full min-h-screen bg-[#0C0C0C] overflow-x-hidden">

      {/* ══════════════════════════════════════════════
          ZONE GAUCHE — Formulaire (Largeur fixe ajustée desktop 450px)
          ══════════════════════════════════════════════ */}
      <div className="w-full lg:w-[460px] xl:w-[480px] lg:flex-none flex flex-col justify-center px-8 sm:px-12 lg:pl-16 lg:pr-8 py-12 pt-28 lg:pt-12 relative z-10 bg-[#0C0C0C] min-h-screen">
        <div className="w-full">

          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 mb-10 bg-transparent border-0 cursor-pointer p-0 text-left"
          >
            <img
              src="/icone.png"
              alt="TrustPool"
              className="h-8 w-auto object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="font-['DM_Serif_Display',serif] text-[#F0EDE6] text-lg font-semibold tracking-wide">
              TrustPool
            </span>
          </button>

          {authStep === 'otp' ? (
            /* ── OTP Verification Screen ── */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#C8A96E] mb-2 text-left">
                VÉRIFICATION DE SÉCURITÉ
              </p>
              <h1 className="font-['DM_Serif_Display',serif] text-2xl sm:text-3xl font-normal text-[#F0EDE6] mb-2 leading-tight text-left">
                Code de confirmation
              </h1>
              <p className="text-[#F0EDE6]/65 text-sm font-light mb-6 leading-relaxed text-left">
                Un code d'activation à 6 chiffres a été envoyé à <strong className="text-[#F0EDE6] font-medium">{registeredEmail}</strong>.
              </p>

              {error && <div className="mb-5"><AlertBanner type="error">{error}</AlertBanner></div>}
              {resendStatus && (
                <div className="mb-5 p-3 bg-[rgba(90,158,124,0.15)] border border-[rgba(90,158,124,0.35)] text-[#5A9E7C] text-xs rounded">
                  {resendStatus}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
                <div>
                  <label className="block text-[11px] font-medium tracking-wider uppercase text-[#C8A96E] mb-2 text-left">
                    Code à 6 chiffres
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    className="w-full text-center text-2xl tracking-[0.5rem] font-bold p-3 bg-[#141414] border border-[rgba(240,237,230,0.1)] text-[#C8A96E] rounded font-mono outline-none focus:border-[#C8A96E]/50 transition-colors"
                  />
                </div>

                <Btn type="submit" variant="primary" loading={loading} className="w-full">
                  Valider et accéder à l'application →
                </Btn>

                <div className="flex items-center justify-between mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setAuthStep('form'); setError(''); }}
                    className="bg-transparent border-0 text-[#F0EDE6]/60 cursor-pointer p-0 hover:text-[#F0EDE6]"
                  >
                    ← Modifier l'email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="bg-transparent border-0 text-[#C8A96E] cursor-pointer p-0 underline"
                  >
                    Renvoyer le code
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* ── Login / Register Form ── */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

              {/* Section label */}
              <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#C8A96E] mb-2 text-left">
                {isLogin ? 'CONNEXION' : 'INSCRIPTION'}
              </p>

              {/* Headline */}
              <h1 className="font-['DM_Serif_Display',serif] text-3xl sm:text-4xl font-normal text-[#F0EDE6] mb-1.5 leading-tight text-left">
                <em className="italic text-[#C8A96E]">
                  {isLogin ? 'Bon retour,' : 'Créer un compte,'}
                </em>
              </h1>

              {/* Subheadline */}
              <p className="text-[#F0EDE6]/65 text-sm font-light mb-8 leading-relaxed text-left">
                {isLogin ? 'Connectez-vous pour accéder à vos groupes.' : 'Rejoignez la révolution de l\'assurance P2P.'}
              </p>

              {error && <div className="mb-5"><AlertBanner type="error">{error}</AlertBanner></div>}

              {/* Google Sign-In */}
              <div className="mb-5">
                <button
                  onClick={(e) => { e.preventDefault(); alert("Pour activer Google Sign-In, vous devez configurer un Client ID dans Google Cloud Console."); }}
                  className="w-full flex items-center justify-center gap-3 bg-white text-[#3c4043] border border-[#dadce0] rounded py-3 text-sm font-medium cursor-pointer transition-colors hover:bg-[#f8f9fa]"
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

              {/* Separator */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[#C8A96E]/20"></div>
                <span className="text-[#F0EDE6]/35 text-[11px] uppercase tracking-wider font-medium">ou avec email</span>
                <div className="flex-1 h-px bg-[#C8A96E]/20"></div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {!isLogin && (
                  <Field label="Pseudonyme" name="pseudonyme" type="text" placeholder="Gamer123" required />
                )}
                <div>
                  <Field label="Email" name="email" type="email" placeholder="votre@email.com" required />
                  {emailError && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1.5 leading-snug">
                      <span>⚠️</span> {emailError}
                    </p>
                  )}
                </div>
                <div>
                  <Field label="Mot de passe" name="password" type="password" placeholder="••••••••" required />
                  {isLogin && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="bg-transparent border-0 text-[#C8A96E] text-xs cursor-pointer p-0 hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}
                </div>

                <Btn type="submit" variant="primary" loading={loading} className="w-full mt-2">
                  {isLogin ? 'Se connecter' : 'S\'inscrire'}
                </Btn>
              </form>

              {/* Switch login/register */}
              <p className="mt-8 text-xs text-[#F0EDE6]/60 text-left">
                {isLogin ? "Pas encore de compte ?" : "Déjà membre ?"}{' '}
                <button
                  onClick={() => navigate(isLogin ? '/register' : '/login')}
                  className="bg-transparent border-0 cursor-pointer text-[#C8A96E] underline text-xs p-0"
                >
                  {isLogin ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ZONE DROITE — Vidéo (Remplit tout l'espace restant sans vide)
          ══════════════════════════════════════════════ */}
      <div className="hidden lg:block flex-1 relative overflow-hidden min-h-screen">
        {/* Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero_background.png"
          className="absolute inset-0 w-full h-full object-cover object-left"
          aria-label="Arrière-plan vidéo TrustPool"
        >
          <source src="/TITRE_TrustPool_—_Vidéo_Land.mp4" type="video/mp4" />
          <source src="/video_land.mp4" type="video/mp4" />
          <source src="/login-hero.mp4" type="video/mp4" />
        </video>

        {/* Soft edge gradient overlay to softly blend the join */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0C0C0C] via-[#0C0C0C]/30 to-transparent pointer-events-none z-10" />

        {/* Bottom gradient overlay for tagline readability */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0C0C0C] via-[#0C0C0C]/60 to-transparent pointer-events-none z-10" />

        {/* Tagline */}
        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-16 z-20">
          <p className="font-['DM_Serif_Display',serif] italic text-xl xl:text-2xl text-[#F0EDE6]/80 font-normal leading-relaxed max-w-lg">
            "Chaque membre, anonyme pour les autres. <br />
            <span className="text-[#C8A96E]">Chaque sinistre, vérifié par l'IA."</span>
          </p>
          <div className="mt-4 w-12 h-0.5 bg-[#C8A96E]/50" />
        </div>
      </div>

    </motion.div>
  );
};
