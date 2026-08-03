import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Wallet, TrendingUp, FileText, AlertTriangle, AlertCircle, Check, ChevronLeft, X, UserCheck, Clock, Shield } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, staggerContainer, staggerItem, Card, Btn, Badge, SectionLabel, PageLoader, DisplayItalic } from '../ui.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTip } from 'recharts';

const KpiCard = ({ title, value, icon: Icon, accent }) => (
  <motion.div variants={staggerItem}>
    <Card className="bracket-corner" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="text-label">{title}</p>
        <Icon size={14} color={accent || 'var(--gold)'} />
      </div>
      <div className="stat-number" style={{ color: accent || 'var(--gold)' }}>{value}</div>
    </Card>
  </motion.div>
);

export const DashboardPage = ({ user, navigate }) => {
  const [data, setData] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  const isAdmin = user?.role === 'admin_groupe';

  const load = useCallback(async () => {
    const dbData = await api.getDashboardData();
    let recs = [];
    if (user.onboarding_complete) {
      recs = await api.getRecommendations().catch(() => []);
    }
    setData({ ...dbData, recommendations: recs });
    setPendingRequests(dbData.pendingRequests || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (groupId, userId, statut, requestId) => {
    setProcessingId(requestId);
    try {
      await api.validateJoinRequest(groupId, userId, statut);
      // Optimistic: retirer la demande de la liste immédiatement
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e) {
      console.error('Erreur lors de la validation:', e);
    } finally {
      setProcessingId(null);
    }
  };

  if (!data) return <PageLoader label="Chargement de TrustPool…" />;

  const chartData = [
    { name: 'Cagnotte Principale', value: 45000, color: 'var(--gold)' },
    { name: 'Buffer Pool',         value: 12650, color: 'var(--slate-light)' },
  ];

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial">
        {/* ── Header ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div>
            <p className="text-label" style={{ marginBottom: '0.5rem' }}>Dashboard</p>
            <h1 className="text-display-sm">
              Bonjour, <DisplayItalic>{user.pseudonyme}</DisplayItalic>
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', marginTop: '0.25rem', fontWeight: 300 }}>
              Résumé de votre activité d'assurance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={() => navigate('/claims/new')}>
              <AlertTriangle size={14} /> Déclarer un sinistre
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/groups')}>
              Rechercher un groupe
            </Btn>
          </div>
        </div>

        {/* ── KYC warning banner ── */}
        {user.kyc_status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
              padding: '1.25rem 1.5rem', marginBottom: '2rem',
              background: 'rgba(200,134,78,0.05)', borderLeft: '3px solid var(--warning)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={18} color="var(--warning)" />
              <div>
                <p style={{ fontWeight: 600, color: '#E0A870', fontSize: '0.9375rem' }}>Vérification d'identité requise</p>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>Complétez votre KYC pour interagir avec les groupes.</p>
              </div>
            </div>
            <Btn variant="secondary" onClick={() => navigate('/kyc')}>Vérifier maintenant</Btn>
          </motion.div>
        )}

        {/* ── KPI Row ── */}
        <motion.div
          variants={staggerContainer} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--gold-line)', marginBottom: '2px' }}
        >
          <KpiCard title="Groupes Rejoints"    value={data.groupsJoined}                            icon={Users}    />
          <KpiCard title="Cagnotte Globale"    value={`${data.totalCagnotte.toLocaleString()} €`}   icon={Wallet}   accent="var(--success)" />
          <KpiCard title="Prochaine Cotisation" value={`${data.nextPayment} €`}                     icon={TrendingUp} accent="var(--warning)" />
          <KpiCard title="Sinistres Actifs"    value={data.activeClaims}                            icon={FileText} accent="var(--danger)"  />
        </motion.div>

        {/* ── Admin panel: demandes d'adhésion ── */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ marginTop: '1.5rem' }}
          >
            <Card style={{ borderLeft: '3px solid var(--gold)', background: 'rgba(200,169,110,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Shield size={15} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Demandes d'adhésion en attente</SectionLabel>
                  {pendingRequests.length > 0 && (
                    <motion.span
                      key={pendingRequests.length}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      style={{
                        background: 'var(--gold)', color: 'var(--ink)', borderRadius: '999px',
                        fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.5rem', lineHeight: 1.6,
                      }}
                    >
                      {pendingRequests.length}
                    </motion.span>
                  )}
                </div>
              </div>

              {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--paper-dim)' }}>
                  <Clock size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.3, display: 'block' }} />
                  <p style={{ fontSize: '0.875rem' }}>Aucune demande en attente.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
                  <AnimatePresence>
                    {pendingRequests.map(req => (
                      <motion.div
                        key={req.id}
                        layout
                        initial={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.25 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                          background: 'var(--ink-90)', padding: '1rem 1.25rem',
                          justifyContent: 'space-between',
                        }}
                      >
                        {/* Infos demandeur */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--paper)',
                            border: '1px solid var(--gold-line)',
                          }}>
                            {req.pseudonyme_demandeur?.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.9375rem', fontFamily: 'var(--font-display)' }}>
                              {req.pseudonyme_demandeur}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Groupe : <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{req.nom_groupe}</span>
                              {' · '}
                              {new Date(req.date_demande).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        {/* Score + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          {req.score_compatibilite !== null && (
                            <Badge variant="gold">
                              Match {Math.round(req.score_compatibilite * 100)}%
                            </Badge>
                          )}
                          <button
                            id={`accept-${req.id}`}
                            disabled={processingId === req.id}
                            onClick={() => handleValidate(req.groupe_id, req.utilisateur_id, 'acceptee', req.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.4rem 0.875rem', border: '1px solid var(--success)',
                              background: processingId === req.id ? 'rgba(90,158,124,0.08)' : 'rgba(90,158,124,0.12)',
                              color: 'var(--success)', borderRadius: 2, cursor: 'pointer',
                              fontSize: '0.8125rem', fontWeight: 600, transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(90,158,124,0.22)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(90,158,124,0.12)'}
                          >
                            <Check size={13} /> Accepter
                          </button>
                          <button
                            id={`reject-${req.id}`}
                            disabled={processingId === req.id}
                            onClick={() => handleValidate(req.groupe_id, req.utilisateur_id, 'refusee', req.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.4rem 0.875rem', border: '1px solid var(--danger)',
                              background: 'rgba(200,90,90,0.08)',
                              color: 'var(--danger)', borderRadius: 2, cursor: 'pointer',
                              fontSize: '0.8125rem', fontWeight: 600, transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,90,90,0.18)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,90,90,0.08)'}
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

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1.5rem' }} className="dashboard-grid">
          {/* Chart */}
          <Card>
            <SectionLabel>Répartition des fonds</SectionLabel>
            <div style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RechartsTip
                    contentStyle={{ background: 'var(--ink-90)', border: '1px solid var(--gold-line)', borderRadius: 2, fontFamily: 'var(--font-body)', fontSize: '0.8125rem' }}
                    itemStyle={{ color: 'var(--paper)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              {chartData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <span className="text-caption">{d.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Groups */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <SectionLabel>Mes groupes</SectionLabel>
              <button onClick={() => navigate('/groups')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                Explorer →
              </button>
            </div>

            {(data.groups || []).length === 0 ? (
              /* ── Empty state ── */
              <div style={{ textAlign: 'center', paddingBlock: '2.5rem' }}>
                <div style={{ width: 44, height: 44, border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Users size={18} color="rgba(200,169,110,0.4)" />
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--paper)', marginBottom: '0.375rem' }}>Vous n'avez rejoint aucun groupe</p>
                <p className="text-caption" style={{ marginBottom: '1.5rem', maxWidth: '28ch', margin: '0 auto 1.5rem' }}>
                  Explorez les groupes disponibles et faites une demande d'adhésion.
                </p>
                <Btn variant="primary" onClick={() => navigate('/groups')}>
                  Trouver un groupe
                </Btn>

                {/* Suggestion rapide des groupes publics */}
                {(data.suggestedGroups || []).length > 0 && (
                  <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(240,237,230,0.06)', paddingTop: '1.5rem' }}>
                    <p className="text-label" style={{ marginBottom: '1rem', textAlign: 'left' }}>Groupes disponibles</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
                      {data.suggestedGroups.slice(0, 3).map(g => (
                        <div
                          key={g.id}
                          onClick={() => navigate(`/groups/${g.id}`)}
                          style={{ background: 'var(--ink-90)', padding: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-80)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--ink-90)'}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--paper)', marginBottom: '0.125rem' }}>{g.nom}</h4>
                            <p className="text-caption">{g.specialite}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span style={{ color: 'var(--gold)', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{g.cotisation_de_base} €<span style={{ color: 'var(--paper-dim)', fontWeight: 300, fontSize: '0.75rem' }}>/mois</span></span>
                            <Badge variant={g.est_ouvert ? 'success' : 'warning'}>{g.est_ouvert ? 'ouvert' : 'complet'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Groups list ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
                {(data.groups || []).slice(0, 4).map(g => (
                  <div
                    key={g.id}
                    onClick={() => navigate(`/groups/${g.id}`)}
                    style={{ background: 'var(--ink-90)', padding: '1.25rem', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-80)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--ink-90)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--paper)' }}>{g.nom}</h4>
                      <Badge variant={g.est_ouvert ? 'success' : 'warning'}>{g.est_ouvert ? 'ouvert' : 'complet'}</Badge>
                    </div>
                    <p className="text-caption" style={{ marginBottom: '0.75rem' }}>{g.specialite}</p>
                    <span style={{ color: 'var(--gold)', fontSize: '0.9375rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{g.cotisation_de_base} €<span style={{ color: 'var(--paper-dim)', fontWeight: 300, fontSize: '0.8125rem' }}>/mois</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card>


          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <Card gold>
              <SectionLabel>Recommandations IA</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {data.recommendations.slice(0, 3).map(rec => (
                  <div
                    key={rec.groupe.id}
                    onClick={() => navigate(`/groups/${rec.groupe.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem', background: 'var(--ink-80)', cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-60)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--ink-80)'}
                  >
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--paper)', marginBottom: '0.2rem' }}>{rec.groupe.nom}</p>
                      <p className="text-caption">{rec.groupe.specialite}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <Badge variant="gold">Match {Math.round(rec.score_compatibilite * 100)}%</Badge>
                      <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent activity */}
          <Card>
            <SectionLabel>Activité récente</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {data.recentActivity.length === 0 && (
                <p className="text-caption" style={{ paddingBlock: '1.5rem' }}>Aucune activité récente.</p>
              )}
              {data.recentActivity.map((notif, i) => (
                <div key={notif.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '0.875rem 0',
                  borderBottom: i < data.recentActivity.length - 1 ? '1px solid rgba(240,237,230,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: notif.type === 'alert' ? 'rgba(200,90,90,0.12)' : 'rgba(90,158,124,0.12)',
                    marginTop: '0.1rem',
                  }}>
                    {notif.type === 'alert'
                      ? <AlertTriangle size={12} color="#E08888" />
                      : <Check size={12} color="#7FC9A0" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', color: notif.read ? 'var(--paper-dim)' : 'var(--paper)', fontWeight: notif.read ? 300 : 500 }}>{notif.title}</p>
                    <p className="text-caption" style={{ marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.message}</p>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'rgba(240,237,230,0.25)', flexShrink: 0 }}>{notif.date}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr 2fr !important;
            grid-template-rows: auto auto auto;
          }
          .dashboard-grid > :nth-child(1) { grid-row: 1; grid-column: 1; }
          .dashboard-grid > :nth-child(2) { grid-row: 1 / 3; grid-column: 2; }
          .dashboard-grid > :nth-child(3) { grid-row: 2; grid-column: 1; }
          .dashboard-grid > :nth-child(4) { grid-row: 3; grid-column: 1 / 3; }
        }
      `}</style>
    </motion.div>
  );
};
