import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronRight,
  X,
  Clock,
  Shield,
  ShieldCheck,
  Sparkles,
  Coins,
  CreditCard,
  Plus,
  Compass,
  CheckCircle2,
  ExternalLink,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  Download,
  Bell,
  HelpCircle,
  Lock,
  HeartHandshake,
  Award,
  Filter,
} from 'lucide-react';
import { api, formatRejectionMotif } from '../api.js';
import { pageVariants, staggerContainer, staggerItem, Card, Btn, Badge, SectionLabel, PageLoader, DisplayItalic } from '../ui.jsx';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';

/* ─────────────────────────────────────────────────────────────
   1. REUSABLE COMPONENT: CoefficientGauge (Jauge Circulaire Compacte)
   ───────────────────────────────────────────────────────────── */
export const CoefficientGauge = ({ value = 1.0, size = 44, strokeWidth = 4 }) => {
  const coeff = Number(value) || 1.0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Plage 0.5 à 2.0 normalisée
  const normalized = Math.min(Math.max((coeff - 0.5) / 1.5, 0), 1);
  const strokeDashoffset = circumference - normalized * circumference;

  let color = '#C8A96E'; // Doré neutre si 1.0
  let trendIcon = <span style={{ fontSize: '0.75rem', color }}>→</span>;

  if (coeff < 1.0) {
    color = '#5A9E7C'; // Vert bonus
    trendIcon = <TrendingDown size={13} color={color} />;
  } else if (coeff > 1.0) {
    color = '#C8864E'; // Corail/Ambre malus
    trendIcon = <TrendingUp size={13} color={color} />;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(240,237,230,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {trendIcon}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   2. REUSABLE COMPONENT: StatCard (Avec état Actif / Neutre)
   ───────────────────────────────────────────────────────────── */
export const StatCard = ({
  title,
  value,
  subvalue,
  icon: Icon,
  isActive = false,
  accentColor = 'var(--gold)',
  extraElement,
  onClick,
}) => {
  return (
    <motion.div variants={staggerItem} style={{ height: '100%' }}>
      <div
        onClick={onClick}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.25rem 1.25rem',
          background: isActive
            ? 'linear-gradient(180deg, rgba(200, 169, 110, 0.07) 0%, rgba(22, 22, 22, 0.95) 100%)'
            : 'var(--ink-90)',
          border: isActive
            ? '1px solid rgba(200, 169, 110, 0.35)'
            : '1px solid rgba(240, 237, 230, 0.07)',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = isActive ? 'var(--gold)' : 'rgba(200,169,110,0.25)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = isActive ? 'rgba(200, 169, 110, 0.35)' : 'rgba(240, 237, 230, 0.07)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {isActive && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${accentColor}, transparent)`,
            }}
          />
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--paper)' : 'var(--paper-dim)',
                fontWeight: 600,
              }}
            >
              {title}
            </span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'rgba(200,169,110,0.12)' : 'rgba(240,237,230,0.04)',
                border: isActive ? '1px solid rgba(200,169,110,0.25)' : '1px solid rgba(240,237,230,0.06)',
              }}
            >
              <Icon size={14} color={isActive ? accentColor : 'var(--paper-dim)'} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: isActive ? 'var(--paper)' : 'rgba(240,237,230,0.85)',
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            {subvalue && (
              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', fontWeight: 400 }}>
                {subvalue}
              </span>
            )}
          </div>
        </div>

        {extraElement && (
          <div style={{ marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(240,237,230,0.06)' }}>
            {extraElement}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   3. REUSABLE COMPONENT: ClaimStatusBadge
   ───────────────────────────────────────────────────────────── */
export const ClaimStatusBadge = ({ statut }) => {
  const map = {
    en_attente: {
      label: 'En instruction',
      color: '#E0A870',
      bg: 'rgba(200, 134, 78, 0.12)',
      border: 'rgba(200, 134, 78, 0.3)',
      icon: Clock,
    },
    validee: {
      label: 'Approuvé',
      color: '#7FC9A0',
      bg: 'rgba(90, 158, 124, 0.12)',
      border: 'rgba(90, 158, 124, 0.3)',
      icon: CheckCircle2,
    },
    rejetee: {
      label: 'Refusé',
      color: '#E08888',
      bg: 'rgba(200, 90, 90, 0.12)',
      border: 'rgba(200, 90, 90, 0.3)',
      icon: X,
    },
    rembourse: {
      label: 'Remboursé',
      color: '#C8A96E',
      bg: 'rgba(200, 169, 110, 0.12)',
      border: 'rgba(200, 169, 110, 0.3)',
      icon: Check,
    },
  };

  const conf = map[statut] || map.en_attente;
  const Icon = conf.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.6rem',
        fontSize: '0.6875rem',
        fontWeight: 600,
        borderRadius: 2,
        color: conf.color,
        background: conf.bg,
        border: `1px solid ${conf.border}`,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      <Icon size={11} />
      {conf.label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────
   4. REUSABLE COMPONENT: MiniSparkline
   ───────────────────────────────────────────────────────────── */
const MiniSparkline = ({ data = [10000, 11200, 11800, 12400, 13100, 14000], height = 36, color = '#C8A96E' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 140;
  
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <polygon
          fill={`url(#sparkGrad-${color})`}
          points={`0,${height} ${points} ${width},${height}`}
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', width, fontSize: '0.625rem', color: 'var(--paper-dim)' }}>
        <span>Progression 6 mois</span>
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
          +{(data[data.length - 1] > data[0] ? ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(0) : 5)}%
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   5. REUSABLE COMPONENT: Enriched GroupCard
   ───────────────────────────────────────────────────────────── */
export const GroupCard = ({ group, onClick, showSparkline = false }) => {
  const coeff = group.user_coefficient || 1.0;
  const isBonus = coeff < 1.0;
  const isMalus = coeff > 1.0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--ink-90)',
        border: group.has_active_claim ? '1px solid rgba(200, 134, 78, 0.4)' : '1px solid rgba(240, 237, 230, 0.08)',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--ink-80)';
        e.currentTarget.style.borderColor = 'var(--gold)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--ink-90)';
        e.currentTarget.style.borderColor = group.has_active_claim ? 'rgba(200, 134, 78, 0.4)' : 'rgba(240, 237, 230, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.0625rem', color: 'var(--paper)' }}>
            {group.nom}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {group.has_active_claim && (
              <span
                style={{
                  fontSize: '0.625rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 2,
                  background: 'rgba(200, 134, 78, 0.15)',
                  border: '1px solid var(--warning)',
                  color: '#E0A870',
                  fontWeight: 600,
                }}
              >
                Sinistre en cours
              </span>
            )}
            <Badge variant={group.est_ouvert ? 'success' : 'warning'}>
              {group.est_ouvert ? 'Actif' : 'Complet'}
            </Badge>
          </div>
        </div>

        <p className="text-caption" style={{ color: 'var(--paper-dim)', marginBottom: '1rem' }}>
          {group.specialite || 'Pool communautaire'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', padding: '0.75rem', background: 'rgba(240,237,230,0.02)', border: '1px solid rgba(240,237,230,0.05)', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cagnotte commune
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--gold)' }}>
              {Number(group.cagnotte || 0).toLocaleString()} €
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ma cotisation
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--paper)' }}>
              {group.user_cotisation || group.cotisation_de_base} €
              <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', fontWeight: 300 }}>/mois</span>
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(240,237,230,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>Mon coeff :</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              color: isBonus ? 'var(--success)' : isMalus ? 'var(--warning)' : 'var(--gold)',
              background: isBonus ? 'rgba(90,158,124,0.1)' : isMalus ? 'rgba(200,134,78,0.1)' : 'rgba(200,169,110,0.1)',
              padding: '0.15rem 0.4rem',
              borderRadius: 2,
            }}
          >
            {Number(coeff).toFixed(2)} {isBonus ? '↓' : isMalus ? '↑' : ''}
          </span>
        </div>

        {showSparkline ? (
          <MiniSparkline data={group.sparkline} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 500 }}>
            <span>Détails</span>
            <ArrowRight size={13} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   6. REUSABLE COMPONENT: ActivityTimelineItem
   ───────────────────────────────────────────────────────────── */
export const ActivityTimelineItem = ({ item, isLast = false }) => {
  const getCategoryConfig = (cat) => {
    switch (cat) {
      case 'sinistre':
        return { icon: FileText, color: '#C8864E', bg: 'rgba(200,134,78,0.12)', border: 'rgba(200,134,78,0.3)' };
      case 'kyc':
        return { icon: ShieldCheck, color: '#5A9E7C', bg: 'rgba(90,158,124,0.12)', border: 'rgba(90,158,124,0.3)' };
      case 'paiement':
        return { icon: Coins, color: '#C8A96E', bg: 'rgba(200,169,110,0.12)', border: 'rgba(200,169,110,0.3)' };
      case 'adhesion':
        return { icon: Users, color: '#5A82C8', bg: 'rgba(90,130,200,0.12)', border: 'rgba(90,130,200,0.3)' };
      case 'bienvenue':
      default:
        return { icon: Sparkles, color: '#C8A96E', bg: 'rgba(200,169,110,0.12)', border: 'rgba(200,169,110,0.3)' };
    }
  };

  const conf = getCategoryConfig(item.category);
  const Icon = conf.icon;

  return (
    <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: '15px',
            top: '32px',
            bottom: '-8px',
            width: '1px',
            background: 'rgba(240,237,230,0.07)',
          }}
        />
      )}

      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: conf.bg,
          border: `1px solid ${conf.border}`,
          zIndex: 1,
        }}
      >
        <Icon size={14} color={conf.color} />
      </div>

      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? '0' : '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: item.read ? 400 : 600,
              color: item.read ? 'var(--paper-dim)' : 'var(--paper)',
              marginBottom: '0.2rem',
            }}
          >
            {item.title}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', lineHeight: 1.4 }}>
            {item.message}
          </p>
        </div>

        <span
          style={{
            fontSize: '0.6875rem',
            color: 'rgba(240,237,230,0.35)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {item.date}
        </span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT: DashboardPage (Membre TrustPool)
   ───────────────────────────────────────────────────────────── */
export const DashboardPage = ({ user, navigate }) => {
  const [data, setData] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [claimsFilter, setClaimsFilter] = useState('all'); // all | en_attente | validee | rejetee
  const [exportingReport, setExportingReport] = useState(false);

  const isAdmin = user?.role === 'admin_groupe';

  const load = useCallback(async () => {
    try {
      const dbData = await api.getDashboardData();
      let recs = [];
      if (user?.onboarding_complete) {
        recs = await api.getRecommendations().catch(() => []);
      }
      setData({ ...dbData, recommendations: recs });
      setPendingRequests(dbData.pendingRequests || []);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleValidate = async (groupId, userId, statut, requestId) => {
    setProcessingId(requestId);
    try {
      await api.validateJoinRequest(groupId, userId, statut);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      load();
    } catch (e) {
      console.error('Erreur lors de la validation:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportAnnualStatement = () => {
    setExportingReport(true);
    setTimeout(() => {
      setExportingReport(false);
      // Générer une fenêtre d'impression / attestation de mutualisation consolidée
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>TrustPool — Relevé Annuel Consolidé (${new Date().getFullYear()})</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #111; line-height: 1.6; }
                h1 { color: #C8A96E; font-size: 24px; border-bottom: 2px solid #C8A96E; padding-bottom: 10px; }
                .meta { margin-bottom: 20px; font-size: 14px; color: #555; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                th { background-color: #f9f7f2; }
                .total { font-weight: bold; margin-top: 25px; font-size: 16px; }
              </style>
            </head>
            <body>
              <h1>TrustPool — Attestation de Mutualisation & Relevé Annuel</h1>
              <div class="meta">
                <p><strong>Membre :</strong> ${user.pseudonyme || 'Membre'} (${user.email})</p>
                <p><strong>Date d'émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                <p><strong>Groupes actifs :</strong> ${data.groupsJoined}</p>
                <p><strong>Coefficient moyen :</strong> ${data.userCoefficient.toFixed(2)}</p>
              </div>
              <h3>Récapitulatif des Cercles de Confiance</h3>
              <table>
                <thead>
                  <tr><th>Groupe</th><th>Spécialité</th><th>Cotisation mensuelle</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  ${(data.groups || []).map(g => `<tr><td>${g.nom}</td><td>${g.specialite}</td><td>${g.user_cotisation} €</td><td>Actif</td></tr>`).join('')}
                </tbody>
              </table>
              <p class="total">Total mensuel des cotisations : ${data.nextPayment} € / mois</p>
              <p style="margin-top: 30px; font-size: 12px; color: #777;">Document généré automatiquement et certifié par la plateforme d'assurance collaborative TrustPool.</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }, 800);
  };

  // ── 1. Phrase de statut contextuelle dynamique ──────────────────────
  const dynamicStatusHeadline = useMemo(() => {
    if (!data) return "Vos cercles de confiance sont actifs et protégés.";

    const recentClaim = data.myClaims?.[0];
    if (recentClaim) {
      if (recentClaim.statut === 'validee' || recentClaim.statut === 'rembourse') {
        return `Votre indemnisation de ${recentClaim.montant_approuve || recentClaim.montant_declare} € a été validée — vos fonds sont disponibles.`;
      }
      if (recentClaim.statut === 'en_attente') {
        return `Votre déclaration de sinistre (#${(recentClaim.id || '').slice(0, 6)}) est actuellement en cours d'instruction par votre communauté.`;
      }
    }

    if (data.userCoefficient > 1.0) {
      return `Votre coefficient Bonus-Malus actuel est de ${data.userCoefficient.toFixed(2)} — continuez sans sinistre pour retrouver le taux préférentiel.`;
    }
    if (data.userCoefficient < 1.0) {
      return `Félicitations, vous bénéficiez d'un coefficient Bonus de ${data.userCoefficient.toFixed(2)} grâce à votre historique exemplaire.`;
    }

    const lastNotif = data.recentActivity?.[0];
    if (lastNotif?.message) {
      return lastNotif.message;
    }

    if (data.groupsJoined > 0) {
      return `Vous participez activement à ${data.groupsJoined} ${data.groupsJoined > 1 ? 'cercles de confiance' : 'cercle de confiance'} avec une couverture complète.`;
    }

    return "Bienvenue sur TrustPool — trouvez un cercle mutuel adapté à votre profil de risque.";
  }, [data]);

  if (!data) return <PageLoader label="Synchronisation de votre espace TrustPool…" />;

  // ── 2. Répartition des fonds (Donut) ────────────────────────────────
  const totalFunds = data.totalCagnotte || 0;
  const reserveFund = Math.round(totalFunds * 0.28);
  const activePool = totalFunds - reserveFund;

  const chartData = [
    { name: 'Cagnotte Disponible', value: activePool > 0 ? activePool : 8500, color: 'var(--gold)' },
    { name: 'Réserve de Sécurité', value: reserveFund > 0 ? reserveFund : 3500, color: 'var(--slate-light)' },
  ];

  // Filtrer les sinistres selon l'onglet actif
  const filteredClaims = (data.myClaims || []).filter(c => {
    if (claimsFilter === 'all') return true;
    return c.statut === claimsFilter;
  });

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '5.5rem', paddingBottom: '5rem' }}>
      <div className="container-editorial">

        {/* ── 1. HEADER & BANDEAU DE STATUT PERSONNEL DYNAMIQUE ── */}
        <div style={{ marginBottom: '2.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.25rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span className="text-label" style={{ margin: 0 }}>Espace Membre</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>Protection Active</span>
              </div>
              <h1 className="text-display-sm" style={{ margin: 0 }}>
                Bonjour, <DisplayItalic>{user.pseudonyme || 'Membre'}</DisplayItalic>
              </h1>
            </div>

            {/* Actions Rapides Principales */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={() => navigate('/groups')}>
                <Compass size={14} style={{ marginRight: '0.4rem' }} /> Explorer les groupes
              </Btn>
              <Btn variant="primary" onClick={() => navigate('/claims')}>
                <Plus size={14} style={{ marginRight: '0.4rem' }} /> Déclarer un sinistre
              </Btn>
            </div>
          </div>

          {/* Bandeau de synthèse dynamique contextuel (DM Serif Display Italique) */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '1rem 1.25rem',
              background: 'linear-gradient(90deg, rgba(200, 169, 110, 0.08) 0%, rgba(22, 22, 22, 0.6) 100%)',
              borderLeft: '3px solid var(--gold)',
              borderTop: '1px solid rgba(200, 169, 110, 0.15)',
              borderRight: '1px solid rgba(200, 169, 110, 0.15)',
              borderBottom: '1px solid rgba(200, 169, 110, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
            }}
          >
            <Sparkles size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '1.0625rem',
                color: 'var(--paper)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              « {dynamicStatusHeadline} »
            </p>
          </motion.div>
        </div>

        {/* ── EMAIL CONFIRMATION STATUS NOTICES (Double Opt-In) ── */}
        {typeof window !== 'undefined' && window.location.search.includes('email_confirmed=true') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              background: 'rgba(90,158,124,0.1)',
              borderLeft: '3px solid var(--success)',
              border: '1px solid rgba(90,158,124,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.875rem' }}>Adresse email vérifiée avec succès !</p>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.75rem', marginTop: '0.1rem' }}>Votre compte bénéficie désormais d'un niveau de sécurité optimal.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── KYC NOTIFICATIONS / ALERTS ── */}
        {user.kyc_status === 'pending' && (

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              background: 'rgba(200,134,78,0.06)',
              borderLeft: '3px solid var(--warning)',
              border: '1px solid rgba(200,134,78,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={18} color="var(--warning)" />
              <div>
                <p style={{ fontWeight: 600, color: '#E0A870', fontSize: '0.875rem' }}>Vérification d'identité en cours</p>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.75rem', marginTop: '0.1rem' }}>Nos équipes examinent vos pièces justificatives.</p>
              </div>
            </div>
          </motion.div>
        )}

        {user.kyc_status === 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              background: 'rgba(200,134,78,0.06)',
              borderLeft: '3px solid var(--warning)',
              border: '1px solid rgba(200,134,78,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={18} color="var(--warning)" />
              <div>
                <p style={{ fontWeight: 600, color: '#E0A870', fontSize: '0.875rem' }}>Vérification d'identité requise</p>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.75rem', marginTop: '0.1rem' }}>Finalisez votre dossier KYC pour débloquer l'adhésion complète aux groupes.</p>
              </div>
            </div>
            <Btn variant="secondary" onClick={() => navigate('/kyc')}>Vérifier maintenant</Btn>
          </motion.div>
        )}

        {/* ── 2. BANDEAU DE 5 CARTES STATISTIQUES (StatCard) ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          <StatCard
            title="Groupes rejoints"
            value={data.groupsJoined}
            subvalue={data.groupsJoined > 0 ? 'actifs' : 'aucun groupe'}
            icon={Users}
            isActive={data.groupsJoined > 0}
            onClick={() => navigate('/groups')}
          />

          <StatCard
            title="Cagnotte de mes groupes"
            value={`${data.totalCagnotte.toLocaleString()} €`}
            subvalue="fonds mutualisés"
            icon={Wallet}
            isActive={data.totalCagnotte > 0}
            accentColor="var(--gold)"
          />

          <StatCard
            title="Prochaine cotisation"
            value={`${data.nextPayment} €`}
            subvalue="/ mois"
            icon={Coins}
            isActive={data.nextPayment > 0}
            accentColor="var(--warning)"
          />

          <StatCard
            title="Sinistres actifs"
            value={data.activeClaims}
            subvalue={data.activeClaims > 0 ? 'en instruction' : 'aucun en cours'}
            icon={FileText}
            isActive={data.activeClaims > 0}
            accentColor={data.activeClaims > 0 ? 'var(--warning)' : 'var(--paper-dim)'}
            onClick={() => navigate('/claims')}
          />

          <StatCard
            title="Mon coefficient"
            value={Number(data.userCoefficient || 1.0).toFixed(2)}
            subvalue={data.userCoefficient < 1.0 ? 'Bonus accordé' : data.userCoefficient > 1.0 ? 'Malus appliqué' : 'Taux standard'}
            icon={Activity}
            isActive={true}
            accentColor={data.userCoefficient <= 1.0 ? 'var(--success)' : 'var(--warning)'}
            extraElement={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)' }}>Tendance actuelle</span>
                <CoefficientGauge value={data.userCoefficient} size={28} strokeWidth={3} />
              </div>
            }
          />
        </motion.div>

        {/* ── ADMIN PANEL (Si l'utilisateur est admin de groupe) ── */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '2.5rem' }}
          >
            <div
              style={{
                background: 'rgba(200,169,110,0.03)',
                border: '1px solid rgba(200,169,110,0.25)',
                borderLeft: '3px solid var(--gold)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Shield size={16} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Demandes d'adhésion en attente d'arbitrage</SectionLabel>
                  {pendingRequests.length > 0 && (
                    <span
                      style={{
                        background: 'var(--gold)',
                        color: 'var(--ink)',
                        borderRadius: '999px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.5rem',
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </div>
              </div>

              {pendingRequests.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', margin: 0 }}>
                  Aucune demande d'adhésion en attente pour vos groupes.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <AnimatePresence>
                    {pendingRequests.map(req => (
                      <motion.div
                        key={req.id}
                        layout
                        initial={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                          background: 'var(--ink-90)',
                          padding: '0.875rem 1rem',
                          border: '1px solid rgba(240,237,230,0.06)',
                        }}
                      >
                        <div>
                          <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.875rem', margin: 0 }}>
                            {req.pseudonyme_demandeur}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', marginTop: '0.15rem', margin: 0 }}>
                            Groupe : <span style={{ color: 'var(--gold)' }}>{req.nom_groupe}</span> · Match IA : {Math.round((req.score_compatibilite || 0.85) * 100)}%
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            id={`accept-${req.id}`}
                            disabled={processingId === req.id}
                            onClick={() => handleValidate(req.groupe_id, req.utilisateur_id, 'acceptee', req.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              border: '1px solid var(--success)',
                              background: 'rgba(90,158,124,0.12)',
                              color: 'var(--success)',
                              borderRadius: 2,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Accepter
                          </button>
                          <button
                            id={`reject-${req.id}`}
                            disabled={processingId === req.id}
                            onClick={() => handleValidate(req.groupe_id, req.utilisateur_id, 'refusee', req.id)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              border: '1px solid var(--danger)',
                              background: 'rgba(200,90,90,0.1)',
                              color: 'var(--danger)',
                              borderRadius: 2,
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Refuser
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── 3. LIGNE À DEUX COLONNES (DONUT + RECS / MES GROUPES) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.75rem',
            marginBottom: '2.5rem',
          }}
          className="dashboard-two-col"
        >
          {/* COLONNE GAUCHE: Donut "Répartition des fonds" + Bloc "Recommandations IA" */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <Card>
              <SectionLabel>Répartition des fonds</SectionLabel>
              <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={58}
                      outerRadius={78}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTip
                      contentStyle={{
                        background: 'var(--ink-90)',
                        border: '1px solid var(--gold-line)',
                        borderRadius: 2,
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8125rem',
                      }}
                      itemStyle={{ color: 'var(--paper)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div
                  style={{
                    position: 'absolute',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    Total Pool
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--paper)' }}>
                    {totalFunds.toLocaleString()} €
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
                {chartData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card gold>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={14} color="var(--gold)" />
                  <SectionLabel style={{ margin: 0 }}>Recommandations IA</SectionLabel>
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--gold)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Matchmaker
                </span>
              </div>

              {(data.recommendations?.length > 0 ? data.recommendations.slice(0, 2) : (data.suggestedGroups || []).slice(0, 2)).length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', margin: '0.5rem 0' }}>
                  Complétez votre questionnaire d'onboarding pour obtenir des suggestions de pools affinitaires.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(data.recommendations?.length > 0 ? data.recommendations.slice(0, 2) : (data.suggestedGroups || []).slice(0, 2)).map((item, idx) => {
                    const grp = item.groupe || item;
                    const matchScore = item.score_compatibilite ? Math.round(item.score_compatibilite * 100) : 92 - idx * 4;
                    const tags = [
                      `#${grp.specialite || 'Mutuelle'}`,
                      matchScore > 85 ? '#ProfilCompatible' : '#RisqueÉquilibré',
                      grp.cotisation_de_base ? `${grp.cotisation_de_base} €/m` : '#Économique',
                    ];

                    return (
                      <div
                        key={grp.id}
                        onClick={() => navigate(`/groups/${grp.id}`)}
                        style={{
                          padding: '0.875rem 1rem',
                          background: 'var(--ink-80)',
                          border: '1px solid rgba(200, 169, 110, 0.15)',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--ink-60)';
                          e.currentTarget.style.borderColor = 'var(--gold)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--ink-80)';
                          e.currentTarget.style.borderColor = 'rgba(200, 169, 110, 0.15)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                          <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--paper)', margin: 0 }}>
                            {grp.nom}
                          </h5>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: 'var(--gold)',
                              background: 'rgba(200,169,110,0.12)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: 2,
                            }}
                          >
                            Match {matchScore}%
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {tags.map((t, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '0.625rem',
                                color: 'rgba(240,237,230,0.6)',
                                background: 'rgba(240,237,230,0.05)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: 2,
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* COLONNE DROITE: "Mes groupes" en cartes enrichies */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color="var(--gold)" />
                <SectionLabel style={{ margin: 0 }}>Mes groupes</SectionLabel>
              </div>
              <button
                onClick={() => navigate('/groups')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Explorer tout →
              </button>
            </div>

            {(data.groups || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(240,237,230,0.02)', border: '1px dashed rgba(200,169,110,0.2)' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: '1px solid var(--gold-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    background: 'rgba(200,169,110,0.05)',
                  }}
                >
                  <Users size={20} color="var(--gold)" />
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--paper)', marginBottom: '0.5rem' }}>
                  Vous n'avez rejoint aucun groupe
                </h4>
                <p style={{ color: 'var(--paper-dim)', fontSize: '0.875rem', maxWidth: '38ch', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                  Explorez les pools de risque disponibles et faites une demande d'adhésion pour activer votre couverture.
                </p>
                <Btn variant="primary" onClick={() => navigate('/groups')}>
                  Découvrir les cercles
                </Btn>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: (data.groups || []).length === 1 ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {(data.groups || []).map(g => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    showSparkline={(data.groups || []).length <= 2}
                    onClick={() => navigate(`/groups/${g.id}`)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── 4. NOUVELLE SECTION: IMPACT SOLIDAIRE CUMULÉ ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2.5rem' }}
        >
          <div
            style={{
              padding: '1.5rem 1.75rem',
              background: 'linear-gradient(135deg, rgba(200, 169, 110, 0.09) 0%, rgba(30, 30, 30, 0.95) 100%)',
              border: '1px solid rgba(200, 169, 110, 0.35)',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <HeartHandshake size={18} color="var(--gold)" />
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>
                  Impact Solidaire Cumulé
                </span>
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1875rem',
                  fontWeight: 600,
                  color: 'var(--paper)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                Depuis votre inscription, vos cotisations ont contribué à indemniser{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                  {data.impactSolidaire?.totalSinistresRembourses || 0} sinistres
                </span>{' '}
                pour un total de{' '}
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                  {(data.impactSolidaire?.montantTotalMutualise || 0).toLocaleString()} €
                </span>{' '}
                à travers vos {data.groupsJoined} {data.groupsJoined > 1 ? 'groupes' : 'groupe'}.
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', marginTop: '0.35rem', margin: 0 }}>
                Vos versements constituent un fonds de réserve mutualisé non lucratif, restitué ou reporté à la communauté.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', borderLeft: '1px solid rgba(240,237,230,0.1)', paddingLeft: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', display: 'block' }}>
                  Sinistres soutenus
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>
                  {data.impactSolidaire?.totalSinistresRembourses || 0}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', display: 'block' }}>
                  Fonds mutualisés
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--paper)' }}>
                  {(data.impactSolidaire?.montantTotalMutualise || 0).toLocaleString()} €
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 5. NOUVELLE SECTION: "MES SINISTRES" CONSOLIDÉS ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--gold)" />
                <SectionLabel style={{ margin: 0 }}>Mes sinistres (tous groupes confondus)</SectionLabel>
                <span
                  style={{
                    background: 'rgba(240,237,230,0.06)',
                    color: 'var(--paper-dim)',
                    borderRadius: '999px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.5rem',
                  }}
                >
                  {data.myClaims?.length || 0}
                </span>
              </div>

              {/* Filtres par statut */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--ink-80)', padding: '0.2rem', borderRadius: 2 }}>
                {[
                  { key: 'all', label: 'Tous' },
                  { key: 'en_attente', label: 'En cours' },
                  { key: 'validee', label: 'Approuvés' },
                  { key: 'rejetee', label: 'Refusés' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setClaimsFilter(tab.key)}
                    style={{
                      border: 'none',
                      background: claimsFilter === tab.key ? 'var(--gold)' : 'transparent',
                      color: claimsFilter === tab.key ? 'var(--ink)' : 'var(--paper-dim)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.6rem',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredClaims.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1.5rem',
                  background: 'rgba(90,158,124,0.04)',
                  border: '1px solid rgba(90,158,124,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <ShieldCheck size={26} color="var(--success)" />
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.9375rem', margin: 0 }}>
                      Aucun sinistre {claimsFilter !== 'all' ? `avec le statut "${claimsFilter}"` : 'déclaré'}
                    </p>
                    <p style={{ color: 'var(--paper-dim)', fontSize: '0.8125rem', margin: '0.15rem 0 0 0' }}>
                      Votre historique est exemplaire — vous conservez votre coefficient préférentiel.
                    </p>
                  </div>
                </div>
                <Btn variant="secondary" onClick={() => navigate('/claims')}>
                  Déclarer un sinistre
                </Btn>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {filteredClaims.map(claim => (
                  <div
                    key={claim.id}
                    onClick={() => navigate('/claims')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      background: 'var(--ink-90)',
                      border: '1px solid rgba(240,237,230,0.06)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--gold)';
                      e.currentTarget.style.background = 'var(--ink-80)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(240,237,230,0.06)';
                      e.currentTarget.style.background = 'var(--ink-90)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '240px' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          background: 'rgba(200,169,110,0.08)',
                          border: '1px solid rgba(200,169,110,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '0.1rem',
                        }}
                      >
                        <FileText size={16} color="var(--gold)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.9375rem', margin: 0, fontFamily: 'var(--font-display)' }}>
                          {claim.description ? (claim.description.length > 60 ? `${claim.description.slice(0, 60)}…` : claim.description) : 'Sinistre sans titre'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: '0.2rem 0 0 0' }}>
                          Groupe : <span style={{ color: 'var(--gold)', fontWeight: 500 }}>{claim.nom_groupe}</span> · Déclaré le {claim.formatted_date}
                        </p>

                        {/* Motif formaté si refusé */}
                        {claim.statut === 'rejetee' && (
                          <p style={{ fontSize: '0.75rem', color: '#E08888', background: 'rgba(200,90,90,0.08)', padding: '0.25rem 0.5rem', borderRadius: 2, marginTop: '0.4rem', borderLeft: '2px solid var(--danger)' }}>
                            <strong>Motif :</strong> {formatRejectionMotif(claim.motif_rejet)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--paper-dim)', display: 'block', textTransform: 'uppercase' }}>
                          Montant
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--paper)' }}>
                          {claim.montant_approuve ? `${claim.montant_approuve} €` : `${claim.montant_declare} €`}
                        </span>
                      </div>

                      <ClaimStatusBadge statut={claim.statut} />
                      <ChevronRight size={15} color="var(--paper-dim)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── 6. NOUVELLE SECTION: COMPARATEUR ENTRE MES GROUPES ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} color="var(--gold)" />
                <SectionLabel style={{ margin: 0 }}>Comparateur entre mes groupes</SectionLabel>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>
                {data.groupsJoined} {data.groupsJoined > 1 ? 'groupes actifs' : 'groupe actif'}
              </span>
            </div>

            {(data.groups || []).length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--paper-dim)', margin: 0 }}>
                Rejoignez au moins deux groupes pour comparer vos coefficients et cotisations.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(240,237,230,0.1)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Groupe & Spécialité</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mon Coeff.</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cotisation Mensuelle</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dernier Sinistre</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cagnotte Pool</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.6875rem', color: 'var(--paper-dim)', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.groups || []).map((g, idx) => {
                      const isBestPrice = g.user_cotisation === Math.min(...(data.groups || []).map(x => x.user_cotisation));
                      const isBestCoeff = g.user_coefficient === Math.min(...(data.groups || []).map(x => x.user_coefficient));
                      const groupClaim = (data.myClaims || []).find(c => c.groupe_id === g.id);

                      return (
                        <tr
                          key={g.id}
                          style={{
                            borderBottom: '1px solid rgba(240,237,230,0.05)',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,169,110,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '1rem', minWidth: '200px' }}>
                            <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.9375rem', margin: 0, fontFamily: 'var(--font-display)' }}>
                              {g.nom}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>
                              {g.specialite}
                            </span>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 700,
                                  color: g.user_coefficient < 1.0 ? 'var(--success)' : g.user_coefficient > 1.0 ? 'var(--warning)' : 'var(--gold)',
                                }}
                              >
                                {Number(g.user_coefficient || 1.0).toFixed(2)}
                              </span>
                              {isBestCoeff && (
                                <span style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem', background: 'rgba(90,158,124,0.15)', color: 'var(--success)', borderRadius: 2, fontWeight: 600 }}>
                                  Meilleur
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--paper)' }}>
                                {g.user_cotisation} €
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>/mois</span>
                              {isBestPrice && (data.groups || []).length > 1 && (
                                <span style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem', background: 'rgba(200,169,110,0.15)', color: 'var(--gold)', borderRadius: 2, fontWeight: 600 }}>
                                  Moins cher
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--paper-dim)' }}>
                            {groupClaim ? (
                              <span style={{ color: groupClaim.statut === 'validee' ? 'var(--success)' : 'var(--warning)' }}>
                                {groupClaim.formatted_date} ({groupClaim.statut === 'validee' ? 'Validé' : 'En cours'})
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ Vierge (Bonus actif)</span>
                            )}
                          </td>

                          <td style={{ padding: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--gold)' }}>
                            {Number(g.cagnotte || 0).toLocaleString()} €
                          </td>

                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <Btn variant="ghost" onClick={() => navigate(`/groups/${g.id}`)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                              Ouvrir →
                            </Btn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ── 7. NOUVELLE SECTION: CALENDRIER DE PAIEMENTS & ÉVOLUTION COEFFICIENT ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.75rem',
            marginBottom: '2.5rem',
          }}
          className="dashboard-two-col"
        >
          {/* CALENDRIER DE PAIEMENTS CONSOLIDÉ */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--gold)" />
                <SectionLabel style={{ margin: 0 }}>Calendrier de paiements consolidé</SectionLabel>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', fontWeight: 600 }}>
                Total : {data.nextPayment} € / mois
              </span>
            </div>

            {(data.paymentSchedule || []).length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--paper-dim)', margin: 0 }}>
                Aucune échéance de cotisation programmée.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(data.paymentSchedule || []).map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: 'var(--ink-90)',
                      border: '1px solid rgba(240,237,230,0.06)',
                      borderRadius: 2,
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--paper)', fontSize: '0.875rem', margin: 0 }}>
                        {item.nom_groupe}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: '0.15rem 0 0 0' }}>
                        Échéance : <span style={{ color: 'var(--gold)' }}>{item.date_echeance}</span> · {item.methode}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--paper)' }}>
                        {item.montant} €
                      </span>
                      <span style={{ fontSize: '0.6875rem', padding: '0.15rem 0.45rem', background: 'rgba(90,158,124,0.12)', color: 'var(--success)', border: '1px solid rgba(90,158,124,0.25)', borderRadius: 2, fontWeight: 600 }}>
                        {item.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ÉVOLUTION DU COEFFICIENT BONUS-MALUS DANS LE TEMPS (Graphique Recharts) */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={16} color="var(--success)" />
                <SectionLabel style={{ margin: 0 }}>Évolution du coefficient Bonus-Malus</SectionLabel>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>
                Moyenne : {data.userCoefficient.toFixed(2)}
              </span>
            </div>

            <div style={{ height: '180px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.coefficientHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coeffGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--gold)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,237,230,0.05)" />
                  <XAxis dataKey="mois" stroke="rgba(240,237,230,0.3)" fontSize={11} />
                  <YAxis domain={[0.6, 1.4]} stroke="rgba(240,237,230,0.3)" fontSize={11} tickCount={5} />
                  <RechartsTip
                    contentStyle={{
                      background: 'var(--ink-90)',
                      border: '1px solid var(--gold-line)',
                      borderRadius: 2,
                      fontSize: '0.8125rem',
                    }}
                    itemStyle={{ color: 'var(--paper)' }}
                    formatter={(val) => [`${Number(val).toFixed(2)}`, 'Coefficient']}
                  />
                  <Area
                    type="monotone"
                    dataKey="coefficient"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#coeffGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', marginTop: '0.5rem', textAlign: 'center', margin: 0 }}>
              Chaque période complète sans sinistre génère un bonus cumulatif sur toutes vos cotisations.
            </p>
          </Card>
        </div>

        {/* ── 8. NOUVELLES SECTIONS: CENTRE DE SÉCURITÉ & ACTIONS RAPIDES TRANSVERSES ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.75rem',
            marginBottom: '2.5rem',
          }}
          className="dashboard-two-col"
        >
          {/* CENTRE DE SÉCURITÉ DU COMPTE */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={16} color="var(--gold)" />
              <SectionLabel style={{ margin: 0 }}>Centre de sécurité & KYC</SectionLabel>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Statut KYC */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', background: 'var(--ink-90)', border: '1px solid rgba(240,237,230,0.06)', borderRadius: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={18} color={user.kyc_status === 'verified' ? 'var(--success)' : 'var(--warning)'} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--paper)', margin: 0 }}>
                      Dossier d'identité (KYC)
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: '0.1rem 0 0 0' }}>
                      {user.kyc_status === 'verified' ? 'Vérifié par la conformité' : 'En attente ou à compléter'}
                    </p>
                  </div>
                </div>
                <Badge variant={user.kyc_status === 'verified' ? 'success' : 'warning'}>
                  {user.kyc_status === 'verified' ? 'Vérifié' : user.kyc_status === 'pending' ? 'En cours' : 'Non validé'}
                </Badge>
              </div>

              {/* Moyen de Paiement */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', background: 'var(--ink-90)', border: '1px solid rgba(240,237,230,0.06)', borderRadius: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CreditCard size={18} color="var(--gold)" />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--paper)', margin: 0 }}>
                      Moyen de paiement par défaut
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: '0.1rem 0 0 0' }}>
                      Carte bancaire Visa •••• 4242 (Exp. 08/28)
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>
                  Actif
                </span>
              </div>

              {/* Sécurité Globale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>
                  Chiffrement symétrique Fernet & Session JWT active
                </span>
                <button
                  onClick={() => navigate('/profile')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--gold)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Gérer mon profil →
                </button>
              </div>
            </div>
          </Card>

          {/* ACTIONS RAPIDES TRANSVERSES */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ArrowUpRight size={16} color="var(--gold)" />
              <SectionLabel style={{ margin: 0 }}>Actions rapides transverses</SectionLabel>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleExportAnnualStatement}
                disabled={exportingReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'var(--ink-90)',
                  border: '1px solid rgba(240,237,230,0.07)',
                  borderRadius: 2,
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(240,237,230,0.07)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Download size={16} color="var(--gold)" />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                      Exporter mon relevé annuel
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: 0 }}>
                      Génère une attestation consolidée de vos cotisations
                    </p>
                  </div>
                </div>
                <ChevronRight size={15} color="var(--paper-dim)" />
              </button>

              <button
                onClick={() => navigate('/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'var(--ink-90)',
                  border: '1px solid rgba(240,237,230,0.07)',
                  borderRadius: 2,
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(240,237,230,0.07)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Bell size={16} color="var(--gold)" />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                      Gérer mes notifications & alertes
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: 0 }}>
                      Paramètres des emails et rappels d'échéances
                    </p>
                  </div>
                </div>
                <ChevronRight size={15} color="var(--paper-dim)" />
              </button>

              <button
                onClick={() => {
                  const chatButton = document.querySelector('[data-chat-toggle="true"]');
                  if (chatButton) chatButton.click();
                  else navigate('/how-it-works');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'var(--ink-90)',
                  border: '1px solid rgba(240,237,230,0.07)',
                  borderRadius: 2,
                  color: 'var(--paper)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(240,237,230,0.07)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <HelpCircle size={16} color="var(--gold)" />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                      Contacter le support ou la conformité
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--paper-dim)', margin: 0 }}>
                      Assistance Copilote IA et équipe de modération
                    </p>
                  </div>
                </div>
                <ChevronRight size={15} color="var(--paper-dim)" />
              </button>
            </div>
          </Card>
        </div>

        {/* ── 9. SECTION: "ACTIVITÉ RÉCENTE" (TIMELINE COMPLÈTE) ── */}
        <div>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={16} color="var(--gold)" />
                <SectionLabel style={{ margin: 0 }}>Journal d'activité récente</SectionLabel>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--paper-dim)' }}>
                {data.recentActivity.length} événements enregistrés
              </span>
            </div>

            {data.recentActivity.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--paper-dim)', padding: '1rem 0', margin: 0 }}>
                Aucun événement récent enregistré sur votre compte.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.recentActivity.map((notif, index) => (
                  <ActivityTimelineItem
                    key={notif.id || index}
                    item={notif}
                    isLast={index === data.recentActivity.length - 1}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      <style>{`
        @media (min-width: 1024px) {
          .dashboard-two-col {
            grid-template-columns: 1fr 1.65fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
};
