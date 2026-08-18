import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowLeft, Users, CheckCircle2, XCircle, Clock,
  Wallet, TrendingUp, Star, UserPlus, Crown, AlertCircle, Check, X, AlertTriangle
} from 'lucide-react';
import { api } from '../api.js';
import {
  pageVariants, staggerContainer, staggerItem,
  Card, Btn, SectionLabel, Badge, PageLoader, DisplayItalic
} from '../ui.jsx';

/* ── small stat block ── */
const Stat = ({ label, value, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <p style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.3)' }}>
      {label}
    </p>
    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, color: accent || 'var(--paper)' }}>
      {value}
    </p>
  </div>
);

const MemberRow = ({ member, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0.875rem 1.25rem',
        background: index % 2 === 0 ? 'var(--ink-90)' : 'var(--ink-80)',
        borderBottom: '1px solid rgba(240,237,230,0.04)',
        cursor: 'pointer',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: member.is_admin
          ? 'linear-gradient(135deg, #c8a96e, #8b6914)'
          : 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--paper)',
        border: member.is_admin ? '1.5px solid var(--gold)' : '1px solid var(--gold-line)',
        position: 'relative',
      }}>
        {member.pseudonyme.charAt(0).toUpperCase()}
        {member.is_admin && (
          <Crown size={10} color="var(--gold)" style={{ position: 'absolute', top: -4, right: -4 }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ fontWeight: member.is_admin ? 700 : 500, color: 'var(--paper)', fontSize: '0.9375rem', fontFamily: 'var(--font-display)' }}>
            {member.pseudonyme}
          </p>
          {member.is_admin && <Badge variant="gold">Admin</Badge>}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', marginTop: '0.1rem' }}>
          Membre depuis {new Date(member.date_adhesion).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.125rem' }}>Cotisation (Mois)</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600,
            color: member.has_paid_current_month ? 'var(--success)' : 'var(--warning)',
          }}>
            {member.has_paid_current_month ? 'Payé' : 'En attente'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.125rem' }}>Coefficient</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600,
            color: member.coefficient_actuel > 1 ? 'var(--danger)' : member.coefficient_actuel < 1 ? 'var(--success)' : 'var(--paper)',
          }}>
            ×{Number(member.coefficient_actuel).toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.125rem' }}>Sinistres</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600, color: member.nb_sinistres_periode > 0 ? 'var(--warning)' : 'var(--paper-dim)' }}>
            {member.nb_sinistres_periode}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Member Profile Modal ── */
const MemberProfileModal = ({ member, onClose }) => {
  if (!member) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(12,12,12,0.85)', backdropFilter: 'blur(8px)',
        zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--ink)', border: '1px solid var(--gold-line)',
          borderRadius: '8px', width: '100%', maxWidth: '450px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}
      >
        {/* Cover */}
        <div style={{
          height: '100px', background: 'linear-gradient(135deg, rgba(200,169,110,0.1), rgba(200,169,110,0.02))',
          position: 'relative', borderBottom: '1px solid var(--gold-line)'
        }}>
           <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', border: 'none', color: 'var(--paper)', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <X size={18}/>
           </button>
        </div>
        
        <div style={{ padding: '0 2rem 2rem', marginTop: '-40px' }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: member.is_admin ? 'linear-gradient(135deg, #c8a96e, #8b6914)' : 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', color: 'var(--paper)',
            border: `4px solid var(--ink)`, position: 'relative',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {member.pseudonyme.charAt(0).toUpperCase()}
            {member.is_admin && <Crown size={16} color="var(--gold)" style={{ position: 'absolute', top: -2, right: -2 }} />}
          </div>
          
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--paper)', lineHeight: 1 }}>
              {member.pseudonyme}
            </h2>
            {member.is_admin && <Badge variant="gold">Admin</Badge>}
          </div>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Membre depuis {new Date(member.date_adhesion).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(240,237,230,0.05)' }}>
            <Stat label="Cotisation" value={member.has_paid_current_month ? 'Payé' : 'En attente'} accent={member.has_paid_current_month ? 'var(--success)' : 'var(--warning)'} />
            <Stat label="Coefficient" value={`×${Number(member.coefficient_actuel).toFixed(2)}`} />
            <Stat label="Sinistres" value={member.nb_sinistres_periode} accent={member.nb_sinistres_periode > 0 ? 'var(--warning)' : undefined} />
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(240,237,230,0.4)', marginBottom: '1.25rem' }}>Profil Onboarding</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.25rem' }}>Âge</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--paper)', fontWeight: 500 }}>{member.tranche_age || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.25rem' }}>Profession</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--paper)', fontWeight: 500, textTransform: 'capitalize' }}>{member.situation_pro?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.25rem' }}>Région</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--paper)', fontWeight: 500 }}>{member.region || '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.3)', marginBottom: '0.25rem' }}>Niveau de risque</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--paper)', fontWeight: 500, textTransform: 'capitalize' }}>
                  {member.niveau_risque === 'prudent' ? '🟢 Prudent' : 
                   member.niveau_risque === 'modere' ? '🟡 Modéré' : 
                   member.niveau_risque === 'audacieux' ? '🔴 Audacieux' : member.niveau_risque || '—'}
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
};

