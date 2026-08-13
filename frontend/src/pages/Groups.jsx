import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, UserPlus, CheckCircle2, Search } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, SectionLabel, Badge, PageLoader, DisplayItalic } from '../ui.jsx';

export const GroupsExplorer = ({ navigate }) => {
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredGroups = groups
    .filter(g => 
      g.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
      g.specialite.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (!searchQuery) return 0;
      const q = searchQuery.toLowerCase();
      const aStarts = a.nom.toLowerCase().startsWith(q) || a.specialite.toLowerCase().startsWith(q);
      const bStarts = b.nom.toLowerCase().startsWith(q) || b.specialite.toLowerCase().startsWith(q);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    nom: '',
    specialite: 'Équipements électroniques',
    description: '',
    cotisation_de_base: 50,
    capacite_max: 50,
    est_ouvert: true
  });

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.createGroup({
        ...newGroupData,
        cotisation_de_base: parseFloat(newGroupData.cotisation_de_base),
        capacite_max: parseInt(newGroupData.capacite_max)
      });
      setShowCreateModal(false);
      alert('Groupe créé avec succès !');
      // refresh groups list
      const updated = await api.getGroups();
      setGroups(updated);
      navigate(`/groups/${created.id}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la création du groupe.');
    } finally {
      setCreating(false);
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
              {filteredGroups.length} groupe{filteredGroups.length !== 1 ? 's' : ''} disponible{filteredGroups.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
              <Search size={16} color="var(--paper-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Rechercher par nom..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                  background: 'var(--ink-90)', border: '1px solid rgba(240,237,230,0.1)',
                  color: 'var(--paper)', fontSize: '0.875rem', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold-dim)'}
                onBlur={e => e.target.style.borderColor = 'rgba(240,237,230,0.1)'}
              />
            </div>

            <Btn variant="primary" onClick={() => setShowCreateModal(true)}>
              + Créer un groupe
            </Btn>
          </div>
        </div>

        {/* Modal Créer un Groupe */}
        {showCreateModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'var(--ink-90)', border: '1px solid var(--gold-line)',
                maxWidth: '520px', width: '100%', padding: '2.5rem', borderRadius: '8px'
              }}
            >
              <h2 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>Créer un <DisplayItalic>Groupe</DisplayItalic></h2>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                Devenez administrateur d'un groupe d'assurance collaborative P2P.
              </p>

              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-dim)', marginBottom: '0.375rem' }}>
                    Nom du groupe
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Mutuelle des Développeurs Maroc"
                    value={newGroupData.nom}
                    onChange={e => setNewGroupData({ ...newGroupData, nom: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'var(--ink)',
                      border: '1px solid rgba(240,237,230,0.15)', color: 'var(--paper)', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-dim)', marginBottom: '0.375rem' }}>
                    Spécialité / Type d'assurance
                  </label>
                  <select
                    value={newGroupData.specialite}
                    onChange={e => setNewGroupData({ ...newGroupData, specialite: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'var(--ink)',
                      border: '1px solid rgba(240,237,230,0.15)', color: 'var(--paper)', outline: 'none'
                    }}
                  >
                    <option value="Équipements électroniques">Équipements électroniques</option>
                    <option value="Auto">Auto</option>
                    <option value="Santé & Mutuelle">Santé & Mutuelle</option>
                    <option value="Habitation">Habitation</option>
                    <option value="Voyage">Voyage</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-dim)', marginBottom: '0.375rem' }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Décrivez l'objectif et les règles de votre communauté..."
                    value={newGroupData.description}
                    onChange={e => setNewGroupData({ ...newGroupData, description: e.target.value })}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', background: 'var(--ink)',
                      border: '1px solid rgba(240,237,230,0.15)', color: 'var(--paper)', outline: 'none', resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-dim)', marginBottom: '0.375rem' }}>
                      Cotisation (€/mois)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newGroupData.cotisation_de_base}
                      onChange={e => setNewGroupData({ ...newGroupData, cotisation_de_base: e.target.value })}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', background: 'var(--ink)',
                        border: '1px solid rgba(240,237,230,0.15)', color: 'var(--paper)', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--paper-dim)', marginBottom: '0.375rem' }}>
                      Capacité Max
                    </label>
                    <input
                      type="number"
                      min="2"
                      required
                      value={newGroupData.capacite_max}
                      onChange={e => setNewGroupData({ ...newGroupData, capacite_max: e.target.value })}
                      style={{
                        width: '100%', padding: '0.75rem 1rem', background: 'var(--ink)',
                        border: '1px solid rgba(240,237,230,0.15)', color: 'var(--paper)', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <Btn variant="ghost" type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, justifyContent: 'center' }}>
                    Annuler
                  </Btn>
                  <Btn variant="primary" type="submit" loading={creating} style={{ flex: 1, justifyContent: 'center' }}>
                    Créer le groupe
                  </Btn>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {filteredGroups.length === 0 ? (
          <Card style={{ textAlign: 'center', paddingBlock: '4rem' }}>
            <Shield size={32} color="rgba(240,237,230,0.1)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--paper-dim)' }}>Aucun groupe ne correspond à votre recherche.</p>
          </Card>
        ) : (
          /* Editorial grid — 1px gap acting as rule lines */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
            {filteredGroups.map((group, i) => (
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
