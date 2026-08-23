import React from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck, Users, ShieldCheck, ArrowRight,
  Lock, CheckCircle, Clock, Zap,
} from 'lucide-react';
import { pageVariants, staggerContainer, staggerItem, Btn, DisplayItalic, SectionLabel } from '../ui.jsx';

/* ── Timeline step component ── */
const TimelineStep = ({ num, icon: Icon, title, desc, detail, img, reverse = false, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay: index * 0.1 }}
    style={{
      display: 'grid',
      gridTemplateColumns: reverse ? '1fr 80px 1fr' : '1fr 80px 1fr',
      gap: '0',
      alignItems: 'stretch',
      borderBottom: '1px solid var(--gold-line)',
      minHeight: '320px',
    }}
    className="timeline-step"
  >
    {/* LEFT side */}
    <div style={{
      padding: '3rem',
      background: reverse ? 'var(--ink-90)' : 'var(--ink)',
      borderRight: '1px solid var(--gold-line)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      order: reverse ? 3 : 1,
    }}>
      {!reverse && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color="var(--gold)" />
            </div>
            <span className="text-label">{title}</span>
          </div>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.7, marginBottom: '1.5rem' }}>{desc}</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {detail.map(d => (
              <li key={d} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
                <CheckCircle size={13} color="var(--gold)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                {d}
              </li>
            ))}
          </ul>
        </>
      )}
      {reverse && img && (
        <div style={{ height: '100%', minHeight: '220px', overflow: 'hidden', position: 'relative' }}>
          {img.endsWith('.mp4') ? (
            <video src={img} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(15%)' }} />
          ) : (
            <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(15%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, var(--ink-90) 0%, transparent 60%)' }} />
        </div>
      )}
    </div>

    {/* CENTER — number spine */}
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink-80)', borderRight: '1px solid var(--gold-line)',
      order: 2, gap: '0.5rem',
    }}>
      <div className="stat-number" style={{ fontSize: '2.5rem', opacity: 0.5, lineHeight: 1 }}>{num}</div>
      <div style={{ width: 1, flex: 1, background: 'var(--gold-line)', maxHeight: '60px' }} />
    </div>

    {/* RIGHT side */}
    <div style={{
      padding: '3rem',
      background: reverse ? 'var(--ink)' : 'var(--ink-90)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      order: reverse ? 1 : 3,
    }}>
      {reverse && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 36, height: 36, border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color="var(--gold)" />
            </div>
            <span className="text-label">{title}</span>
          </div>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.7, marginBottom: '1.5rem' }}>{desc}</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {detail.map(d => (
              <li key={d} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
                <CheckCircle size={13} color="var(--gold)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                {d}
              </li>
            ))}
          </ul>
        </>
      )}
      {!reverse && img && (
        <div style={{ height: '100%', minHeight: '220px', overflow: 'hidden', position: 'relative' }}>
          {img.endsWith('.mp4') ? (
            <video src={img} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(15%)' }} />
          ) : (
            <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75, filter: 'grayscale(15%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, var(--ink-90) 0%, transparent 60%)' }} />
        </div>
      )}
    </div>
  </motion.div>
);

