import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, FileText, ChevronLeft, Download, Eye, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, Card, Btn, Badge, SectionLabel, PageLoader, DisplayItalic } from '../ui.jsx';

/* ── KYC Document Viewer Modal ── */
const DocumentViewerModal = ({ doc, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!doc) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(10,10,12,0.92)', backdropFilter: 'blur(10px)',
        zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--ink)', border: '1px solid var(--gold-line)',
          borderRadius: '8px', width: '100%', maxWidth: '850px',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)', overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(240,237,230,0.08)' }}>
          <div>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gold)' }}>
              Équipe de Conformité • Examen KYC
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--paper)', margin: '0.2rem 0 0' }}>
              Pièce d'identité : {doc.pseudonyme}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!doc.isPdf && (
              <>
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
                  title="Zoom arrière"
                  style={{ background: 'var(--ink-80)', border: '1px solid rgba(240,237,230,0.1)', color: 'var(--paper)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
                  title="Zoom avant"
                  style={{ background: 'var(--ink-80)', border: '1px solid rgba(240,237,230,0.1)', color: 'var(--paper)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Pivoter"
                  style={{ background: 'var(--ink-80)', border: '1px solid rgba(240,237,230,0.1)', color: 'var(--paper)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <RotateCw size={16} />
                </button>
              </>
            )}
            <a
              href={doc.blobUrl}
              download={doc.filename || 'document_kyc'}
              title="Télécharger l'original"
              style={{ background: 'var(--ink-80)', border: '1px solid rgba(240,237,230,0.1)', color: 'var(--gold)', borderRadius: 4, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--paper)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '0.5rem' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          {doc.loading ? (
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem' }}>Chargement sécurisé du document…</p>
            </div>
          ) : doc.error ? (
            <div style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
              <p>{doc.error}</p>
            </div>
          ) : doc.isPdf ? (
            <iframe
              src={doc.blobUrl}
              title="Aperçu Document PDF"
              style={{ width: '100%', height: '580px', border: '1px solid rgba(240,237,230,0.1)', borderRadius: 4, background: '#fff' }}
            />
          ) : (
            <div style={{ overflow: 'auto', textAlign: 'center', width: '100%' }}>
              <img
                src={doc.blobUrl}
                alt="Pièce d'identité"
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                  borderRadius: 4,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.75rem', background: 'var(--ink-90)', borderTop: '1px solid rgba(240,237,230,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: 0 }}>
            Nom du fichier : <strong>{doc.filename}</strong>
          </p>
          <Btn variant="primary" onClick={onClose}>Fermer l'aperçu</Btn>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const KYCAdmin = ({ navigate, user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [comment, setComment] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

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

  const handleOpenDoc = async (req) => {
    const filename = req.document_url?.split('/').pop() || 'document_kyc';
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    
    setPreviewDoc({
      kycId: req.id,
      pseudonyme: req.pseudonyme || 'Utilisateur',
      filename,
      isPdf,
      loading: true,
      blobUrl: null,
      error: null,
    });

    try {
      const blob = await api.fetchKycDocumentBlob(req.id);
      const blobUrl = URL.createObjectURL(blob);
      setPreviewDoc(prev => ({
        ...prev,
        loading: false,
        blobUrl,
      }));
    } catch (e) {
      console.error('Erreur chargement document KYC:', e);
      setPreviewDoc(prev => ({
        ...prev,
        loading: false,
        error: "Impossible d'accéder au fichier physique sur le serveur.",
      }));
    }
  };

  const handleCloseDoc = () => {
    if (previewDoc?.blobUrl) {
      URL.revokeObjectURL(previewDoc.blobUrl);
    }
    setPreviewDoc(null);
  };

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
              Examen direct et vérification des pièces d'identité (Passeport / CIN)
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
                             <p className="text-label" style={{ marginBottom: 0 }}>Pièce d'identité fournie</p>
                             <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem' }}>{req.document_url?.split('/').pop() || 'Document'}</p>
                           </div>
                           <Btn variant="secondary" onClick={() => handleOpenDoc(req)}>
                             <Eye size={14} /> Voir le document
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

        {/* Modal de prévisualisation directe du document KYC */}
        <AnimatePresence>
          {previewDoc && (
            <DocumentViewerModal doc={previewDoc} onClose={handleCloseDoc} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

