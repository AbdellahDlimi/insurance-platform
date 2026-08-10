import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Shield, CheckCircle2, Upload, Save, Lock, ArrowLeft,
  Edit3, Check, X, AlertCircle, Phone, FileText
} from 'lucide-react';
import { pageVariants, staggerContainer, staggerItem, Card, Btn, Badge, SectionLabel, DisplayItalic } from '../ui.jsx';
import { api } from '../api.js';

/* Inline editable field */
const EditableField = ({ label, value, onSave, placeholder = '', validate }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState('');

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { setErr('Ce champ est requis.'); return; }
    if (validate) {
      const msg = validate(trimmed);
      if (msg) { setErr(msg); return; }
    }
    const error = await onSave(trimmed);
    if (error) { setErr(error); return; }
    setEditing(false);
    setErr('');
  };

  const cancel = () => { setDraft(value); setEditing(false); setErr(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.35)' }}>
        {label}
      </label>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              autoFocus
              value={draft}
              onChange={e => { setDraft(e.target.value); setErr(''); }}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              placeholder={placeholder}
              style={{
                flex: 1, background: 'var(--ink-90)', border: `1px solid ${err ? 'var(--danger)' : 'var(--gold)'}`,
                padding: '0.625rem 0.875rem', color: 'var(--paper)', fontSize: '1rem',
                outline: 'none', fontFamily: 'inherit', borderRadius: 2,
              }}
            />
            <button onClick={commit} style={{ width: 34, height: 34, background: 'rgba(90,158,124,0.15)', border: '1px solid var(--success)', borderRadius: 2, cursor: 'pointer', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={15} />
            </button>
            <button onClick={cancel} style={{ width: 34, height: 34, background: 'rgba(200,90,90,0.10)', border: '1px solid var(--danger)', borderRadius: 2, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </button>
          </div>
          {err && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.125rem' }}>{err}</p>}
        </div>
      ) : (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', group: true }}
          onClick={() => { setDraft(value); setEditing(true); }}
        >
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--paper)', fontWeight: 500 }}>
            {value || <span style={{ color: 'var(--paper-dim)', fontStyle: 'italic', fontWeight: 300 }}>{placeholder}</span>}
          </p>
          <Edit3 size={13} color="rgba(200,169,110,0.4)" style={{ flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
};

export const ProfilePage = ({ user, navigate, setUser }) => {
  const [localData, setLocalData] = useState({ bio: '', telephone: '', avatarBase64: null });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`trustpool_profile_${user.id}`);
      if (saved) setLocalData(JSON.parse(saved));
    }
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* Save pseudonyme via real API */
  const savePseudonyme = async (newPseudo) => {
    try {
      const updated = await api.updateProfile({ pseudonyme: newPseudo });
      // Update user context so navbar and dashboard update too
      if (setUser) setUser(prev => ({ ...prev, pseudonyme: updated.pseudonyme }));
      showToast('Pseudonyme mis à jour avec succès !');
      return null; // no error
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la mise à jour.';
      return msg;
    }
  };

  const validatePseudo = (v) => {
    if (v.length < 3)  return 'Le pseudonyme doit contenir au moins 3 caractères.';
    if (v.length > 30) return 'Le pseudonyme ne peut pas dépasser 30 caractères.';
    if (!/^[a-zA-Z0-9_\-. àâäéèêëîïôùûüÿç]+$/.test(v)) return 'Caractères non autorisés.';
    return null;
  };

  /* Save local extras (phone, bio, avatar) */
  const handleSaveLocal = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem(`trustpool_profile_${user.id}`, JSON.stringify(localData));
      window.dispatchEvent(new Event('profile_updated'));
      setSaving(false);
      showToast('Informations enregistrées localement.');
    }, 500);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("Image trop volumineuse (max 2MB)", 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setLocalData(prev => ({ ...prev, avatarBase64: reader.result }));
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  const isComplianceTeam = user.role === 'admin_plateforme';
  const isKycVerified = user.kyc_status === 'verified' || isComplianceTeam;

  const kycColor = isKycVerified ? '#7FC9A0' : '#E0A870';
  const kycLabel = isKycVerified ? (isComplianceTeam ? 'Vérifié (Conformité)' : 'Vérifié') : 'En attente';

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: '5rem', left: '50%',
              background: toast.type === 'error' ? 'rgba(160,50,50,0.97)' : 'rgba(20,40,25,0.97)',
              border: `1px solid ${toast.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
              color: 'var(--paper)', padding: '0.75rem 1.5rem', borderRadius: 4,
              fontSize: '0.875rem', fontWeight: 500, zIndex: 9999,
              backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container-editorial" style={{ maxWidth: '820px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: '1px solid var(--gold-line)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--paper-dim)' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <SectionLabel>Mon Compte</SectionLabel>
            <h1 className="text-display-sm">Profil <DisplayItalic>Personnel</DisplayItalic></h1>
          </div>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Card 1: Identité ── */}
          <motion.div variants={staggerItem}>
            <Card>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>

                {/* Avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '6rem', height: '6rem', borderRadius: '50%', position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--paper)',
                    border: '2px solid var(--gold)',
                  }}>
                    {localData.avatarBase64
                      ? <img src={localData.avatarBase64} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : user.pseudonyme?.charAt(0).toUpperCase()
                    }
                    <label style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'rgba(12,12,12,0.82)', padding: '0.3rem',
                      display: 'flex', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>
                      <Upload size={13} color="var(--paper)" />
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <span className="text-caption">Photo de profil</span>
                </div>

                {/* Infos identité */}
                <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Pseudonyme éditable */}
                  <EditableField
                    label="Pseudonyme"
                    value={user.pseudonyme}
                    placeholder="Choisissez un pseudonyme…"
                    validate={validatePseudo}
                    onSave={savePseudonyme}
                  />

                  {/* Email (readonly) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.35)' }}>
                      Adresse e-mail
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--paper-dim)' }}>
                      <Mail size={15} />
                      <span style={{ fontSize: '0.9375rem' }}>{user.email}</span>
                      <span style={{ fontSize: '0.6875rem', color: 'rgba(240,237,230,0.25)', marginLeft: '0.25rem' }}>(non modifiable)</span>
                    </div>
                  </div>

                  {/* Statuts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={14} color={kycColor} />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
                        KYC : <span style={{ color: kycColor, fontWeight: 600 }}>{kycLabel}</span>
                      </span>
                      {!isKycVerified && (
                        <button onClick={() => navigate('/kyc')} style={{ background: 'none', border: '1px solid var(--warning)', borderRadius: 2, padding: '0.1rem 0.5rem', color: 'var(--warning)', fontSize: '0.6875rem', cursor: 'pointer' }}>
                          Vérifier
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge variant={user.statut_compte === 'actif' ? 'success' : 'warning'}>{user.statut_compte}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(240,237,230,0.3)', fontSize: '0.8125rem' }}>
                      <Lock size={12} /> Identité chiffrée KMS
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Card 2: Infos complémentaires (stockage local) ── */}
          <motion.div variants={staggerItem}>
            <Card>
              <SectionLabel>Informations complémentaires</SectionLabel>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', marginBottom: '1.75rem', marginTop: '0.25rem' }}>
                Ces informations sont stockées <strong style={{ color: 'var(--paper)' }}>localement</strong> sur votre appareil.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Téléphone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.35)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={11} /> Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={localData.telephone}
                    onChange={e => setLocalData(prev => ({ ...prev, telephone: e.target.value }))}
                    placeholder="+33 6 12 34 56 78"
                    style={{
                      background: 'var(--ink-90)', border: '1px solid var(--gold-line)', padding: '0.75rem 1rem',
                      color: 'var(--paper)', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit',
                      transition: 'border-color 0.2s', borderRadius: 2,
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--gold-line)'}
                  />
                </div>

                {/* Bio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.35)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={11} /> Biographie / Présentation
                  </label>
                  <textarea
                    value={localData.bio}
                    onChange={e => setLocalData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Parlez-nous de vous…"
                    rows={4}
                    style={{
                      background: 'var(--ink-90)', border: '1px solid var(--gold-line)', padding: '0.75rem 1rem',
                      color: 'var(--paper)', fontSize: '0.9375rem', outline: 'none', fontFamily: 'inherit',
                      resize: 'vertical', transition: 'border-color 0.2s', borderRadius: 2,
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--gold-line)'}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Btn variant="primary" onClick={handleSaveLocal} loading={saving}>
                    <Save size={14} /> Enregistrer
                  </Btn>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Card 3: Danger zone ── */}
          <motion.div variants={staggerItem}>
            <Card style={{ borderLeft: '3px solid var(--danger)', background: 'rgba(180,60,60,0.03)' }}>
              <SectionLabel>Zone de sécurité</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem' }}>
                <div>
                  <p style={{ color: 'var(--paper)', fontSize: '0.9375rem', fontWeight: 500, marginBottom: '0.25rem' }}>Mot de passe</p>
                  <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>
                    La modification du mot de passe n'est pas encore disponible dans cette version.
                  </p>
                </div>
                <Btn variant="secondary" disabled style={{ opacity: 0.5 }}>
                  Changer le mot de passe
                </Btn>
              </div>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </motion.div>
  );
};
