import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Activity, ChevronRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../api.js';
import { pageVariants, staggerContainer, staggerItem, Card, Btn, SectionLabel, DisplayItalic, PageLoader } from '../ui.jsx';

export const AdminDashboard = ({ navigate, user }) => {
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== 'admin_plateforme') {
      navigate('/dashboard');
      return;
    }
    
    // Pour l'instant, on récupère le nombre de demandes en attente
    api.getPendingKyc()
      .then(data => {
        setStats({ pending: data.length, total: data.length * 3 + 12 }); // Simulation d'autres KPIs
      })
      .catch(e => console.error("Erreur chargement", e))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <PageLoader label="Chargement du portail..." />;

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
      <div className="container-editorial">
        <SectionLabel>Conformité</SectionLabel>
        <h1 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>
          Portail <DisplayItalic>Administrateur</DisplayItalic>
        </h1>
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', marginBottom: '3rem' }}>
          Gestion des vérifications d'identité et de la sécurité de la plateforme.
        </p>

        {/* ── KPI Row ── */}
        <motion.div
          variants={staggerContainer} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1px', background: 'var(--gold-line)', marginBottom: '3rem' }}
        >
          <motion.div variants={staggerItem} style={{ background: 'var(--ink)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Clock size={20} color="var(--warning)" />
              <p className="text-label" style={{ marginBottom: 0 }}>KYC en attente</p>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--paper)', lineHeight: 1 }}>
              {stats.pending}
            </p>
          </motion.div>

          <motion.div variants={staggerItem} style={{ background: 'var(--ink)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={20} color="var(--success)" />
              <p className="text-label" style={{ marginBottom: 0 }}>Profils vérifiés</p>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--paper)', lineHeight: 1 }}>
              {stats.total}
            </p>
          </motion.div>

          <motion.div variants={staggerItem} style={{ background: 'var(--ink)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Activity size={20} color="var(--gold)" />
              <p className="text-label" style={{ marginBottom: 0 }}>Taux de validation</p>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--paper)', lineHeight: 1 }}>
              94%
            </p>
          </motion.div>
        </motion.div>

        {/* ── Actions ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(200,169,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="var(--gold)" />
              </div>
              <div>
                <h3 className="text-display-sm" style={{ fontSize: '1.25rem' }}>Centre de Validation</h3>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem' }}>Examinez les pièces d'identité.</p>
              </div>
            </div>
            <Btn variant="primary" style={{ width: '100%' }} onClick={() => navigate('/admin/kyc')}>
              Traiter les dossiers <ChevronRight size={16} />
            </Btn>
          </Card>

          <Card style={{ opacity: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(200,169,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="var(--gold)" />
              </div>
              <div>
                <h3 className="text-display-sm" style={{ fontSize: '1.25rem' }}>Audit & Litiges</h3>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem' }}>Lève l'anonymat en cas de litige.</p>
              </div>
            </div>
            <Btn variant="ghost" style={{ width: '100%' }} disabled>Bientôt disponible</Btn>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
