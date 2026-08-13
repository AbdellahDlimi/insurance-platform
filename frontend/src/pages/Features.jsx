import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Activity, Search, FileText, CheckCircle2,
  Users, Lock, Zap, BarChart2, Brain, Eye, ArrowRight,
} from 'lucide-react';
import { pageVariants, staggerContainer, staggerItem, Btn, DisplayItalic, SectionLabel } from '../ui.jsx';

/* ── Animated feature card ── */
const FeatureCard = ({ icon: Icon, title, desc, tag, accent = 'var(--gold)', index }) => (
  <motion.div
    variants={staggerItem}
    whileHover={{ y: -4, borderColor: 'rgba(200,169,110,0.4)' }}
    style={{
      background: 'var(--ink)', padding: '2rem',
      border: '1px solid rgba(240,237,230,0.07)',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      transition: 'border-color 0.25s, transform 0.25s',
      cursor: 'default',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={accent} />
      </div>
      {tag && (
        <span style={{
          fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '0.2rem 0.5rem', border: '1px solid var(--gold-line)', color: 'var(--gold)',
        }}>{tag}</span>
      )}
    </div>
    <div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 500, color: 'var(--paper)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--paper-dim)', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
    </div>
  </motion.div>
);

/* ── Comparison table row ── */
const CompareRow = ({ label, trustpool, traditional }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
    borderBottom: '1px solid rgba(240,237,230,0.05)',
  }}>
    <div style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--paper-dim)' }}>{label}</div>
    <div style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--gold)', background: 'rgba(200,169,110,0.04)', fontWeight: 500 }}>{trustpool}</div>
    <div style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'rgba(240,237,230,0.3)' }}>{traditional}</div>
  </div>
);

