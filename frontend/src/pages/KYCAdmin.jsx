import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, FileText, ChevronLeft, Download } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Badge, SectionLabel, PageLoader, DisplayItalic } from '../ui.jsx';

export const KYCAdmin = ({ navigate, user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (user.role !== 'admin_plateforme') {
      navigate('/dashboard');
      return;
    }
    
    api.getPendingKyc()
      .then(data => setRequests(data))
      .catch(e => console.error("Erreur chargement KYC", e))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleReview = async (kycId, statut) => {
    setProcessingId(kycId);
    try {
      await api.reviewKyc(kycId, statut, comment);
      setRequests(prev => prev.filter(r => r.id !== kycId));
      setComment('');
    } catch (e) {
      console.error('Erreur lors de la review:', e);
      alert("Erreur lors de la validation");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <PageLoader label="Chargement des demandes..." />;

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial">
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--paper-dim)', fontSize: '0.8125rem', marginBottom: '2rem' }}
        >
          <ChevronLeft size={14} /> Retour au dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <SectionLabel>Administration</SectionLabel>
            <h1 className="text-display-sm">
              Conformité <DisplayItalic>KYC</DisplayItalic>
            </h1>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
              Examen manuel des pièces d'identité
            </p>
          </div>
          <Badge variant="gold">{requests.length} en attente</Badge>
        </div>

        {requests.length === 0 ? (
          <Card style={{ textAlign: 'center', paddingBlock: '4rem' }}>
            <Shield size={32} color="rgba(240,237,230,0.1)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--paper-dim)' }}>Aucun dossier KYC en attente de vérification.</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence>
              {requests.map(req => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.25 }}
                >
                  <Card style={{ borderLeft: '3px solid var(--warning)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
                      
                      {/* User Info */}
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                           <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--paper)',
                          }}>
                            {req.pseudonyme?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
                              {req.pseudonyme}
                            </p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
                              Soumis le {new Date(req.verifie_le || Date.now()).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        
                        <div style={{ background: 'var(--ink-90)', padding: '1rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(240,237,230,0.1)' }}>
                           <FileText size={24} color="var(--gold)" />
                           <div>
                             <p className="text-label" style={{ marginBottom: 0 }}>Document fourni</p>
                             <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>{req.document_url?.split('/').pop() || 'Document inconnu'}</p>
                           </div>
                           <Btn variant="secondary" onClick={() => window.alert("Simulation: Ouverture du document " + req.document_url)}>
                             <Download size={14} /> Voir
                           </Btn>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                         <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <span className="text-label">Commentaire (visible si refusé)</span>
                            <input 
                                type="text"
                                placeholder="Raison du refus (ex: Document flou...)"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.75rem',
                                    background: 'var(--ink-90)', border: '1px solid rgba(240,237,230,0.1)',
                                    color: 'var(--paper)', fontSize: '0.875rem', outline: 'none'
                                }}
                            />
                         </label>
                         
                         <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                disabled={processingId === req.id}
                                onClick={() => handleReview(req.id, 'verified')}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.75rem', border: '1px solid var(--success)',
                                    background: 'rgba(90,158,124,0.12)', color: 'var(--success)', cursor: 'pointer',
                                    fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s',
                                }}
                            >
                                <Check size={16} /> Valider
                            </button>
                            <button
                                disabled={processingId === req.id}
                                onClick={() => handleReview(req.id, 'failed')}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.75rem', border: '1px solid var(--danger)',
                                    background: 'rgba(200,90,90,0.08)', color: 'var(--danger)', cursor: 'pointer',
                                    fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.2s',
                                }}
                            >
                                <X size={16} /> Refuser
                            </button>
                         </div>
                      </div>
                      
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};