/* ── FAQ item ── */
const FaqItem = ({ q, a, index }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      style={{ borderBottom: '1px solid rgba(240,237,230,0.06)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 0', textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem', fontWeight: 400, color: 'var(--paper)' }}>{q}</span>
        <span style={{ color: 'var(--gold)', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s' }}>+</span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        style={{ overflow: 'hidden' }}
        transition={{ duration: 0.3 }}
      >
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.75, paddingBottom: '1.5rem' }}>{a}</p>
      </motion.div>
    </motion.div>
  );
};

export const HowItWorksPage = ({ navigate }) => {
  const steps = [
    {
      num: '01',
      icon: UserCheck,
      title: 'Inscription & Vérification KYC',
      desc: 'Créez votre compte avec votre email, puis validez votre identité via notre système KYC sécurisé. Votre identité réelle est transformée en pseudonyme chiffré par chiffrement KMS — vous naviguez en toute confidentialité.',
      detail: [
        'Vérification d\'identité via API Veriff',
        'Chiffrement enveloppe AES-256 de vos données',
        'Pseudonyme généré automatiquement',
        'Levée d\'anonymat uniquement en cas de fraude avérée',
      ],
      img: '/video2_kyc_security.mp4',
      reverse: false,
    },
    {
      num: '02',
      icon: Users,
      title: 'Rejoindre un Groupe Solidaire',
      desc: 'Notre moteur IA analyse votre profil (âge, budget, intérêts) et vous recommande les groupes les plus compatibles. Chaque groupe est spécialisé — mobilité douce, habitation, santé — et géré par un Admin de confiance.',
      detail: [
        'Recommandations par score de compatibilité IA',
        'Groupes filtrés par spécialité et budget',
        'Validation de la demande d\'adhésion par l\'Admin',
        'Transparence totale sur la composition du groupe',
      ],
      img: '/video3_matchmaker_ia.mp4',
      reverse: true,
    },
    {
      num: '03',
      icon: ShieldCheck,
      title: 'Cotiser & Constituer la Cagnotte',
      desc: 'Chaque membre contribue à la cagnotte commune selon sa cotisation mensuelle. Un système Bonus-Malus ajuste automatiquement votre contribution selon la sinistralité de votre groupe. Le Buffer Pool de sécurité protège les fonds en cas de pic de sinistres.',
      detail: [
        'Cotisation de base fixée par l\'Admin du groupe',
        'Bonus-Malus dynamique basé sur l\'historique',
        '15 % des cotisations allouées au Buffer Pool',
        'Visualisation en direct de la cagnotte',
      ],
      img: '/video4_cagnotte_dashboard.mp4',
      reverse: false,
    },
    {
      num: '04',
      icon: Clock,
      title: 'Déclarer un Sinistre',
      desc: 'En cas de coup dur, déclarez votre sinistre directement depuis votre espace. Notre Copilote RAG analyse automatiquement vos justificatifs et les conditions générales pour vous aider à construire un dossier solide.',
      detail: [
        'Formulaire de déclaration guidé et simple',
        'Analyse des pièces justificatives par IA',
        'Détection de fraude via Isolation Forest',
        'Notification immédiate à l\'Admin et au groupe',
      ],
      img: '/video5_sinistre_validation.mp4',
      reverse: true,
    },
    {
      num: '05',
      icon: Zap,
      title: 'Validation & Indemnisation',
      desc: 'L\'Admin du groupe valide le sinistre (Human-in-the-Loop). Une fois approuvé, l\'indemnisation est prélevée sur la cagnotte et versée au membre. Le tout est tracé dans l\'historique de groupe pour une transparence absolue.',
      detail: [
        'Validation humaine obligatoire par l\'Admin',
        'Vote communautaire possible pour les gros montants',
        'Virement automatisé sur validation',
        'Historique complet et auditable',
      ],
      img: '/video7_gouvernance.mp4',
      reverse: false,
    },
  ];

  const faqs = [
    { q: 'TrustPool est-il une assurance officielle ?', a: 'TrustPool est une plateforme de mutualisation des risques entre particuliers. Elle ne se substitue pas à une assurance traditionnelle mais permet aux membres d\'un groupe de s\'entraider financièrement selon des règles transparentes définies collectivement.' },
    { q: 'Que se passe-t-il si la cagnotte est insuffisante ?', a: 'Chaque groupe dispose d\'un Buffer Pool de sécurité alimenté à hauteur de 15 % des cotisations. Si les fonds sont insuffisants, l\'Admin peut voter une cotisation exceptionnelle. Le système Bonus-Malus prévient les déséquilibres en ajustant dynamiquement les contributions.' },
    { q: 'Comment mes données personnelles sont-elles protégées ?', a: 'Vos données KYC réelles sont chiffrées via KMS (Key Management Service) et ne sont jamais stockées en clair. Vous interagissez sous pseudonyme. La levée d\'anonymat n\'est possible que dans le cadre d\'une procédure légale stricte en cas de fraude avérée.' },
    { q: 'Puis-je quitter un groupe ?', a: 'Oui. Vous pouvez demander votre sortie à l\'Admin du groupe à tout moment, sous réserve d\'un préavis défini dans les règles du groupe. Votre part de la cagnotte non utilisée vous est restituée selon les modalités du groupe.' },
    { q: 'Comment l\'IA détecte-t-elle les fraudes ?', a: 'Notre modèle "Chien de Garde" basé sur Isolation Forest analyse en temps réel chaque déclaration de sinistre : montant, fréquence, profil déclarant, et comportement réseau. Toute anomalie génère une alerte immédiate à l\'Admin pour investigation.' },
  ];

  return (
    <motion.div {...pageVariants}>

      {/* ── PAGE HERO ── */}
      <section style={{ paddingTop: '8rem', paddingBottom: '5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '-5%', width: '30rem', height: '30rem' }} className="blur-gold" />
        <div className="container-editorial" style={{ position: 'relative', zIndex: 1 }}>
          <SectionLabel>Guide complet</SectionLabel>
          <h1 className="text-display-lg" style={{ maxWidth: '18ch', marginBottom: '1.5rem' }}>
            Comment fonctionne <DisplayItalic>TrustPool</DisplayItalic> ?
          </h1>
          <p style={{ color: 'var(--paper-dim)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', fontWeight: 300, maxWidth: '55ch', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            De l'inscription à l'indemnisation — un processus conçu pour être transparent, rapide et contrôlé par la communauté. Découvrez chaque étape en détail.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Btn variant="primary" onClick={() => navigate('/register')}>
              Commencer <ArrowRight size={14} />
            </Btn>
            <Btn variant="secondary" onClick={() => navigate('/features')}>
              Voir les fonctionnalités
            </Btn>
          </div>
        </div>
        {/* Decorative step count */}
        <div style={{
          position: 'absolute', right: '5%', top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'var(--font-display)', fontSize: 'clamp(6rem, 18vw, 14rem)', fontWeight: 900,
          color: 'rgba(200,169,110,0.04)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
          fontVariationSettings: '"opsz" 144', fontStyle: 'italic',
        }}>
          05
        </div>
      </section>

      {/* ── TIMELINE STEPS ── */}
      <section style={{ borderTop: '1px solid var(--gold-line)' }}>
        {steps.map((step, i) => (
          <TimelineStep key={step.num} {...step} index={i} />
        ))}
      </section>

      {/* ── SCHEMA RECAP ── */}
      <section style={{ paddingBlock: '6rem', background: 'var(--ink-90)' }}>
        <div className="container-editorial">
          <SectionLabel>En résumé</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '3rem', maxWidth: '28ch' }}>
            Le cycle de vie <DisplayItalic>complet</DisplayItalic> en un regard
          </h2>

          <motion.div
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0' }}
          >
            {['Inscription', 'KYC', 'Groupe', 'Cotisation', 'Sinistre', 'Indemnisation'].map((label, i, arr) => (
              <React.Fragment key={label}>
                <motion.div variants={staggerItem} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', padding: '1.5rem', flex: '1 1 120px' }}>
                  <div style={{
                    width: '3rem', height: '3rem', border: '1px solid var(--gold-line)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--gold)', fontSize: '0.875rem',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--paper-dim)', textAlign: 'center' }}>{label}</span>
                </motion.div>
                {i < arr.length - 1 && (
                  <div style={{ width: '2rem', height: '1px', background: 'var(--gold-line)', flexShrink: 0 }} className="hidden-mobile" />
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FULL WALKTHROUGH DEMO VIDEO (VIDEO 10) ── */}
      <section style={{ paddingBlock: '6rem', borderTop: '1px solid var(--gold-line)' }}>
        <div className="container-editorial" style={{ maxWidth: '1000px', textAlign: 'center' }}>
          <SectionLabel>Démonstration interactive</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '1.25rem' }}>
            Découvrez <DisplayItalic>TrustPool</DisplayItalic> en action
          </h2>
          <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, maxWidth: '60ch', marginInline: 'auto', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Du formulaire d'inscription à l'indemnisation d'un sinistre, suivez le parcours complet en vidéo.
          </p>

          <div style={{
            position: 'relative',
            borderRadius: '2px',
            border: '1px solid var(--gold-line)',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            background: 'var(--ink-80)',
          }}>
            <video
              src="/video10_onboarding_demo.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', maxHeight: '540px', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ paddingBlock: '6rem', background: 'var(--ink-90)', borderTop: '1px solid var(--gold-line)' }}>
        <div className="container-editorial" style={{ maxWidth: '800px' }}>
          <SectionLabel>Questions fréquentes</SectionLabel>
          <h2 className="text-display-md" style={{ marginBottom: '3rem' }}>
            Vous avez des <DisplayItalic>questions ?</DisplayItalic>
          </h2>
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ paddingBlock: '5rem', borderTop: '1px solid var(--gold-line)', background: 'var(--ink-90)' }}>
        <div className="container-editorial" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <h2 className="text-display-sm">Prêt à rejoindre <DisplayItalic>TrustPool</DisplayItalic> ?</h2>
            <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', fontWeight: 300, marginTop: '0.5rem' }}>
              Inscription gratuite. Aucun engagement.
            </p>
          </div>
          <Btn variant="primary" onClick={() => navigate('/register')}>
            Créer mon profil <ArrowRight size={14} />
          </Btn>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .timeline-step {
            grid-template-columns: 40px 1fr !important;
            min-height: auto !important;
          }
          .timeline-step > div:nth-child(3) { display: none !important; }
          .timeline-step > div:nth-child(2) { order: 1 !important; flex-direction: row !important; padding: 1rem !important; align-items: center !important; }
          .timeline-step > div:nth-child(1),
          .timeline-step > div:nth-child(3) { order: 2 !important; padding: 1.5rem !important; }
        }
      `}</style>
    </motion.div>
  );
};
