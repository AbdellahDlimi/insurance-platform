import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Field, SectionLabel, AlertBanner, PageLoader, Badge, DisplayItalic } from '../ui.jsx';

/* ── Declare Claim ── */
export const DeclareClaimPage = ({ navigate }) => {
  const [adhesions, setAdhesions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);
  const [formData, setFormData]   = useState({ adhesion_id: '', groupe_id: '', description: '', montant_declare: '' });

  useEffect(() => {
    api.getMyAdhesions()
      .then(data => {
        setAdhesions(data);
        if (data.length > 0) setFormData(p => ({ ...p, adhesion_id: data[0].id, groupe_id: data[0].groupe_id }));
      })
      .catch(() => setError('Impossible de charger vos groupes.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGroupSelect = (e) => {
    const adhesion = adhesions.find(a => a.id === e.target.value);
    if (adhesion) setFormData(p => ({ ...p, adhesion_id: adhesion.id, groupe_id: adhesion.groupe_id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.montant_declare) { setError('Veuillez remplir tous les champs.'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.createClaim({ ...formData, montant_declare: parseFloat(formData.montant_declare) });
      navigate('/claims');
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial" style={{ maxWidth: '680px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--paper-dim)', fontSize: '0.8125rem', marginBottom: '2rem' }}
        >
          <ChevronLeft size={14} /> Retour
        </button>

        <SectionLabel>Déclaration</SectionLabel>
        <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
          Déclarer un <DisplayItalic>sinistre</DisplayItalic>
        </h1>
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginBottom: '2.5rem' }}>
          Fournissez les détails de votre sinistre. Votre groupe et nos équipes seront informés.
        </p>

        <Card gold>
          {loading ? (
            <div style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p className="text-caption">Chargement de vos contrats…</p>
            </div>
          ) : adhesions.length === 0 ? (
            <div style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              <p style={{ color: 'var(--paper-dim)', marginBottom: '1.5rem' }}>Vous n'êtes membre d'aucun groupe actif.</p>
              <Btn variant="primary" onClick={() => navigate('/groups')}>Explorer les groupes</Btn>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && <AlertBanner type="error">{error}</AlertBanner>}

              <div>
                <label className="input-label">Groupe concerné</label>
                <select className="input-field" value={formData.adhesion_id} onChange={handleGroupSelect} required>
                  {adhesions.map(a => (
                    <option key={a.id} value={a.id}>Contrat / Adhésion : {a.id.substring(0, 8)}…</option>
                  ))}
                </select>
              </div>

              <Field
                label="Montant estimé des dommages (€)"
                type="number" step="0.01" placeholder="Ex : 250.00"
                value={formData.montant_declare}
                onChange={e => setFormData({ ...formData, montant_declare: e.target.value })}
                required
              />

              <div>
                <label className="input-label">Description détaillée</label>
                <textarea
                  className="input-field"
                  rows="5"
                  placeholder="Décrivez les circonstances du sinistre (min. 10 caractères)…"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required minLength={10}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(240,237,230,0.06)' }}>
                <Btn type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Annuler</Btn>
                <Btn type="submit" variant="primary" loading={submitting} style={{ flex: 1 }}>Envoyer la déclaration</Btn>
              </div>
            </form>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

/* ── Claims List ── */
const MOCK_CLAIMS = [
  { id: 1, date: '15/07/2026', group_name: 'Mobilité Douce Paris', description: 'Vol de vélo électrique en stationnement', amount: 850, status: 'en_attente' },
  { id: 2, date: '02/06/2026', group_name: 'Mobilité Douce Paris', description: 'Collision trottinette — dommages matériels', amount: 320, status: 'approuve' },
  { id: 3, date: '18/05/2026', group_name: 'Habitation Sud',       description: 'Dégât des eaux — cuisine',                 amount: 1200, status: 'rejete' },
];

const statusVariant = { validee: 'success', rejetee: 'danger', en_attente: 'warning' };
const statusLabel   = { validee: 'Approuvé', rejetee: 'Rejeté', en_attente: 'En attente' };

export const ClaimsPage = ({ navigate }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const [myClaims, myGroups] = await Promise.all([
          api.getMyClaims(),
          api.getGroups(), // Or any other way to get group names
        ]);

        // Map claims to include group names
        const enrichedClaims = myClaims.map(claim => {
          const group = myGroups.find(g => g.id === claim.groupe_id);
          return {
            ...claim,
            group_name: group ? group.nom : 'Groupe inconnu',
            date: new Date(claim.date_declaration).toLocaleDateString('fr-FR'),
            amount: claim.montant_declare,
            status: claim.statut
          };
        });

        setClaims(enrichedClaims);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger vos sinistres.');
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
          <div>
            <SectionLabel>Dossiers</SectionLabel>
            <h1 className="text-display-sm">
              Mes <DisplayItalic>Sinistres</DisplayItalic>
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
              Gérez vos déclarations et suivez leur statut.
            </p>
          </div>
          <Btn variant="primary" onClick={() => navigate('/claims/new')}>
            <AlertTriangle size={14} /> Nouveau sinistre
          </Btn>
        </div>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p className="text-caption">Chargement de vos sinistres…</p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem' }}>
              <AlertBanner type="error">{error}</AlertBanner>
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              <p style={{ color: 'var(--paper-dim)' }}>Vous n'avez déclaré aucun sinistre.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-editorial">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Groupe</th>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id}>
                      <td>{claim.date}</td>
                      <td style={{ color: 'var(--paper)', fontWeight: 500 }}>{claim.group_name}</td>
                      <td style={{ maxWidth: '26ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{claim.description}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontWeight: 600 }}>{claim.amount} €</span>
                      </td>
                      <td><Badge variant={statusVariant[claim.status] || 'warning'}>{statusLabel[claim.status] || claim.status}</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)' }}>
                          Détails →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};
