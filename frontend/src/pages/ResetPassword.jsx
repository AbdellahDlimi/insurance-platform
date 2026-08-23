import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Btn, Field, AlertBanner, DisplayItalic } from '../ui.jsx';

export const ResetPasswordPage = ({ navigate }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (!urlToken) {
      setTokenMissing(true);
    } else {
      setToken(urlToken);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.target);
    const newPassword = fd.get('new_password');
    const confirmPassword = fd.get('confirm_password');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.");
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

          {tokenMissing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                marginBottom: '1.5rem',
              }}>
                <AlertCircle size={24} />
              </div>

              <h1 className="text-display-sm" style={{ marginBottom: '0.75rem' }}>
                Lien de réinitialisation <DisplayItalic>introuvable</DisplayItalic>
              </h1>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.6, marginBottom: '2rem' }}>
                Aucun jeton de réinitialisation n'a été détecté dans l'adresse de la page. Veuillez utiliser le lien complet reçu par email.
              </p>

              <Btn variant="primary" onClick={() => navigate('/forgot-password')} style={{ width: '100%' }}>
                Demander un nouveau lien
              </Btn>
            </motion.div>
          ) : success ? (
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
                Votre mot de passe a été modifié avec succès. Vous pouvez dès maintenant vous connecter à votre compte TrustPool.
              </p>

              <Btn variant="primary" onClick={() => navigate('/login')} style={{ width: '100%' }}>
                Se connecter
              </Btn>
            </motion.div>
          ) : (
            <>
              <p className="text-label" style={{ marginBottom: '0.75rem' }}>Nouveau mot de passe</p>
              <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
                Définir un nouveau <DisplayItalic>mot de passe</DisplayItalic>
              </h1>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem', lineHeight: 1.6 }}>
                Choisissez un mot de passe robuste d'au moins 6 caractères pour sécuriser votre compte.
              </p>

              {error && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <AlertBanner type="error">{error}</AlertBanner>
                  {error.includes("expiré") || error.includes("invalide") ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Faire une nouvelle demande de réinitialisation →
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <Field
                  label="Nouveau mot de passe"
                  name="new_password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoFocus
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
                  Enregistrer mon nouveau mot de passe
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
            <Lock size={64} strokeWidth={1} style={{ opacity: 0.25, color: 'var(--gold)' }} />
          </div>
          <h2 className="text-display-md" style={{ marginBottom: '1rem' }}>
            Accès <DisplayItalic>Sécurisé</DisplayItalic>
          </h2>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.7 }}>
            Votre mot de passe est chiffré selon l'algorithme bcrypt avec salage automatique. Aucun employé ni administrateur ne peut le lire en clair.
          </p>
        </div>
      </div>

    </motion.div>
  );
};