/* ── Stat block ── */
const StatBlock = ({ value, label, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    style={{ padding: '2rem', borderRight: '1px solid var(--gold-line)', flex: '1 1 180px' }}
    className="stat-block"
  >
    <div className="stat-number" style={{ marginBottom: '0.375rem' }}>{value}</div>
    <p style={{ fontSize: '0.875rem', color: 'var(--paper)', fontWeight: 500, marginBottom: '0.25rem' }}>{label}</p>
    {sub && <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', fontWeight: 300 }}>{sub}</p>}
  </motion.div>
);

export const FeaturesPage = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('securite');

  const tabs = [
    { id: 'securite',    label: 'Sécurité & KYC' },
    { id: 'ia',         label: 'Intelligence Artificielle' },
    { id: 'transparence', label: 'Transparence' },
    { id: 'gouvernance',  label: 'Gouvernance' },
  ];

  const tabContent = {
    securite: {
      headline: 'Votre identité, inviolable.',
      sub: 'TrustPool utilise un chiffrement à deux niveaux — vos données personnelles ne sont jamais exposées, même à nos équipes.',
      img: '/Explainer_video_about_KYC_secu.mp4',
      points: [
        { icon: Lock,       title: 'Chiffrement enveloppe KMS',        desc: 'Vos données KYC réelles (nom, date de naissance, pièce d\'identité) sont chiffrées via AWS KMS. Seule une clé maître, protégée par HSM, peut les déchiffrer dans un contexte légal strict.' },
        { icon: Shield,     title: 'Pseudonyme permanent',              desc: 'Un pseudonyme généré cryptographiquement vous est attribué à l\'inscription. Toutes vos interactions sur la plateforme utilisent ce pseudonyme — y compris pour les autres membres de votre groupe.' },
        { icon: Eye,        title: 'Procédure de levée d\'anonymat',    desc: 'L\'anonymat ne peut être levé que par une décision légale formelle (juge, procureur) en cas de fraude avérée. Tout accès est audité et tracé de manière immuable.' },
        { icon: CheckCircle2, title: 'Vérification API Veriff',          desc: 'Notre partenaire de vérification d\'identité Veriff effectue une analyse biométrique et documentaire en quelques secondes. Aucune donnée brute n\'est conservée par TrustPool.' },
      ],
    },
    ia: {
      headline: 'L\'IA au service de la communauté.',
      sub: 'Trois modèles d\'IA spécialisés travaillent en coulisse pour protéger votre groupe, optimiser vos cotisations et vous guider.',
      img: '/Product_demo_animation_showing.mp4',
      points: [
        { icon: Brain,      title: 'Matchmaker — Recommandations de Groupes', desc: 'Un modèle de filtrage collaboratif analyse votre profil (âge, situation pro, intérêts, budget) et calcule un score de compatibilité avec chaque groupe disponible. Vous voyez directement les groupes les plus pertinents.' },
        { icon: Search,     title: 'Chien de Garde — Détection de Fraude',    desc: 'Notre modèle Isolation Forest analyse en temps réel chaque déclaration de sinistre. Il détecte les anomalies de montant, de fréquence et de comportement réseau. Toute anomalie génère une alerte immédiate.' },
        { icon: FileText,   title: 'Copilote RAG — Assistance Documentaire',  desc: 'Un assistant basé sur la recherche augmentée (RAG) lit vos conditions générales et analyse vos pièces justificatives. Il extrait automatiquement les clauses pertinentes et évalue la validité de votre dossier.' },
        { icon: Activity,   title: 'Bonus-Malus Dynamique',                   desc: 'Un algorithme ajuste automatiquement votre cotisation mensuelle selon la sinistralité de votre groupe et votre historique personnel. Plus le groupe est discipliné, plus les cotisations baissent.' },
      ],
    },
    transparence: {
      headline: 'Chaque euro est traçable.',
      sub: 'La cagnotte, le Buffer Pool, les sinistres — tout est visible, en temps réel, par chaque membre du groupe.',
      img: '/Financial_dashboard_animation.mp4',
      points: [
        { icon: BarChart2,   title: 'Dashboard Financier en Temps Réel',  desc: 'Visualisez à tout moment la cagnotte principale, le Buffer Pool de sécurité (15 % des cotisations), les entrées et sorties du mois. Aucun euro ne disparaît sans trace.' },
        { icon: FileText,    title: 'Historique Complet et Auditable',    desc: 'Chaque cotisation, chaque sinistre approuvé, chaque indemnisation versée est enregistrée dans un journal horodaté. L\'Admin et les membres peuvent consulter l\'historique complet du groupe.' },
        { icon: Users,       title: 'Notifications Communautaires',       desc: 'Chaque événement important (nouveau sinistre, validation, modification des règles) est communiqué à l\'ensemble du groupe via notification. Rien ne se décide dans l\'ombre.' },
        { icon: CheckCircle2, title: 'Rapports Mensuels Automatiques',    desc: 'Un rapport financier mensuel est généré et envoyé par email à chaque membre. Il détaille l\'utilisation de la cagnotte, le taux de sinistralité et l\'évolution du Bonus-Malus.' },
      ],
    },
    gouvernance: {
      headline: 'La communauté décide.',
      sub: 'TrustPool met le contrôle entre les mains de l\'Admin du groupe et de la communauté. Chaque décision importante requiert une validation humaine.',
      img: '/illustration.png',
      points: [
        { icon: Shield,     title: 'Admin du Groupe',                   desc: 'Chaque groupe est dirigé par un Admin élu ou désigné. L\'Admin fixe les règles, valide les adhésions, approuve les sinistres et peut proposer des modifications aux règles du groupe.' },
        { icon: CheckCircle2, title: 'Human-in-the-Loop Obligatoire',   desc: 'Aucune indemnisation ne peut être déclenchée sans validation humaine explicite de l\'Admin. L\'IA assiste et recommande, mais c\'est l\'humain qui décide.' },
        { icon: Users,       title: 'Vote Communautaire',              desc: 'Pour les sinistres dépassant un seuil défini, un vote de la communauté peut être déclenché. Chaque membre exprime sa position, et la décision est prise à la majorité qualifiée.' },
        { icon: Zap,        title: 'Règles Personnalisables',          desc: 'L\'Admin peut configurer : plafond d\'indemnisation, délai de carence, mode de vote, règles de Bonus-Malus. TrustPool s\'adapte aux besoins spécifiques de chaque communauté.' },
      ],
    },
  };

  const current = tabContent[activeTab];

  return (
    <motion.div {...pageVariants}>

      {/* ── PAGE HERO ── */}
      <section style={{ paddingTop: '8rem', paddingBottom: '5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', right: '-5%', width: '30rem', height: '30rem' }} className="blur-gold" />
        <div className="container-editorial" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel>Fonctionnalités</SectionLabel>
          <h1 className="text-display-lg" style={{ maxWidth: '20ch', marginBottom: '1.5rem' }}>
            Une technologie <DisplayItalic>pensée</DisplayItalic> pour vous protéger
          </h1>
          <p style={{ color: 'var(--paper-dim)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', fontWeight: 300, maxWidth: '55ch', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            TrustPool combine IA de pointe, cryptographie avancée et gouvernance communautaire pour créer la plateforme d'assurance collaborative la plus transparente du marché.
          </p>
          <Btn variant="primary" onClick={() => navigate('/register')}>
            Essayer gratuitement <ArrowRight size={14} />
          </Btn>
        </div>
      </section>

      {/* ── STATS ROW ── */}
      <section style={{ borderTop: '1px solid var(--gold-line)', borderBottom: '1px solid var(--gold-line)' }}>
        <div className="container-editorial" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <StatBlock value="3"    label="Modèles IA"        sub="Matchmaker · Fraude · RAG" />
          <StatBlock value="256"  label="bits de chiffrement" sub="AES-256 via KMS" />
          <StatBlock value="15 %" label="Buffer Pool"       sub="Réserve de sécurité obligatoire" />
          <StatBlock value="100%" label="Transparent"       sub="Chaque euro traçable" />
        </div>
      </section>

      {/* ── TABBED DEEP DIVE ── */}
      <section style={{ paddingBlock: '6rem', background: 'var(--ink-90)' }}>
        <div className="container-editorial">
          <SectionLabel>En profondeur</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '3rem' }}>
            Explorer par <DisplayItalic>domaine</DisplayItalic>
          </h2>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--gold-line)', marginBottom: '3rem', overflowX: 'auto' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.875rem 1.5rem', fontSize: '0.8125rem', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  color: activeTab === tab.id ? 'var(--gold)' : 'var(--paper-dim)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                  marginBottom: '-1px', transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}
            className="tab-content-grid"
          >
            {/* Left: headline + image */}
            <div>
              <h3 className="text-display-sm" style={{ marginBottom: '0.875rem' }}>
                {current.headline}
              </h3>
              <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.7, marginBottom: '2rem' }}>
                {current.sub}
              </p>
              <div style={{ height: '260px', overflow: 'hidden', border: '1px solid var(--gold-line)', position: 'relative' }}>
                {current.img.endsWith('.mp4') ? (
                  <video src={current.img} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(10%)' }} />
                ) : (
                  <img src={current.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(10%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, var(--ink-90))' }} />
              </div>
            </div>

            {/* Right: feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gold-line)' }}>
              {current.points.map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ background: 'var(--ink-80)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                    <Icon size={14} color="var(--gold)" />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--paper)' }}>{title}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', lineHeight: 1.7, fontWeight: 300 }}>{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── ALL FEATURES GRID ── */}
      <section style={{ paddingBlock: '6rem' }}>
        <div className="container-editorial">
          <SectionLabel>Vue complète</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '3rem' }}>
            Toutes les <DisplayItalic>fonctionnalités</DisplayItalic>
          </h2>

          <motion.div
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}
          >
            {[
              { icon: Lock,        title: 'Chiffrement KMS',              desc: 'AES-256 + KMS pour chaque donnée personnelle.',                          tag: 'Sécurité' },
              { icon: Shield,      title: 'Pseudonyme permanent',          desc: 'Naviguez sans jamais exposer votre identité réelle.',                     tag: 'Sécurité' },
              { icon: Brain,       title: 'Matchmaker IA',                 desc: 'Score de compatibilité personnalisé pour chaque groupe.',                  tag: 'IA' },
              { icon: Search,      title: 'Détection de Fraude',           desc: 'Isolation Forest analyse chaque sinistre en temps réel.',                 tag: 'IA' },
              { icon: FileText,    title: 'Copilote RAG',                  desc: 'Lecture automatique de vos CGU et justificatifs.',                         tag: 'IA' },
              { icon: Activity,    title: 'Bonus-Malus Dynamique',         desc: 'Cotisations ajustées selon la sinistralité du groupe.',                   tag: 'Finance' },
              { icon: BarChart2,   title: 'Dashboard Financier',           desc: 'Cagnotte, Buffer Pool, historique — tout en temps réel.',                  tag: 'Transparence' },
              { icon: Users,       title: 'Gouvernance Communautaire',      desc: 'Validation Human-in-the-Loop + vote communautaire.',                      tag: 'Gouvernance' },
              { icon: CheckCircle2, title: 'Validation Admin',              desc: 'Chaque sinistre est validé manuellement avant paiement.',                 tag: 'Gouvernance' },
              { icon: Zap,         title: 'Notifications Temps Réel',       desc: 'Alertes instantanées pour tous les événements groupe.',                   tag: 'UX' },
              { icon: Eye,         title: 'Historique Auditable',           desc: 'Journal horodaté de chaque transaction, accessible à tous.',              tag: 'Transparence' },
              { icon: Lock,        title: 'Levée d\'Anonymat Contrôlée',    desc: 'Uniquement via procédure légale formelle, entièrement tracée.',           tag: 'Sécurité' },
            ].map((feat, i) => (
              <FeatureCard key={feat.title} {...feat} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{ paddingBlock: '6rem', background: 'var(--ink-90)', borderTop: '1px solid var(--gold-line)' }}>
        <div className="container-editorial">
          <SectionLabel>Comparaison</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '3rem' }}>
            TrustPool vs <DisplayItalic>assurance traditionnelle</DisplayItalic>
          </h2>

          <div style={{ border: '1px solid var(--gold-line)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--ink-80)', borderBottom: '1px solid var(--gold-line)' }}>
              <div style={{ padding: '1rem 1.25rem' }}><span className="text-label">Critère</span></div>
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(200,169,110,0.06)' }}><span className="text-label" style={{ color: 'var(--gold)' }}>TrustPool</span></div>
              <div style={{ padding: '1rem 1.25rem' }}><span className="text-label" style={{ color: 'rgba(240,237,230,0.3)' }}>Assurance Classique</span></div>
            </div>
            {[
              { label: 'Transparence des fonds',    trustpool: '100 % visible',          traditional: 'Opaque' },
              { label: 'Intermédiaires',             trustpool: 'Aucun',                  traditional: 'Courtier + Assureur' },
              { label: 'Reliquat de cagnotte',       trustpool: 'Redistribué aux membres', traditional: 'Conservé par l\'assureur' },
              { label: 'Prix dynamique',             trustpool: 'Oui — Bonus-Malus',       traditional: 'Non' },
              { label: 'Confidentialité',            trustpool: 'Pseudonyme + KMS',        traditional: 'Données stockées en clair' },
              { label: 'Validation sinistres',       trustpool: 'Communauté + Admin',      traditional: 'Expert mandaté par l\'assureur' },
              { label: 'Délai d\'indemnisation',     trustpool: 'Jours',                   traditional: 'Semaines / mois' },
              { label: 'Détection de fraude',        trustpool: 'IA temps réel',           traditional: 'Manuel / post-hoc' },
            ].map((row, i) => (
              <CompareRow key={i} {...row} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ paddingBlock: '5rem', borderTop: '1px solid var(--gold-line)' }}>
        <div className="container-editorial" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <h2 className="text-display-sm">Convaincu ? <DisplayItalic>Rejoignez TrustPool.</DisplayItalic></h2>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginTop: '0.5rem' }}>
              Inscription gratuite. Rejoignez un groupe en quelques minutes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={() => navigate('/how-it-works')}>Comment ça marche ?</Btn>
            <Btn variant="primary" onClick={() => navigate('/register')}>Créer mon profil <ArrowRight size={14} /></Btn>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .tab-content-grid { grid-template-columns: 1fr !important; }
          .stat-block:last-child { border-right: none !important; }
        }
      `}</style>
    </motion.div>
  );
};
