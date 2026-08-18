import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronLeft, X } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Field, SectionLabel, AlertBanner, PageLoader, Badge, DisplayItalic } from '../ui.jsx';

/* ── Declare Claim ── */
export const DeclareClaimPage = ({ navigate }) => {
  const [adhesions, setAdhesions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);
  const [formData, setFormData]   = useState({ adhesion_id: '', groupe_id: '', description: '', montant_declare: '' });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getMyAdhesions(),
      api.getGroups().catch(() => []),
    ])
      .then(([adhesionList, groupList]) => {
        const enriched = adhesionList.map(a => {
          const group = groupList.find(g => g.id === a.groupe_id);
          return {
            ...a,
            group_name: group ? group.nom : `Groupe (${a.groupe_id.substring(0, 8)}…)`,
            specialite: group ? group.specialite : '',
          };
        });
        setAdhesions(enriched);

        // Pre-select group if passed in URL query param
        const urlParams = new URLSearchParams(window.location.search);
        const targetedGroupId = urlParams.get('groupId');
        let defaultAdhesion = enriched[0];
        if (targetedGroupId) {
          const found = enriched.find(a => a.groupe_id === targetedGroupId);
          if (found) defaultAdhesion = found;
        }

        if (defaultAdhesion) {
          setFormData(p => ({ ...p, adhesion_id: defaultAdhesion.id, groupe_id: defaultAdhesion.groupe_id }));
        }
      })
      .catch(() => setError('Impossible de charger vos groupes.'))
      .finally(() => setLoading(false));
  }, []);

  const handleGroupSelect = (e) => {
    const adhesion = adhesions.find(a => a.id === e.target.value);
    if (adhesion) setFormData(p => ({ ...p, adhesion_id: adhesion.id, groupe_id: adhesion.groupe_id }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.montant_declare) { setError('Veuillez remplir tous les champs.'); return; }
    setSubmitting(true); setError(null);
    try {
      if (selectedFile) {
        const fd = new FormData();
        fd.append('adhesion_id', formData.adhesion_id);
        fd.append('groupe_id', formData.groupe_id);
        fd.append('description', formData.description);
        fd.append('montant_declare', formData.montant_declare);
        fd.append('file', selectedFile);
        await api.createClaimWithFile(fd);
      } else {
        await api.createClaim({ ...formData, montant_declare: parseFloat(formData.montant_declare) });
      }
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
          Fournissez les détails et votre justificatif (attestation, facture ou constat). L'IA analysera automatiquement la pièce pour accélérer le traitement.
        </p>

        <Card gold>
          {loading ? (
            <div style={{ textAlign: 'center', paddingBlock: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p className="text-caption">Chargement de vos contrats et groupes…</p>
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
                <label className="input-label">Groupe d'assurance concerné</label>
                <select className="input-field" value={formData.adhesion_id} onChange={handleGroupSelect} required style={{ fontSize: '0.9375rem', padding: '0.75rem 1rem' }}>
                  {adhesions.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.group_name} {a.specialite ? `(${a.specialite})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-caption" style={{ marginTop: '0.375rem', color: 'var(--paper-dim)' }}>
                  Le sinistre sera transmis à l'administrateur de ce groupe et sera couvert par sa cagnotte.
                </p>
              </div>

              <Field
                label="Montant estimé des dommages (€)"
                type="number" step="0.01" placeholder="Ex : 250.00"
                value={formData.montant_declare}
                onChange={e => setFormData({ ...formData, montant_declare: e.target.value })}
                required
              />

              <div>
                <label className="input-label">Description détaillée des circonstances</label>
                <textarea
                  className="input-field"
                  rows="4"
                  placeholder="Décrivez les circonstances du sinistre (min. 10 caractères)…"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  required minLength={10}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
                />
              </div>

              {/* Pièce Justificative Upload */}
              <div>
                <label className="input-label">Pièce Justificative (Attestation, Facture, Devis, Constat)</label>
                <div style={{
                  border: '1px dashed rgba(200,169,110,0.35)',
                  background: 'var(--ink-90)',
                  borderRadius: 6,
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer'
                    }}
                  />
                  {selectedFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 600 }}>📄 {selectedFile.name}</span>
                      <span style={{ color: 'var(--paper-dim)', fontSize: '0.75rem' }}>({(selectedFile.size / 1024).toFixed(0)} Ko)</span>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--paper)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Cliquez ou glissez-déposez votre justificatif ici
                      </p>
                      <p style={{ color: 'var(--paper-dim)', fontSize: '0.75rem', margin: 0 }}>
                        Formats acceptés : PDF, PNG, JPG (Max 10 Mo) • 🧠 Analyse IA automatique
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(240,237,230,0.06)' }}>
                <Btn type="button" variant="ghost" onClick={() => navigate('/dashboard')}>Annuler</Btn>
                <Btn type="submit" variant="primary" loading={submitting} style={{ flex: 1 }}>
                  {submitting ? 'Analyse IA & Soumission…' : 'Envoyer la déclaration'}
                </Btn>
              </div>
            </form>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

/* ── Claim Detail Modal ── */
const ClaimDetailModal = ({ claim, onClose }) => {
  const [pieces, setPieces] = useState([]);
  const [loadingPieces, setLoadingPieces] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (claim?.id) {
      api.getClaimPieces(claim.id)
        .then(data => setPieces(data || []))
        .catch(err => console.error('Erreur chargement pièces:', err))
        .finally(() => setLoadingPieces(false));
    }
  }, [claim]);

  const handleOpenPiece = async (piece) => {
    try {
      const blob = await api.fetchClaimPieceBlob(claim.id, piece.id);
      const blobUrl = URL.createObjectURL(blob);
      const isPdf = (piece.hdfs_url || '').toLowerCase().endsWith('.pdf') || piece.type_fichier?.includes('pdf');
      setPreviewFile({ blobUrl, isPdf, filename: piece.hdfs_url?.split('/').pop() || 'piece_justificative' });
    } catch (e) {
      alert("Impossible de charger la pièce justificative.");
    }
  };

  if (!claim) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(12,12,12,0.88)', backdropFilter: 'blur(8px)',
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
          borderRadius: '8px', width: '100%', maxWidth: '600px',
          maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <SectionLabel>Détails du sinistre</SectionLabel>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--paper)', marginTop: '0.25rem' }}>
              {claim.group_name}
            </h2>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
              Déclaré le {claim.date}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--paper)', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.4)', marginBottom: '0.375rem' }}>Description</p>
            <p style={{ background: 'var(--ink-90)', padding: '0.875rem 1rem', borderRadius: 4, color: 'var(--paper)', fontSize: '0.9375rem', lineHeight: 1.6, border: '1px solid rgba(240,237,230,0.05)', margin: 0 }}>
              {claim.description}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--ink-80)', padding: '1rem', borderRadius: 4 }}>
            <div>
              <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.4)', marginBottom: '0.25rem' }}>Montant Déclaré</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)' }}>
                {claim.amount} €
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.4)', marginBottom: '0.25rem' }}>Statut actuel</p>
              <Badge variant={statusVariant[claim.status] || 'warning'}>{statusLabel[claim.status] || claim.status}</Badge>
            </div>
          </div>

          {/* AI Summary Block */}
          {claim.resume_ia && (
            <div style={{ background: 'rgba(200,169,110,0.06)', border: '1px solid rgba(200,169,110,0.2)', padding: '1rem', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🧠 Synthèse & Analyse IA (TrustPool Copilot)
                </span>
              </div>
              <p style={{ color: 'var(--paper)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                {claim.resume_ia}
              </p>
            </div>
          )}

          {/* Pieces Justificatives */}
          <div>
            <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,230,0.4)', marginBottom: '0.5rem' }}>
              Pièces Justificatives fournies ({pieces.length})
            </p>
            {loadingPieces ? (
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>Chargement des pièces…</p>
            ) : pieces.length === 0 ? (
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>Aucune pièce justificative attachée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pieces.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ink-90)', padding: '0.75rem 1rem', borderRadius: 4, border: '1px solid rgba(240,237,230,0.08)' }}>
                    <span style={{ color: 'var(--paper)', fontSize: '0.8125rem' }}>
                      📄 {p.hdfs_url ? p.hdfs_url.split('/').pop() : 'Document justificatif'}
                    </span>
                    <Btn variant="secondary" onClick={() => handleOpenPiece(p)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                      Voir le document
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>

          {claim.status === 'validee' && claim.montant_approuve && (
            <div style={{ background: 'rgba(90,158,124,0.08)', borderLeft: '3px solid var(--success)', padding: '1rem', borderRadius: 4 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Montant Approuvé & Indemnisé</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                {claim.montant_approuve} €
              </p>
              {claim.commentaire_validation && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(90,158,124,0.2)' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Note de l'administrateur :
                  </p>
                  <p style={{ color: 'var(--paper)', fontSize: '0.875rem', lineHeight: 1.4, margin: 0 }}>
                    {claim.commentaire_validation}
                  </p>
                </div>
              )}
            </div>
          )}

          {claim.status === 'rejetee' && (
            <div style={{ background: 'rgba(200,90,90,0.08)', borderLeft: '3px solid var(--danger)', padding: '1rem', borderRadius: 4 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                Motif du Rejet par l'Administrateur
              </p>
              <p style={{ color: 'var(--paper)', fontSize: '0.9375rem', lineHeight: 1.5, fontWeight: 400, margin: 0 }}>
                {claim.motif_rejet || 'Votre demande de sinistre a été refusée par l\'administrateur du groupe.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal de prévisualisation de la pièce jointe */}
        {previewFile && (
          <div
            onClick={() => setPreviewFile(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5,5,8,0.95)', zIndex: 999999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--ink)', padding: '1.5rem', borderRadius: 8, maxWidth: '800px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--paper)', margin: 0 }}>{previewFile.filename}</h4>
                <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', color: 'var(--paper)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: '350px' }}>
                {previewFile.isPdf ? (
                  <iframe src={previewFile.blobUrl} title="Aperçu Justificatif" style={{ width: '100%', height: '500px', border: 'none', background: '#fff' }} />
                ) : (
                  <img src={previewFile.blobUrl} alt="Justificatif" style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" onClick={onClose}>Fermer</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
};

const statusVariant = { validee: 'success', rejetee: 'danger', en_attente: 'warning' };
const statusLabel   = { validee: 'Approuvé', rejetee: 'Rejeté', en_attente: 'En attente' };

export const ClaimsPage = ({ navigate }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClaim, setSelectedClaim] = useState(null);

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
      <AnimatePresence>
        {selectedClaim && <ClaimDetailModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />}
      </AnimatePresence>

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
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)' }}
                        >
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
