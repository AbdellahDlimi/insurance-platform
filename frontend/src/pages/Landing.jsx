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
    { num: '01', title: 'Vérification KYC',   desc: 'Votre identité est vérifiée puis transformée en pseudonyme chiffré.', img: '/Explainer_video_about_KYC_secu.mp4' },
    { num: '02', title: 'Rejoignez un Groupe', desc: 'L\'IA recommande les communautés qui correspondent à vos besoins.',   img: '/groupe.png' },
    { num: '03', title: 'Cotisez & Protégez',  desc: 'Alimentez la cagnotte. En cas de coup dur, la communauté valide et indemnise.', img: '/illustration.png' },
  ];

  return (
    <motion.div {...pageVariants}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: '5rem' }}>

        {/* Hero background video */}
        <video
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        >
          <source src="/logo.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay on top of video */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(110deg, rgba(12,12,12,0.93) 40%, rgba(12,12,12,0.7) 70%, rgba(12,12,12,0.55) 100%)',
        }} />
        {/* Gold ambient bottom */}
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: '30rem', height: '30rem', zIndex: 1 }} className="blur-gold" />

        <WatermarkStrip />

        <div className="container-editorial" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

              {/* Headline */}
              <div style={{ maxWidth: '1000px' }}>
                <motion.h1
                  className="text-display-xl"
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  Protégez-vous
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-display-xl"
                >
                  <DisplayItalic>Ensemble.</DisplayItalic>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.38 }}
                  style={{ marginTop: '2rem', fontSize: 'clamp(1.0625rem, 2.2vw, 1.3125rem)', color: 'var(--paper-dim)', maxWidth: '58ch', lineHeight: 1.75, fontWeight: 300, marginInline: 'auto' }}
                >
                  Fini les assureurs opaques qui gardent vos excédents. Avec TrustPool, vous
                  rejoignez un groupe solidaire, vous cotisez dans une cagnotte commune 100&nbsp;%
                  transparente, et en cas de coup dur — c'est votre communauté qui vous indemnise.
                  Ce qu'il reste en fin d'année&nbsp;? <span style={{ color: 'var(--gold)', fontWeight: 500 }}>Il vous appartient.</span>
                </motion.p>
              </div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2.5rem', justifyContent: 'center' }}
              >
                <Btn variant="primary" onClick={() => navigate('/register')}>
                  Créer mon compte gratuitement <ArrowRight size={15} />
                </Btn>
                <Btn variant="secondary" onClick={() => navigate('/how-it-works')}>
                  Découvrir le fonctionnement
                </Btn>
              </motion.div>

              <TrustRow />

              {/* Hero stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0', marginTop: '4rem',
                  border: '1px solid var(--gold-line)', background: 'rgba(12,12,12,0.55)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {[
                  { value: '300+', label: 'Membres actifs' },
                  { value: '15+',  label: 'Groupes solidaires' },
                  { value: '48h',  label: "Délai d'indemnisation" },
                  { value: '100%', label: 'Transparence financière' },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: '1 1 140px', padding: '1.5rem 2rem', textAlign: 'center',
                      borderRight: i < arr.length - 1 ? '1px solid var(--gold-line)' : 'none',
                    }}
                    className="hero-stat-cell"
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--gold)', lineHeight: 1, marginBottom: '0.375rem' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--paper-dim)', fontWeight: 400 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
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
                  {step.img.endsWith('.mp4') ? (
                    <video src={step.img} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(20%)' }} />
                  ) : (
                    <img src={step.img} alt={step.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(20%)' }} />
                  )}
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
              <video
                src="/Product_demo_animation_showing.mp4"
                autoPlay loop muted playsInline
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

      {/* ── COMPLIANCE LOGIN LINK ── */}
      <div style={{ textAlign: 'center', paddingBottom: '2rem', background: 'var(--ink-90)' }}>
        <button
          onClick={() => navigate('/login?role=admin')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--paper-dim)', fontSize: '0.8125rem',
            opacity: 0.6, transition: 'opacity 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = 1}
          onMouseOut={e => e.currentTarget.style.opacity = 0.6}
        >
          <Lock size={12} /> Équipe de conformité → Se connecter
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-intro { grid-template-columns: 1fr !important; }
          .features-intro > div:last-child { height: 200px !important; }
          .hero-stat-cell { border-right: none !important; border-bottom: 1px solid rgba(200,169,110,0.25); }
          .hero-stat-cell:last-child { border-bottom: none !important; }
        }
      `}</style>
    </motion.div>
  );
};
