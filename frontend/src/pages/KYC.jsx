import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, FileText, CheckCircle2, ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Field, SectionLabel, StepProgress, DisplayItalic } from '../ui.jsx';

export const KYCPage = ({ navigate }) => {
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [kycData, setKycData] = useState({});

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.submitKyc({ ...kycData, numero_document: 'DOC-' + Date.now(), fournisseur_api: 'Veriff' });
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial" style={{ maxWidth: '640px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--paper-dim)', fontSize: '0.8125rem', marginBottom: '2rem' }}
        >
          <ChevronLeft size={14} /> Retour
        </button>

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
              <div className="drop-zone" style={{ padding: '3rem', textAlign: 'center' }}>
                <FileText size={32} color="var(--gold-dim)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--paper)', fontSize: '0.9375rem', marginBottom: '0.375rem' }}>Glissez-déposez votre document ici</p>
                <p className="text-caption">JPG, PNG ou PDF — Max 5 MB</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Btn type="button" variant="ghost" onClick={() => setStep(1)} style={{ flex: '0 0 auto' }}>← Retour</Btn>
                <Btn type="submit" variant="primary" loading={loading} style={{ flex: 1 }}>Soumettre pour vérification</Btn>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', paddingBlock: '2.5rem' }}>
              <div style={{
                width: '4rem', height: '4rem', borderRadius: '50%', border: '1px solid var(--success)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              }}>
                <CheckCircle2 size={24} color="var(--success)" />
              </div>
              <h3 className="text-display-sm" style={{ marginBottom: '0.75rem' }}>Documents transmis</h3>
              <p style={{ color: 'var(--paper-dim)', fontWeight: 300, marginBottom: '2rem' }}>
                L'API de vérification analyse vos documents. Vous recevrez une notification sous peu.
              </p>
              <Btn variant="primary" onClick={() => navigate('/dashboard')}>Retour au Dashboard</Btn>
            </motion.div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};
