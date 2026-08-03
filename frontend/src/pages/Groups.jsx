import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, SectionLabel, Badge, PageLoader, DisplayItalic } from '../ui.jsx';

export const GroupsExplorer = ({ navigate }) => {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(new Set());

  useEffect(() => {
    api.getGroups()
      .then(data => setGroups(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async (groupId, e) => {
    e.stopPropagation();
    try {
      await api.joinGroup(groupId);
      setRequested(prev => new Set(prev).add(groupId));
      alert('Demande d\'adhésion envoyée avec succès.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la demande d\'adhésion.');
    }
  };

  if (loading) return <PageLoader label="Chargement des groupes…" />;

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial">
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
          <div>
            <SectionLabel>Explorer</SectionLabel>
            <h1 className="text-display-sm">
              Groupes <DisplayItalic>Publics</DisplayItalic>
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
              {groups.length} groupe{groups.length !== 1 ? 's' : ''} disponible{groups.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <Card style={{ textAlign: 'center', paddingBlock: '4rem' }}>
            <Shield size={32} color="rgba(240,237,230,0.1)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--paper-dim)' }}>Aucun groupe disponible pour le moment.</p>
          </Card>
        ) : (
          /* Editorial grid — 1px gap acting as rule lines */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/groups/${group.id}`)}
                style={{
                  background: 'var(--ink)', padding: '2rem',
                  cursor: 'pointer', transition: 'background 0.2s',
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-90)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--ink)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={14} color="var(--gold)" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {requested.has(group.id) ? (
                      <Badge variant="success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} /> Demandé
                      </Badge>
                    ) : (
                      group.est_ouvert && (
                        <button
                          onClick={(e) => handleJoin(group.id, e)}
                          title="Faire une demande d'adhésion"
                          style={{
                            background: 'none', border: '1px solid var(--gold)', borderRadius: '50%',
                            width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.children[0].style.color = 'var(--ink)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.children[0].style.color = 'var(--gold)'; }}
                        >
                          <UserPlus size={14} color="var(--gold)" style={{ transition: 'color 0.2s' }} />
                        </button>
                      )
                    )}
                    <Badge variant={group.est_ouvert ? 'success' : 'danger'}>
                      {group.est_ouvert ? 'Ouvert' : 'Complet'}
                    </Badge>
                  </div>
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--paper)', marginBottom: '0.375rem' }}>
                  {group.nom}
                </h3>
                <p className="text-caption" style={{ marginBottom: '2rem', flex: 1 }}>{group.specialite}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(240,237,230,0.06)', paddingTop: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.3)', marginBottom: '0.2rem' }}>Cotisation</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {group.cotisation_de_base} <span style={{ fontSize: '0.8rem', color: 'var(--paper-dim)', fontWeight: 300 }}>€/mois</span>
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,237,230,0.3)', marginBottom: '0.2rem' }}>Capacité</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--paper)' }}>
                      {group.capacite_max || '∞'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
