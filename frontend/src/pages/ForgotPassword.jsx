import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Btn, Field, AlertBanner, DisplayItalic } from '../ui.jsx';

export const ForgotPasswordPage = ({ navigate }) => {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailValue, setEmailValue] = useState('');

  // Étape 1 : Demande de code par email
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.target);
    const email = fd.get('email');
    setEmailValue(email);

    try {
      await api.forgotPassword(email);
      setStep('reset');
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Trop de demandes de réinitialisation. Veuillez réessayer dans une heure.");
      } else {
        // En cas d'erreur standard, passer à l'étape reset pour ne pas divulguer l'existence
        setStep('reset');
      }
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Saisie du code reçu + Nouveau mot de passe
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.target);
    const code = fd.get('code');
    const newPassword = fd.get('new_password');
    const confirmPassword = fd.get('confirm_password');

    if (!code || code.trim().length < 4) {
      setError('Veuillez saisir le code de vérification reçu par email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(code.trim(), newPassword);
      setStep('success');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Code de vérification invalide ou expiré. Veuillez vérifier l'email reçu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageVariants} style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 480px) 1fr', minHeight: '100vh' }}>
      
      {/* ── Left panel : Form ── */}
      <div style={{
        padding: '3rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRight: '1px solid var(--gold-line)',
        background: 'var(--ink-100)',
      }}>
        <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
          
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--paper-dim)',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              marginBottom: '2rem',
              padding: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--paper-dim)')}
          >
            <ArrowLeft size={16} /> Retour à la connexion
          </button>

          {step === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid #34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
                marginBottom: '1.5rem',
              }}>
                <CheckCircle2 size={24} />
              </div>

              <h1 className="text-display-sm" style={{ marginBottom: '0.75rem' }}>
                Mot de passe <DisplayItalic>mis à jour</DisplayItalic>
              </h1>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.6, marginBottom: '2rem' }}>
                Votre mot de passe a été modifié avec succès en base de données. Vous pouvez dès maintenant vous connecter.
              </p>

              <Btn variant="primary" onClick={() => navigate('/login')} style={{ width: '100%' }}>
                Se connecter
              </Btn>
            </motion.div>
          ) : step === 'reset' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-label" style={{ marginBottom: '0.75rem' }}>Étape 2 sur 2</p>
              <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
                Saisir le <DisplayItalic>code reçu</DisplayItalic>
              </h1>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Un code à 6 chiffres a été envoyé à <strong style={{ color: 'var(--paper)' }}>{emailValue}</strong>.
              </p>

              {error && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <AlertBanner type="error">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Code à 6 chiffres reçu par email
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="123456"
                    maxLength={10}
                    autoFocus
                    style={{
                      width: '100%',
                      background: 'var(--ink-80)',
                      border: '1px solid var(--gold-line)',
                      color: 'var(--gold)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      letterSpacing: '4px',
                      textAlign: 'center',
                      padding: '0.75rem',
                      borderRadius: '2px',
                      outline: 'none',
                    }}
                  />
                </div>

                <Field
                  label="Nouveau mot de passe"
                  name="new_password"
                  type="password"
                  placeholder="••••••••"
                  required
                />

                <Field
                  label="Confirmer le nouveau mot de passe"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  required
                />

                <Btn
                  type="submit"
                  variant="primary"
                  loading={loading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Mettre à jour mon mot de passe
                </Btn>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    style={{ background: 'none', border: 'none', color: 'var(--paper-dim)', cursor: 'pointer', padding: 0, fontSize: '0.8125rem' }}
                  >
                    ← Changer d'adresse email
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <>
              <p className="text-label" style={{ marginBottom: '0.75rem' }}>Récupération de compte</p>
              <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
                Mot de passe <DisplayItalic>oublié ?</DisplayItalic>
              </h1>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Saisissez votre adresse email pour recevoir votre code de sécurité à 6 chiffres.
              </p>

              {error && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <AlertBanner type="error">{error}</AlertBanner>
                </div>
              )}

              <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Field
                  label="Email de votre compte"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                  autoFocus
                />

                <Btn
                  type="submit"
                  variant="primary"
                  loading={loading}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  Envoyer le code par email
                </Btn>
              </form>
            </>
          )}

        </div>
      </div>

      {/* ── Right decorative panel ── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--ink-90)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(ellipse at center, rgba(200,169,110,0.08) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', maxWidth: '440px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display)',
            fontSize: '4.5rem',
            color: 'rgba(200,169,110,0.15)',
            lineHeight: 1,
            marginBottom: '1.5rem',
          }}>
            06
          </div>
          <h2 className="text-display-md" style={{ marginBottom: '1rem' }}>
            Sécurité & <DisplayItalic>Confidentialité</DisplayItalic>
          </h2>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.7 }}>
            Votre mot de passe est immédiatement chiffré selon l'algorithme sécurisé bcrypt. Aucun mot de passe n'est stocké en clair.
          </p>
        </div>
      </div>

    </motion.div>
  );
};
