import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, Lock, Activity, FileText, Search,
  CheckCircle2, ArrowRight,
} from 'lucide-react';
import { pageVariants, staggerContainer, staggerItem } from '../ui.jsx';
import { Btn, DisplayItalic, SectionLabel } from '../ui.jsx';

/* ── Watermark strip ── */
const WatermarkStrip = () => (
  <div style={{
    position: 'absolute', right: '-2rem', top: '50%', transform: 'translateY(-50%)',
    writingMode: 'vertical-rl', textOrientation: 'mixed',
    fontFamily: 'var(--font-display)', fontSize: '14rem', fontWeight: 900,
    color: 'rgba(200,169,110,0.035)', letterSpacing: '-0.05em',
    userSelect: 'none', pointerEvents: 'none', lineHeight: 1,
    fontVariationSettings: '"opsz" 144', fontStyle: 'italic',
  }}>
    Trust
  </div>
);

/* ── Trust badge row ── */
const TrustRow = () => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
    style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '3rem' }}
  >
    {[
      { icon: Lock,   label: 'Données chiffrées KMS' },
      { icon: Shield, label: '100 % Transparent' },
      { icon: Users,  label: 'Zéro intermédiaire' },
    ].map(({ icon: Icon, label }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={13} color="var(--gold)" />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--paper-dim)' }}>{label}</span>
      </div>
    ))}
  </motion.div>
);

