import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, FileText, CheckCircle2, ChevronLeft, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Field, SectionLabel, StepProgress, DisplayItalic } from '../ui.jsx';

const spinKeyframes = `
@keyframes kyc-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.7; }
}
@keyframes kyc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes kyc-dash {
  0% { stroke-dashoffset: 283; }
  50% { stroke-dashoffset: 70; }
  100% { stroke-dashoffset: 283; }
}
`;

export const KYCPage = ({ navigate }) => {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [kycData, setKycData] = useState({});
  const [file, setFile] = useState(null);
  const [contextMessage, setContextMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      const msg = sessionStorage.getItem('kyc_blocked_message');
      if (msg) {
        sessionStorage.removeItem('kyc_blocked_message');
        return msg;
      }
    }
    return null;
  });

  const handleStep1 = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setKycData({
      nom_complet:     fd.get('nom_complet'),
      date_naissance:  fd.get('date_naissance'),
      type_document:   fd.get('type_document'),
    });
    setStep(2);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('nom_complet', kycData.nom_complet);
      fd.append('date_naissance', kycData.date_naissance);
      fd.append('type_document', kycData.type_document);
      fd.append('file', file);
      
      await api.submitKyc(fd);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <style>{spinKeyframes}</style>
      <div className="container-editorial" style={{ maxWidth: '640px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--paper-dim)', fontSize: '0.8125rem', marginBottom: '2rem' }}
        >
          <ChevronLeft size={14} /> Retour
        </button>

        {contextMessage && (
          <div style={{
            marginBottom: '1.75rem',
            background: 'rgba(200, 169, 110, 0.12)',
            border: '1px solid var(--gold-line)',
            padding: '0.9rem 1.25rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--paper)'
          }}>
            <Lock size={18} color="var(--gold)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {contextMessage}
            </span>
          </div>
        )}

        <SectionLabel>Vérification d'identité</SectionLabel>

        <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
          KYC — <DisplayItalic>Coffre-fort</DisplayItalic>
        </h1>
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem' }}>
          Chiffrement KMS activé. Vos données réelles ne sont jamais stockées en clair.
        </p>

        {step < 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <StepProgress total={2} current={step} />
            <p className="text-caption">Étape {step} / 2</p>
          </div>
        )}

        <Card gold>
          {step === 1 && (
            <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field label="Nom Légal Complet" name="nom_complet" placeholder="Tel qu'il apparaît sur votre pièce d'identité" required />
              <Field label="Date de naissance" name="date_naissance" type="date" required />
              <div>
                <label className="input-label">Type de document</label>
                <select name="type_document" className="input-field">
                  <option value="cni">Carte Nationale d'Identité</option>
                  <option value="passeport">Passeport</option>
                </select>
              </div>
              <Btn type="submit" variant="primary" style={{ width: '100%', marginTop: '0.5rem' }}>Suivant →</Btn>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="drop-zone" style={{ padding: '3rem', textAlign: 'center', position: 'relative' }}>
                <input 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={handleFileChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                <FileText size={32} color={file ? 'var(--gold)' : 'var(--gold-dim)'} style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--paper)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
                  {file ? file.name : "Cliquez ou glissez-déposez votre document ici"}
                </p>
                <p className="text-caption">JPG, PNG ou PDF — Max 5 MB</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Btn type="button" variant="ghost" onClick={() => setStep(1)} style={{ flex: '0 0 auto' }}>← Retour</Btn>
                <Btn type="submit" variant="primary" loading={loading} style={{ flex: 1 }} disabled={!file}>Soumettre pour vérification</Btn>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              {/* Animated waiting spinner */}
              <div style={{ position: 'relative', width: '5.5rem', height: '5.5rem', margin: '0 auto 2rem' }}>
                <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', inset: 0, animation: 'kyc-spin 2.5s linear infinite' }}>
                  <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(200,169,110,0.12)" strokeWidth="2.5" />
                  <circle cx="44" cy="44" r="40" fill="none" stroke="var(--gold)" strokeWidth="2.5"
                    strokeDasharray="283" strokeLinecap="round"
                    style={{ animation: 'kyc-dash 2s ease-in-out infinite' }} />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'kyc-pulse 2.5s ease-in-out infinite'
                }}>
                  <Clock size={28} color="var(--gold)" />
                </div>
              </div>

              <h3 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>En attente de vérification</h3>
              <p style={{ color: 'var(--paper-dim)', fontWeight: 300, fontSize: '0.9375rem', maxWidth: '34ch', margin: '0 auto 1rem' }}>
                Vos documents ont été transmis avec succès.
              </p>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', background: 'rgba(200,169,110,0.08)',
                border: '1px solid rgba(200,169,110,0.15)', marginBottom: '2rem',
              }}>
                <ShieldCheck size={14} color="var(--gold)" />
                <span style={{ fontSize: '0.8125rem', color: 'var(--gold)', fontWeight: 500 }}>
                  Notre équipe de conformité examine votre dossier
                </span>
              </div>

              <p style={{ color: 'rgba(240,237,230,0.3)', fontSize: '0.8125rem', marginBottom: '2rem' }}>
                Vous recevrez une notification dès que la vérification sera terminée.
              </p>
              <Btn variant="primary" onClick={() => navigate('/dashboard')}>Retour au Dashboard</Btn>
            </motion.div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};
