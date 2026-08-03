import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowLeft, Users, CheckCircle2, XCircle, Clock,
  Wallet, TrendingUp, Star, UserPlus, Crown, AlertCircle, Check, X
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

/* ── member avatar row ── */
const MemberRow = ({ member, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.875rem',
      padding: '0.875rem 1.25rem',
      background: index % 2 === 0 ? 'var(--ink-90)' : 'var(--ink-80)',
      borderBottom: '1px solid rgba(240,237,230,0.04)',
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

export const GroupDetails = ({ user, navigate, groupId }) => {
  // groupId est passé directement depuis App.jsx

  const [group, setGroup]     = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null); // 'none' | 'en_attente' | 'membre'
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [groupData, membersData] = await Promise.all([
        api.getGroup(groupId),
        api.getGroupMembersEnriched(groupId).catch(() => []),
      ]);
      setGroup(groupData);
      setMembers(membersData);

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
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', border: '1px solid var(--success)',
              color: 'var(--success)', fontSize: '0.8125rem', borderRadius: 2,
            }}>
              <Check size={14} /> Vous êtes membre
            </div>
          )}
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── Stats cards ── */}
          <motion.div variants={staggerItem}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
              {[
                { label: 'Cotisation de base', value: `${group.cotisation_de_base} €/mois`, accent: 'var(--gold)', icon: Wallet },
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
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)', width: 80, textAlign: 'right' }}>Coefficient</p>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.35)', width: 60, textAlign: 'right' }}>Sinistres</p>
                  </div>
                  {members.map((m, i) => <MemberRow key={m.utilisateur_id} member={m} index={i} />)}
                </div>
              )}
            </Card>
          </motion.div>

          {/* ── Admin: pending requests ── */}
          {isAdmin && (
            <motion.div variants={staggerItem}>
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
      </div>
    </motion.div>
  );
};