export const GroupDetails = ({ user, navigate, groupId }) => {
  // groupId est passé directement depuis App.jsx

  const [group, setGroup]     = useState(null);
  const [cagnotte, setCagnotte] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [groupClaims, setGroupClaims] = useState([]);
  const [myRequest, setMyRequest] = useState(null); // 'none' | 'en_attente' | 'membre'
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState(null);
  const [myCotisations, setMyCotisations] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [appelLoading, setAppelLoading] = useState(false);
  const [montantAppel, setMontantAppel] = useState(50);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedClaimAction, setSelectedClaimAction] = useState(null); // { claim, action: 'validate'|'reject', amount: '', motif: '' }
  const [processingClaim, setProcessingClaim] = useState(false);
  const [previewClaimDoc, setPreviewClaimDoc] = useState(null);

  const handleViewClaimDoc = async (claim) => {
    try {
      const pieces = await api.getClaimPieces(claim.id);
      if (!pieces || pieces.length === 0) {
        showToast("Aucune pièce justificative jointe à ce sinistre.", "info");
        return;
      }
      const piece = pieces[0];
      const blob = await api.fetchClaimPieceBlob(claim.id, piece.id);
      const blobUrl = URL.createObjectURL(blob);
      const isPdf = (piece.hdfs_url || '').toLowerCase().endsWith('.pdf') || (piece.type_fichier || '').includes('pdf');
      setPreviewClaimDoc({
        blobUrl,
        isPdf,
        filename: piece.hdfs_url?.split('/').pop() || 'piece_justificative',
        claim,
      });
    } catch (e) {
      console.error(e);
      showToast("Impossible de charger la pièce justificative.", "error");
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [groupData, membersData, cagnotteData, cotisationsData, claimsData] = await Promise.all([
        api.getGroup(groupId),
        api.getGroupMembersEnriched(groupId).catch(() => []),
        api.getCagnotte(groupId).catch(() => null),
        (user?.id ? api.getMyCotisations(user.id).catch(() => []) : Promise.resolve([])),
        api.getClaims(groupId).catch(() => []),
      ]);
      setGroup(groupData);
      setMembers(membersData);
      setGroupClaims(claimsData);
      
      if (cagnotteData) {
        setCagnotte(cagnotteData);
        setMyCotisations(cotisationsData.filter(c => c.cagnotte_id === cagnotteData.id));
      }

      // Check if user is already member
      const isMember = membersData.some(m => m.utilisateur_id === user?.id);
      const isAdmin  = groupData.admin_id === user?.id;

      if (isAdmin) {
        const reqs = await api.getGroupJoinRequests(groupId).catch(() => []);
        setRequests(reqs.filter(r => r.statut === 'en_attente'));
        setMyRequest('admin');
      } else if (isMember) {
        setMyRequest('membre');
      } else {
        setMyRequest('none');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  useEffect(() => { load(); }, [load]);

  const handleValidateClaim = async (claimId, amount, note) => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Veuillez saisir un montant d\'indemnisation valide', 'error');
      return;
    }
    setProcessingClaim(true);
    try {
      await api.validateClaim(claimId, amount, note);
      showToast(`Sinistre validé avec succès ! ${amount} € ont été débités de la cagnotte du groupe.`);
      setSelectedClaimAction(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur lors de la validation.', 'error');
    } finally {
      setProcessingClaim(false);
    }
  };

  const handleRejectClaim = async (claimId, motif) => {
    if (!motif || motif.trim().length < 5) {
      showToast('Veuillez fournir un motif d\'au moins 5 caractères', 'error');
      return;
    }
    setProcessingClaim(true);
    try {
      await api.rejectClaim(claimId, motif);
      showToast('Sinistre rejeté.');
      setSelectedClaimAction(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur lors du rejet.', 'error');
    } finally {
      setProcessingClaim(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.joinGroup(groupId);
      setMyRequest('en_attente');
      showToast('Votre demande d\'adhésion a été envoyée !');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur lors de la demande.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleValidate = async (userId, requestId, statut) => {
    setProcessing(requestId);
    try {
      await api.validateJoinRequest(groupId, userId, statut);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (statut === 'acceptee') {
        showToast('Membre accepté avec succès.');
        // reload members list
        const updated = await api.getGroupMembersEnriched(groupId).catch(() => members);
        setMembers(updated);
      } else {
        showToast('Demande refusée.');
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handlePayment = async (cotisationId) => {
    setPayingId(cotisationId);
    try {
      const data = await api.createCheckoutSession(cotisationId);
      const targetUrl = data.checkout_url || data.url;
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        showToast('URL de redirection introuvable.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur lors de la redirection vers Stripe.', 'error');
    } finally {
      setPayingId(null);
    }
  };

  const handleAppelCotisation = async () => {
    if (!montantAppel || montantAppel <= 0) return showToast('Montant invalide', 'error');
    setAppelLoading(true);
    try {
      await api.appelCotisation(groupId, montantAppel);
      showToast('Appel de cotisation envoyé à tous les membres.');
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erreur lors de l\'appel de cotisation.', 'error');
    } finally {
      setAppelLoading(false);
    }
  };

  if (loading) return <PageLoader label="Chargement du groupe…" />;
  if (!group)  return (
    <div style={{ color: 'var(--paper)', textAlign: 'center', marginTop: '10rem' }}>
      <p>Groupe introuvable.</p>
      <Btn variant="ghost" onClick={() => navigate('/groups')} style={{ marginTop: '1rem' }}>← Retour</Btn>
    </div>
  );

  const isAdmin = myRequest === 'admin';
  const adminMember = members.find(m => m.is_admin);

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '5rem' }}>
      
      <AnimatePresence>
        {selectedMember && <MemberProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
      </AnimatePresence>

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
              background: toast.type === 'error' ? 'rgba(180,60,60,0.95)' : 'rgba(30,50,30,0.95)',
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

      <div className="container-editorial" style={{ maxWidth: '960px' }}>

        {/* ── Back + Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2.5rem' }}>
          <button
            onClick={() => navigate('/groups')}
            style={{
              background: 'none', border: '1px solid var(--gold-line)', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--paper-dim)', flexShrink: 0, marginTop: '0.25rem',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <p className="text-label" style={{ marginBottom: '0.25rem' }}>Groupe d'assurance</p>
            <h1 className="text-display-sm" style={{ marginBottom: '0.375rem' }}>
              <DisplayItalic>{group.nom}</DisplayItalic>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <Badge variant={group.est_ouvert ? 'success' : 'warning'}>
                {group.est_ouvert ? 'Ouvert aux adhésions' : 'Fermé'}
              </Badge>
              <span style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>{group.specialite}</span>
              {adminMember && (
                <span style={{ color: 'rgba(240,237,230,0.3)', fontSize: '0.75rem' }}>
                  · Admin : <span style={{ color: 'var(--gold)' }}>{adminMember.pseudonyme}</span>
                </span>
              )}
            </div>
          </div>

          {/* CTA Join */}
          {user && myRequest === 'none' && group.est_ouvert && (
            <Btn variant="primary" loading={joining} onClick={handleJoin} style={{ flexShrink: 0 }}>
              <UserPlus size={14} /> Rejoindre
            </Btn>
          )}
          {myRequest === 'en_attente' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', border: '1px solid var(--warning)',
              color: 'var(--warning)', fontSize: '0.8125rem', borderRadius: 2,
            }}>
              <Clock size={14} /> Demande en attente
            </div>
          )}
          {myRequest === 'membre' && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Btn variant="primary" onClick={() => navigate(`/claims/new?groupId=${groupId}`)} style={{ flexShrink: 0 }}>
                <AlertTriangle size={14} /> Déclarer un sinistre
              </Btn>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', border: '1px solid var(--success)',
                color: 'var(--success)', fontSize: '0.8125rem', borderRadius: 2,
              }}>
                <Check size={14} /> Vous êtes membre
              </div>
            </div>
          )}
          {myRequest === 'admin' && (
            <Btn variant="primary" onClick={() => navigate(`/claims/new?groupId=${groupId}`)} style={{ flexShrink: 0 }}>
              <AlertTriangle size={14} /> Déclarer un sinistre
            </Btn>
          )}
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Stats cards ── */}
          <motion.div variants={staggerItem}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
              {[
                { label: 'Cagnotte du groupe', value: cagnotte ? `${Number(cagnotte.solde_actuel).toFixed(2)} €` : '0.00 €', accent: 'var(--gold)', icon: Wallet },
                { label: 'Cotisation de base', value: `${group.cotisation_de_base} €/mois`, icon: Wallet },
                { label: 'Membres actifs', value: members.length || group.nb_membres_estime || '?', icon: Users },
                { label: 'Buffer pool cible', value: (myRequest === 'membre' || myRequest === 'admin') ? (group.buffer_pool_cible ? `${group.buffer_pool_cible} €` : '—') : 'Privé 🔒', icon: TrendingUp, accent: 'var(--success)' },
                { label: 'Capacité max', value: group.capacite_max || 'Illimitée', icon: Star },
              ].map(({ label, value, accent, icon: Icon }) => (
                <div key={label} style={{ background: 'var(--ink-90)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.35)' }}>{label}</p>
                    <Icon size={13} color={accent || 'rgba(240,237,230,0.2)'} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700, color: accent || 'var(--paper)', lineHeight: 1 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Cagnotte Globale du Groupe Section ── */}
          <motion.div variants={staggerItem}>
            <Card style={{ background: 'linear-gradient(135deg, rgba(197,160,89,0.08), rgba(18,20,24,0.95))', border: '1px solid var(--gold-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <SectionLabel>Fonds Mutuels & Cagnotte du Groupe</SectionLabel>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
                    {cagnotte ? `${Number(cagnotte.solde_actuel).toFixed(2)} €` : '0.00 €'}
                  </h2>
                  <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Solde actuel de la réserve commune pour l'indemnisation des membres du groupe.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.3)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(240,237,230,0.06)' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', fontWeight: 600 }}>+ Cotisations (Entrées)</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', marginTop: '0.2rem' }}>Ajoutées à chaque paiement</p>
                  </div>
                  <div style={{ borderLeft: '1px solid rgba(240,237,230,0.1)', paddingLeft: '1.5rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)', fontWeight: 600 }}>- Sinistres (Sorties)</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', marginTop: '0.2rem' }}>Déduits à chaque indemnisation</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Cotisations for current member ── */}
          {(myRequest === 'membre' || myRequest === 'admin') && (
            <motion.div variants={staggerItem}>
              <Card>
                <SectionLabel>Mes cotisations pour ce groupe</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {myCotisations.length === 0 && (
                    <p className="text-caption" style={{ paddingBlock: '1.5rem' }}>Aucune cotisation due.</p>
                  )}
                  {myCotisations.map((cot, i) => (
                    <div key={cot.id} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '1rem 0',
                      borderBottom: i < myCotisations.length - 1 ? '1px solid rgba(240,237,230,0.05)' : 'none',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--paper)', fontWeight: 500 }}>
                          Cotisation - {cot.montant_final} €
                        </p>
                        <p className="text-caption" style={{ marginTop: '0.125rem' }}>
                          Statut : {cot.statut_paiement}
                        </p>
                      </div>
                      {cot.statut_paiement === 'en_attente' && (
                        <Btn variant="primary" loading={payingId === cot.id} onClick={() => handlePayment(cot.id)}>
                          Payer ma cotisation
                        </Btn>
                      )}
                      {cot.statut_paiement === 'paye' && (
                        <Badge variant="success">Payé</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Members list ── */}
          <motion.div variants={staggerItem}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Users size={15} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Membres du groupe</SectionLabel>
                  {(myRequest === 'membre' || myRequest === 'admin') && (
                    <span style={{
                      background: 'rgba(200,169,110,0.15)', color: 'var(--gold)',
                      borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 700,
                      padding: '0.1rem 0.5rem',
                    }}>
                      {members.length}
                    </span>
                  )}
                </div>
              </div>

              {!(myRequest === 'membre' || myRequest === 'admin') ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--paper-dim)', background: 'var(--ink-90)', border: '1px solid var(--gold-line)', borderRadius: '4px' }}>
                  <Shield size={30} style={{ margin: '0 auto 0.75rem', opacity: 0.5, color: 'var(--gold)' }} />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--paper)' }}>Informations privées 🔒</p>
                  <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Rejoignez ce groupe pour consulter la liste des membres et leurs statistiques de sinistralité.</p>
                </div>
              ) : members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--paper-dim)' }}>
                  <Users size={30} style={{ margin: '0 auto 0.75rem', opacity: 0.2, display: 'block' }} />
                  <p style={{ fontSize: '0.875rem' }}>Aucun membre pour l'instant.</p>
                </div>
              ) : (
                <div style={{ borderRadius: 2, overflow: 'hidden', border: '1px solid var(--gold-line)' }}>
                  {/* Table header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.625rem 1.25rem', background: 'var(--ink-80)',
                    borderBottom: '1px solid var(--gold-line)',
                  }}>
                    <div style={{ width: 36, flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)' }}>Membre</p>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)', width: 80, textAlign: 'right' }}>Cotisation</p>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)', width: 80, textAlign: 'right' }}>Coefficient</p>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)', width: 60, textAlign: 'right' }}>Sinistres</p>
                  </div>
                  {members.map((m, i) => <MemberRow key={m.utilisateur_id} member={m} index={i} onClick={() => setSelectedMember(m)} />)}
                </div>
              )}
            </Card>
          </motion.div>

          {/* ── Admin: pending requests & actions ── */}
          {isAdmin && (
            <motion.div variants={staggerItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <Card style={{ borderLeft: '3px solid var(--gold)', background: 'rgba(200,169,110,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <Shield size={15} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Gestion des cotisations</SectionLabel>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--paper)', marginBottom: '0.5rem' }}>Montant de l'appel (en €)</p>
                    <input
                      type="number"
                      value={montantAppel}
                      onChange={e => setMontantAppel(e.target.value)}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', background: 'var(--ink-90)',
                        border: '1px solid var(--gold-line)', color: 'var(--paper)', borderRadius: 2
                      }}
                    />
                  </div>
                  <Btn variant="primary" loading={appelLoading} onClick={handleAppelCotisation} style={{ flexShrink: 0 }} disabled={cagnotte?.cotisation_appelee}>
                    {cagnotte?.cotisation_appelee ? 'Cotisation appelée ce mois' : 'Imposer la cotisation'}
                  </Btn>
                </div>
                {cagnotte?.cotisation_appelee && (
                  <p className="text-caption" style={{ marginTop: '0.5rem', color: 'var(--warning)' }}>
                    Vous avez déjà déclenché un appel de cotisation pour le mois en cours ({cagnotte.periode_courante}).
                  </p>
                )}
                <p className="text-caption" style={{ marginTop: '0.75rem' }}>
                  Ceci générera une demande de paiement pour tous les membres actifs du groupe (ajustée selon leur coefficient).
                </p>
              </Card>

              <Card style={{ borderLeft: '3px solid var(--gold)', background: 'rgba(200,169,110,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <Shield size={15} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Demandes d'adhésion en attente</SectionLabel>
                  {requests.length > 0 && (
                    <motion.span
                      key={requests.length}
                      initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                      style={{
                        background: 'var(--gold)', color: 'var(--ink)', borderRadius: '999px',
                        fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem',
                      }}
                    >
                      {requests.length}
                    </motion.span>
                  )}
                </div>

                {requests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--paper-dim)' }}>
                    <Clock size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.25, display: 'block' }} />
                    <p style={{ fontSize: '0.875rem' }}>Aucune demande en attente.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
                    <AnimatePresence>
                      {requests.map(req => (
                        <motion.div
                          key={req.id}
                          layout
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          transition={{ duration: 0.25 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            background: 'var(--ink-90)', padding: '1rem 1.25rem',
                            justifyContent: 'space-between', flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--paper)',
                              border: '1px solid var(--gold-line)',
                            }}>
                              {(req.pseudonyme_demandeur || req.utilisateur_id?.toString().substring(0,1))?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.9375rem', fontFamily: 'var(--font-display)' }}>
                                {req.pseudonyme_demandeur || `Utilisateur ${req.utilisateur_id?.toString().substring(0,8)}…`}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', marginTop: '0.1rem' }}>
                                {new Date(req.date_demande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                            {req.score_compatibilite && (
                              <Badge variant="gold">Match {Math.round(req.score_compatibilite * 100)}%</Badge>
                            )}
                            <button
                              disabled={processing === req.id}
                              onClick={() => handleValidate(req.utilisateur_id, req.id, 'acceptee')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.875rem', border: '1px solid var(--success)',
                                background: 'rgba(90,158,124,0.12)', color: 'var(--success)',
                                borderRadius: 2, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                              }}
                            >
                              <Check size={13} /> Accepter
                            </button>
                            <button
                              disabled={processing === req.id}
                              onClick={() => handleValidate(req.utilisateur_id, req.id, 'refusee')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.4rem 0.875rem', border: '1px solid var(--danger)',
                                background: 'rgba(200,90,90,0.08)', color: 'var(--danger)',
                                borderRadius: 2, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                              }}
                            >
                              <X size={13} /> Refuser
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* ── Sinistres du groupe Section ── */}
          {(myRequest === 'membre' || myRequest === 'admin') && (
            <motion.div variants={staggerItem}>
              <Card style={isAdmin ? { borderLeft: '3px solid var(--gold)', background: 'rgba(200,169,110,0.02)' } : {}}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <AlertTriangle size={15} color="var(--gold)" />
                    <SectionLabel style={{ margin: 0 }}>Sinistres déclarés dans ce groupe</SectionLabel>
                    {groupClaims.length > 0 && (
                      <span style={{
                        background: 'rgba(200,169,110,0.15)', color: 'var(--gold)',
                        borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 700,
                        padding: '0.1rem 0.5rem',
                      }}>
                        {groupClaims.length}
                      </span>
                    )}
                  </div>
                  <Btn variant="ghost" onClick={() => navigate(`/claims/new?groupId=${groupId}`)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
                    + Déclarer un sinistre
                  </Btn>
                </div>

                {groupClaims.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--paper-dim)' }}>
                    <AlertTriangle size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.25, display: 'block' }} />
                    <p style={{ fontSize: '0.875rem' }}>Aucun sinistre n'a été déclaré dans ce groupe.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)', borderRadius: 2, overflow: 'hidden' }}>
                    {groupClaims.map(claim => {
                      const isPending = claim.statut === 'en_attente';
                      const statusV = claim.statut === 'validee' ? 'success' : claim.statut === 'rejetee' ? 'danger' : 'warning';
                      const statusL = claim.statut === 'validee' ? 'Approuvé' : claim.statut === 'rejetee' ? 'Rejeté' : 'En attente';
                      const isTargetedAction = selectedClaimAction?.claimId === claim.id;

                      return (
                        <div
                          key={claim.id}
                          style={{
                            background: 'var(--ink-90)', padding: '1rem 1.25rem',
                            display: 'flex', flexDirection: 'column', gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>
                                {new Date(claim.date_declaration).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                              <Badge variant={statusV}>{statusL}</Badge>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontWeight: 600, fontSize: '0.9375rem' }}>
                                Déclaré : {claim.montant_declare} €
                              </span>
                              {claim.montant_approuve && (
                                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--success)', fontWeight: 600, fontSize: '0.9375rem' }}>
                                  (Approuvé : {claim.montant_approuve} €)
                                </span>
                              )}

                              {claim.score_fraude != null && (
                                <span style={{
                                  fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4,
                                  background: claim.score_fraude >= 0.5 ? 'rgba(200,90,90,0.15)' : claim.score_fraude >= 0.25 ? 'rgba(200,169,110,0.15)' : 'rgba(90,158,124,0.15)',
                                  color: claim.score_fraude >= 0.5 ? 'var(--danger)' : claim.score_fraude >= 0.25 ? 'var(--gold)' : 'var(--success)',
                                  border: `1px solid ${claim.score_fraude >= 0.5 ? 'rgba(200,90,90,0.3)' : claim.score_fraude >= 0.25 ? 'rgba(200,169,110,0.3)' : 'rgba(90,158,124,0.3)'}`,
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                                }}>
                                  {claim.score_fraude >= 0.5 ? '🔴 Alerte Fraude IA' : claim.score_fraude >= 0.25 ? '🟠 Risque Modéré' : '🟢 Conforme IA'} ({(claim.score_fraude * 100).toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          </div>

                          <p style={{ color: 'var(--paper)', fontSize: '0.875rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: 4, margin: 0 }}>
                            {claim.description}
                          </p>

                          {/* AI Summary and Doc Button */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(200,169,110,0.04)', border: '1px solid rgba(200,169,110,0.15)', padding: '0.75rem 1rem', borderRadius: 4 }}>
                            {claim.resume_ia && (
                              <p style={{ color: 'var(--paper)', fontSize: '0.8125rem', lineHeight: 1.4, margin: 0 }}>
                                <strong style={{ color: 'var(--gold)' }}>🧠 Analyse IA :</strong> {claim.resume_ia}
                              </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: claim.resume_ia ? '0.5rem' : 0, borderTop: claim.resume_ia ? '1px solid rgba(200,169,110,0.08)' : 'none' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>Pièce justificative jointe</span>
                              <button
                                onClick={() => handleViewClaimDoc(claim)}
                                style={{
                                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(240,237,230,0.1)',
                                  color: 'var(--gold)', padding: '0.25rem 0.6rem', borderRadius: 3, cursor: 'pointer',
                                  fontSize: '0.75rem', fontWeight: 600
                                }}
                              >
                                📄 Examiner la pièce jointe
                              </button>
                            </div>
                          </div>

                          {claim.statut === 'validee' && claim.commentaire_validation && (
                            <div style={{ background: 'rgba(90,158,124,0.08)', borderLeft: '3px solid var(--success)', padding: '0.625rem 0.875rem', borderRadius: 4 }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Note / Raison de la décision d'indemnisation :
                              </p>
                              <p style={{ color: 'var(--paper)', fontSize: '0.84375rem', marginTop: '0.25rem', margin: 0, lineHeight: 1.4 }}>
                                {claim.commentaire_validation}
                              </p>
                            </div>
                          )}

                          {claim.statut === 'rejetee' && (
                            <div style={{ background: 'rgba(200,90,90,0.08)', borderLeft: '3px solid var(--danger)', padding: '0.625rem 0.875rem', borderRadius: 4 }}>
                              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Motif du rejet par l'administrateur :
                              </p>
                              <p style={{ color: 'var(--paper)', fontSize: '0.84375rem', marginTop: '0.25rem', margin: 0, lineHeight: 1.4 }}>
                                {claim.motif_rejet || 'Votre demande de sinistre a été refusée par l\'administrateur du groupe.'}
                              </p>
                            </div>
                          )}

                          {/* Controls for Admin on pending claims */}
                          {isAdmin && isPending && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(240,237,230,0.05)' }}>
                              {isTargetedAction ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                                  {selectedClaimAction.action === 'validate' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>Montant à indemniser (€) :</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={selectedClaimAction.amount}
                                          onChange={e => setSelectedClaimAction({ ...selectedClaimAction, amount: e.target.value })}
                                          style={{ width: '130px', padding: '0.35rem 0.6rem', background: 'var(--ink)', border: '1px solid var(--gold-line)', color: 'var(--paper)', borderRadius: 2, fontSize: '0.875rem' }}
                                        />
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Raison de l'ajustement / Note (ex: plafonnement, remboursement partiel)..."
                                        value={selectedClaimAction.note || ''}
                                        onChange={e => setSelectedClaimAction({ ...selectedClaimAction, note: e.target.value })}
                                        style={{ width: '100%', padding: '0.35rem 0.6rem', background: 'var(--ink)', border: '1px solid var(--gold-line)', color: 'var(--paper)', borderRadius: 2, fontSize: '0.8125rem' }}
                                      />
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <Btn variant="ghost" onClick={() => setSelectedClaimAction(null)} style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}>
                                          Annuler
                                        </Btn>
                                        <Btn
                                          variant="primary"
                                          loading={processingClaim}
                                          onClick={() => handleValidateClaim(claim.id, selectedClaimAction.amount, selectedClaimAction.note)}
                                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
                                        >
                                          Confirmer & Débiter Cagnotte
                                        </Btn>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <input
                                        type="text"
                                        placeholder="Motif du rejet (min. 5 caract.)..."
                                        value={selectedClaimAction.motif}
                                        onChange={e => setSelectedClaimAction({ ...selectedClaimAction, motif: e.target.value })}
                                        style={{ flex: 1, minWidth: '200px', padding: '0.35rem 0.6rem', background: 'var(--ink)', border: '1px solid var(--gold-line)', color: 'var(--paper)', borderRadius: 2, fontSize: '0.875rem' }}
                                      />
                                      <button
                                        disabled={processingClaim}
                                        onClick={() => handleRejectClaim(claim.id, selectedClaimAction.motif)}
                                        style={{ padding: '0.35rem 0.85rem', background: 'rgba(200,90,90,0.2)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 2, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                                      >
                                        Confirmer le rejet
                                      </button>
                                    </>
                                  )}
                                  {selectedClaimAction.action !== 'validate' && (
                                    <Btn variant="ghost" onClick={() => setSelectedClaimAction(null)} style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}>
                                      Annuler
                                    </Btn>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setSelectedClaimAction({ claimId: claim.id, action: 'validate', amount: claim.montant_declare, motif: '', note: '' })}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                                      padding: '0.4rem 0.875rem', border: '1px solid var(--success)',
                                      background: 'rgba(90,158,124,0.12)', color: 'var(--success)',
                                      borderRadius: 2, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                                    }}
                                  >
                                    <Check size={13} /> Valider & Débiter Cagnotte
                                  </button>
                                  <button
                                    onClick={() => setSelectedClaimAction({ claimId: claim.id, action: 'reject', amount: '', motif: '' })}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                                      padding: '0.4rem 0.875rem', border: '1px solid var(--danger)',
                                      background: 'rgba(200,90,90,0.08)', color: 'var(--danger)',
                                      borderRadius: 2, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                                    }}
                                  >
                                    <X size={13} /> Rejeter
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* ── KYC warning for non-verified ── */}
          {user && user.kyc_status !== 'verified' && myRequest === 'none' && (
            <motion.div variants={staggerItem}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '1rem 1.25rem', background: 'rgba(200,134,78,0.05)',
                borderLeft: '3px solid var(--warning)',
              }}>
                <AlertCircle size={18} color="var(--warning)" />
                <div>
                  <p style={{ fontWeight: 600, color: '#E0A870', fontSize: '0.875rem' }}>Vérification KYC requise</p>
                  <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', marginTop: '0.1rem' }}>
                    Complétez votre KYC pour pouvoir rejoindre ce groupe.
                  </p>
                </div>
                <Btn variant="secondary" onClick={() => navigate('/kyc')} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  Vérifier
                </Btn>
              </div>
            </motion.div>
          )}

        </motion.div>

        {/* Modal Visualiseur de pièce justificative */}
        {previewClaimDoc && (
          <div
            onClick={() => {
              if (previewClaimDoc.blobUrl) URL.revokeObjectURL(previewClaimDoc.blobUrl);
              setPreviewClaimDoc(null);
            }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5,5,8,0.92)', backdropFilter: 'blur(8px)', zIndex: 999999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--ink)', border: '1px solid var(--gold-line)',
                borderRadius: 8, maxWidth: '850px', width: '100%', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(240,237,230,0.08)' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                    Examen Administrateur • Pièce de Sinistre
                  </span>
                  <h4 style={{ color: 'var(--paper)', margin: '0.2rem 0 0', fontFamily: 'var(--font-display)' }}>
                    {previewClaimDoc.filename}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    if (previewClaimDoc.blobUrl) URL.revokeObjectURL(previewClaimDoc.blobUrl);
                    setPreviewClaimDoc(null);
                  }}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--paper)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#0a0a0c', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewClaimDoc.isPdf ? (
                  <iframe src={previewClaimDoc.blobUrl} title="Aperçu Justificatif" style={{ width: '100%', height: '550px', border: '1px solid rgba(240,237,230,0.1)', borderRadius: 4, background: '#fff' }} />
                ) : (
                  <img src={previewClaimDoc.blobUrl} alt="Justificatif de sinistre" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 4 }} />
                )}
              </div>

              <div style={{ padding: '0.875rem 1.5rem', background: 'var(--ink-90)', borderTop: '1px solid rgba(240,237,230,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  href={previewClaimDoc.blobUrl}
                  download={previewClaimDoc.filename}
                  style={{ color: 'var(--gold)', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 600 }}
                >
                  ⬇️ Télécharger le fichier original
                </a>
                <Btn variant="primary" onClick={() => {
                  if (previewClaimDoc.blobUrl) URL.revokeObjectURL(previewClaimDoc.blobUrl);
                  setPreviewClaimDoc(null);
                }}>
                  Fermer l'examen
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