export const LandingPage = ({ navigate }) => {
  const features = [
    { icon: Shield,       title: 'Coffre-fort KYC',          desc: 'Chiffrement enveloppe. Vos données réelles ne sont révélées qu\'en cas de litige grave.' },
    { icon: Activity,     title: 'Tarification Dynamique',    desc: 'Bonus-Malus automatique selon la sinistralité du groupe.' },
    { icon: Search,       title: 'Détection de Fraude IA',    desc: 'Isolation Forest analyse chaque sinistre et alerte l\'Admin en temps réel.' },
    { icon: FileText,     title: 'Copilote RAG',              desc: 'Assistant virtuel qui lit les conditions générales et extrait les preuves.' },
    { icon: CheckCircle2, title: 'Transparence Totale',       desc: 'Suivez chaque euro. Cagnotte principale et Buffer Pool visualisés en direct.' },
    { icon: Users,        title: 'Gouvernance Décentralisée', desc: 'L\'Admin du groupe valide. Human-in-the-Loop pour toutes les indemnisations.' },
  ];

  const steps = [
    { num: '01', title: 'Vérification KYC',   desc: 'Votre identité est vérifiée puis transformée en pseudonyme chiffré.', img: '/kyc.png' },
    { num: '02', title: 'Rejoignez un Groupe', desc: 'L\'IA recommande les communautés qui correspondent à vos besoins.',   img: '/groupe.png' },
    { num: '03', title: 'Cotisez & Protégez',  desc: 'Alimentez la cagnotte. En cas de coup dur, la communauté valide et indemnise.', img: '/illustration.png' },
  ];

  return (
    <motion.div {...pageVariants}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: '5rem' }}>

        {/* Hero background image */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/hero_background.png)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }} />
        {/* Dark overlay on top of image */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(110deg, rgba(12,12,12,0.92) 45%, rgba(12,12,12,0.65) 100%)',
        }} />
        {/* Gold ambient bottom */}
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: '30rem', height: '30rem', zIndex: 1 }} className="blur-gold" />

        <WatermarkStrip />

        <div className="container-editorial" style={{ position: 'relative', zIndex: 2 }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--gold-line)', padding: '0.375rem 0.875rem', marginBottom: '2.5rem', background: 'rgba(12,12,12,0.5)', backdropFilter: 'blur(8px)' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5A9E7C', display: 'inline-block' }} />
            <span style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>V2.0 Live — TrustPool IA</span>
          </motion.div>

          {/* Headline */}
          <div style={{ maxWidth: '900px' }}>
            <motion.h1
              className="text-display-xl"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              L'Assurance
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-display-xl"
            >
              <DisplayItalic>Collaborative.</DisplayItalic>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.38 }}
              style={{ marginTop: '1.75rem', fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'var(--paper-dim)', maxWidth: '52ch', lineHeight: 1.65, fontWeight: 300 }}
            >
              Rejoignez des groupes solidaires, cotisez ensemble, reprenez le contrôle.
              Le reliquat de la cagnotte vous appartient. L'IA sécurise le reste.
            </motion.p>
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2.5rem' }}
          >
            <Btn variant="primary" onClick={() => navigate('/register')}>
              Rejoindre TrustPool <ArrowRight size={15} />
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/#how-it-works')}>
              Comment ça marche ?
            </Btn>
          </motion.div>

          <TrustRow />
        </div>

        {/* Bottom gold line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
          height: '1px', background: 'linear-gradient(90deg, transparent, var(--gold-line) 40%, transparent)',
        }} />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ paddingBlock: '7rem', background: 'var(--ink-90)', position: 'relative' }}>
        <div className="container-editorial">
          <SectionLabel>Processus</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '4rem', maxWidth: '30ch' }}>
            La révolution TrustPool en <DisplayItalic>3 étapes</DisplayItalic>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}>
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                style={{ background: 'var(--ink-90)', display: 'flex', flexDirection: 'column' }}
              >
                {/* Step image */}
                <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={step.img}
                    alt={step.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(20%)' }}
                  />
                  {/* Gold tint overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--ink-90) 100%)' }} />
                </div>
                {/* Step text */}
                <div style={{ padding: '1.75rem' }}>
                  <div className="stat-number" style={{ marginBottom: '0.875rem', opacity: 0.35 }}>{step.num}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, marginBottom: '0.625rem', color: 'var(--paper)' }}>
                    {step.title}
                  </h3>
                  <p className="text-caption">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ paddingBlock: '7rem' }}>
        <div className="container-editorial">
          {/* Split layout: text left, illustration right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', marginBottom: '5rem' }} className="features-intro">
            <div>
              <SectionLabel>Fonctionnalités</SectionLabel>
              <h2 className="text-display-md">
                Propulsé par une technologie <DisplayItalic>de pointe</DisplayItalic>
              </h2>
            </div>
            <div style={{ position: 'relative', height: '260px', overflow: 'hidden', border: '1px solid var(--gold-line)' }}>
              <img
                src="/illustration.png"
                alt="TrustPool technologie"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(10%)' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(12,12,12,0.5), transparent)' }} />
            </div>
          </div>

          <motion.div
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--gold-line)' }}
          >
            {features.map((feat) => (
              <motion.div
                key={feat.title} variants={staggerItem}
                style={{ background: 'var(--ink)', padding: '2rem' }}
              >
                <feat.icon size={20} color="var(--gold)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--paper)' }}>
                  {feat.title}
                </h3>
                <p className="text-caption">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── COMMUNITY SECTION ── */}
      <section style={{ paddingBlock: '0', position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
        <img
          src="/groupe.png"
          alt="Communauté TrustPool"
          style={{ width: '100%', height: '400px', objectFit: 'cover', display: 'block', opacity: 0.55, filter: 'grayscale(15%)' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(12,12,12,0.95) 35%, rgba(12,12,12,0.4) 100%)',
          display: 'flex', alignItems: 'center',
        }}>
          <div className="container-editorial">
            <SectionLabel>Communauté</SectionLabel>
            <h2 className="text-display-md" style={{ maxWidth: '22ch', marginBottom: '1.5rem' }}>
              Des centaines de membres <DisplayItalic>mutualisent</DisplayItalic> déjà leurs risques
            </h2>
            <Btn variant="primary" onClick={() => navigate('/groups')}>
              Explorer les groupes <ArrowRight size={14} />
            </Btn>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ paddingBlock: '7rem', background: 'var(--ink-90)', borderTop: '1px solid var(--gold-line)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '60rem', height: '20rem' }} className="blur-gold" />
        <div className="container-editorial" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '50ch' }}>
            <SectionLabel>Rejoindre</SectionLabel>
            <h2 className="text-display-md" style={{ marginBottom: '1.5rem' }}>
              Prêt à rejoindre <DisplayItalic>TrustPool</DisplayItalic> ?
            </h2>
            <p style={{ color: 'var(--paper-dim)', fontSize: '1.0625rem', fontWeight: 300, marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Créez votre profil gratuitement et rejoignez un groupe solidaire en quelques minutes.
            </p>
            <Btn variant="primary" onClick={() => navigate('/register')}>
              Créer mon profil gratuitement <ArrowRight size={14} />
            </Btn>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .features-intro { grid-template-columns: 1fr !important; }
          .features-intro > div:last-child { height: 200px !important; }
        }
      `}</style>
    </motion.div>
  );
};
