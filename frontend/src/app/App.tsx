import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Users, Bell, CheckCircle2, AlertTriangle, Info,
  Clock, FileText, LogOut, Plus, Lock, Unlock, Filter,
  ChevronRight, X, Upload, Eye, EyeOff, AlertCircle,
  ArrowRight, Bike, Smartphone, Wrench,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "membre" | "admin_groupe" | "equipe_conformite";
type Page = "auth" | "dashboard" | "kyc" | "catalogue" | "group-detail" | "admin" | "conformite";
type KycStatus = "pending" | "verifying" | "verified" | "failed" | "manual_review";
type ClaimStatus = "en_attente" | "validee" | "rejetee";

interface Group { id: string; name: string; specialty: string; poolBalance: number; poolTarget: number; memberCount: number; maxMembers: number; baseCotisation: number; memberPseudos: string[]; Icon: React.FC<{ size?: number; className?: string }>; }
interface Claim { id: string; pseudo: string; description: string; amount: number; status: ClaimStatus; date: string; aiScore: number; aiExplanation: string; hdfs_url: string; }
interface Adhesion { id: string; pseudo: string; date: string; status: "en_attente" | "acceptee" | "refusee"; }
interface Cotisation { id: string; groupName: string; amount: number; dueDate: string; paid: boolean; }
interface Notif { id: string; type: "info" | "success" | "warning"; message: string; read: boolean; date: string; }
interface AuditLog { id: string; action: string; target: string; actor: string; date: string; type: "kyc" | "claim" | "adhesion" | "anonymat"; }
interface AnonymityReq { id: string; pseudo: string; groupName: string; requestedBy: string; justification_legale: string; statut: "en_attente" | "approuvee"; realName: string; realDoc: string; }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const GROUPS: Group[] = [
  { id: "g1", name: "Cyclistes du Grand Paris", specialty: "Vélo & mobilité douce", poolBalance: 8420, poolTarget: 12000, memberCount: 14, maxMembers: 20, baseCotisation: 35.00, memberPseudos: ["membre_482913", "membre_731042", "membre_291847", "membre_651023", "membre_884720", "membre_103847", "membre_573901", "membre_228461"], Icon: Bike },
  { id: "g2", name: "Smartphone Owners Club", specialty: "Appareils électroniques", poolBalance: 5150, poolTarget: 9000, memberCount: 22, maxMembers: 25, baseCotisation: 22.50, memberPseudos: ["membre_309182", "membre_770231", "membre_481920", "membre_592847", "membre_671038", "membre_114092"], Icon: Smartphone },
  { id: "g3", name: "Artisans du Bâtiment Nord", specialty: "Outils professionnels", poolBalance: 14800, poolTarget: 15000, memberCount: 18, maxMembers: 20, baseCotisation: 55.00, memberPseudos: ["membre_182734", "membre_920374", "membre_401928", "membre_847201", "membre_330912"], Icon: Wrench },
];

const CLAIMS_INIT: Claim[] = [
  { id: "c1", pseudo: "membre_482913", description: "Chute à vélo sur piste cyclable, roue avant endommagée et guidon tordu. Réparation urgente.", amount: 320.00, status: "en_attente", date: "28 jan. 2026", aiScore: 0.08, aiExplanation: "Profil cohérent avec l'historique du groupe. Montant dans la médiane des sinistres vélo (280 €). Aucune anomalie détectée.", hdfs_url: "facture_reparation_velo.pdf" },
  { id: "c2", pseudo: "membre_731042", description: "Vol de vélo électrique attaché devant la gare, cadenas sectionné au disqueuse.", amount: 1850.00, status: "en_attente", date: "25 jan. 2026", aiScore: 0.67, aiExplanation: "Montant 5× supérieur à la médiane (310 €). Troisième déclaration en 8 mois. L'analyse suggère de demander des justificatifs complémentaires — la décision vous appartient.", hdfs_url: "plainte_police.pdf" },
  { id: "c3", pseudo: "membre_291847", description: "Crevaison double lors d'une sortie longue distance, remplacement des deux chambres.", amount: 45.00, status: "validee", date: "15 jan. 2026", aiScore: 0.02, aiExplanation: "Sinistre courant, montant faible, aucune anomalie détectée.", hdfs_url: "recu_reparation.pdf" },
];

const ADHESIONS_INIT: Adhesion[] = [
  { id: "a1", pseudo: "membre_994710", date: "29 jan.", status: "en_attente" },
  { id: "a2", pseudo: "membre_372819", date: "27 jan.", status: "en_attente" },
  { id: "a3", pseudo: "membre_558302", date: "20 jan.", status: "acceptee" },
];

const COTISATIONS_INIT: Cotisation[] = [
  { id: "co1", groupName: "Cyclistes du Grand Paris", amount: 35.00, dueDate: "1er fév.", paid: false },
  { id: "co2", groupName: "Smartphone Owners Club", amount: 22.50, dueDate: "1er fév.", paid: false },
  { id: "co3", groupName: "Cyclistes du Grand Paris", amount: 35.00, dueDate: "1er jan.", paid: true },
];

const NOTIFS_INIT: Notif[] = [
  { id: "n1", type: "success", message: "Votre sinistre du 15 jan. a été remboursé (45,00 €).", read: false, date: "Aujourd'hui" },
  { id: "n2", type: "warning", message: "Votre cotisation de février est due dans 4 jours.", read: false, date: "Aujourd'hui" },
  { id: "n3", type: "info", message: "Un nouveau membre a rejoint votre groupe Cyclistes.", read: true, date: "Hier" },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: "l1", action: "Sinistre validé", target: "c3 · membre_291847", actor: "admin_g1", date: "16 jan. · 11:42", type: "claim" },
  { id: "l2", action: "Adhésion acceptée", target: "a3 · membre_558302", actor: "admin_g1", date: "20 jan. · 09:15", type: "adhesion" },
  { id: "l3", action: "KYC vérifié", target: "membre_482913", actor: "système", date: "10 jan. · 14:30", type: "kyc" },
  { id: "l4", action: "Levée d'anonymat demandée", target: "membre_731042", actor: "admin_g1", date: "28 jan. · 16:05", type: "anonymat" },
];

const ANON_REQS_INIT: AnonymityReq[] = [
  { id: "ar1", pseudo: "membre_731042", groupName: "Cyclistes du Grand Paris", requestedBy: "admin_g1", justification_legale: "Troisième déclaration de sinistre en 8 mois. Montant anormalement élevé (1 850 €). Soupçon de fraude coordonnée nécessitant identification formelle.", statut: "en_attente", realName: "Jean-Pierre Morin", realDoc: "CNI · 1 88 04 75 123 456 78" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const PSEUDO_COLORS: Record<string, string> = {};
const PSEUDO_PALETTE = ["#4B7FCC", "#3A7D5C", "#8B6FCC", "#CC7A4B", "#4B9FAA", "#7ACC4B", "#CC4B7A", "#CC9F4B"];
function pseudoColor(pseudo: string): string {
  if (!PSEUDO_COLORS[pseudo]) {
    let h = 0;
    for (let i = 0; i < pseudo.length; i++) h = (h * 31 + pseudo.charCodeAt(i)) % PSEUDO_PALETTE.length;
    PSEUDO_COLORS[pseudo] = PSEUDO_PALETTE[h];
  }
  return PSEUDO_COLORS[pseudo];
}

// ─── Primitive Components ─────────────────────────────────────────────────────

function PseudoAvatar({ pseudo, size = 36, showLabel = false }: { pseudo: string; size?: number; showLabel?: boolean }) {
  const color = pseudoColor(pseudo);
  const abbr = pseudo.slice(-4);
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0 font-mono font-semibold"
        style={{ width: size, height: size, background: `${color}22`, border: `1.5px solid ${color}55`, color, fontSize: size * 0.28 }}
      >
        {abbr}
      </div>
      {showLabel && <span className="text-sm font-mono text-[#8BA4C4]">{pseudo}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "En attente", color: "#E88C47", bg: "rgba(232,140,71,0.12)" },
    verifying: { label: "Vérification…", color: "#4B9FCC", bg: "rgba(75,159,204,0.12)" },
    verified: { label: "Vérifié", color: "#3A7D5C", bg: "rgba(58,125,92,0.12)" },
    failed: { label: "Échoué", color: "#C0503A", bg: "rgba(192,80,58,0.12)" },
    manual_review: { label: "Revue manuelle", color: "#8B6FCC", bg: "rgba(139,111,204,0.12)" },
    en_attente: { label: "En attente", color: "#E88C47", bg: "rgba(232,140,71,0.12)" },
    validee: { label: "Validé", color: "#3A7D5C", bg: "rgba(58,125,92,0.12)" },
    rejetee: { label: "Rejeté", color: "#C0503A", bg: "rgba(192,80,58,0.12)" },
    acceptee: { label: "Accepté", color: "#3A7D5C", bg: "rgba(58,125,92,0.12)" },
    refusee: { label: "Refusé", color: "#C0503A", bg: "rgba(192,80,58,0.12)" },
  };
  const s = map[status] ?? { label: status, color: "#5C7090", bg: "rgba(92,112,144,0.1)" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function CircularGauge({ value, max, size = 160, color, label, sublabel }: { value: number; max: number; size?: number; color: string; label: string; sublabel?: string }) {
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const dash = pct * circ;
  const gap = circ - dash;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="absolute text-center" style={{ marginTop: -(size / 2 + 28) }}>
      </div>
      <div className="text-center -mt-2">
        <p className="font-semibold text-[#D4E0F0]" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15 }}>{label}</p>
        {sublabel && <p className="text-xs text-[#5C7090] mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function CircularGaugeInline({ value, max, size = 140, color, centerLabel, centerSub }: { value: number; max: number; size?: number; color: string; centerLabel: string; centerSub?: string }) {
  const r = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const dash = pct * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={9} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="text-center z-10 px-1">
        <p className="font-bold text-[#D4E0F0] leading-tight" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16 }}>{centerLabel}</p>
        {centerSub && <p className="text-[10px] text-[#5C7090] mt-0.5 leading-tight">{centerSub}</p>}
      </div>
    </div>
  );
}

function BonusMalusGauge({ coefficient }: { coefficient: number }) {
  // 0.50 = full bonus (leftmost), 2.0 = full malus (rightmost), 1.0 = neutral
  const min = 0.5, max = 2.0;
  const pct = ((coefficient - min) / (max - min)) * 100;
  const color = coefficient < 1.0 ? "#3A7D5C" : coefficient > 1.2 ? "#C0503A" : "#E88C47";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[#5C7090] font-mono">
        <span>× 0,50 — Bonus max</span>
        <span>Malus max — × 2,00</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(to right, #3A7D5C, #E88C47, #C0503A)" }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(13,17,23,0.7)" }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-700"
          style={{ left: `calc(${pct}% - 8px)`, background: color }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[#5C7090]">Neutre à × 1,00</span>
        <span className="font-bold font-mono text-sm" style={{ color }}>× {coefficient.toFixed(2)} — votre coefficient</span>
      </div>
    </div>
  );
}

function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ background: "#141E2E", border: "1px solid rgba(255,255,255,0.07)", ...style }}>
      {children}
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#5C7090] block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-[#D4E0F0] text-sm outline-none focus:ring-2 focus:ring-[#4B7FCC]/40 transition-all placeholder-[#3A4D66]"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif" }}
      />
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled = false, size = "md", className = "" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "accent"; disabled?: boolean; size?: "sm" | "md"; className?: string }) {
  const variants = {
    primary: { background: "linear-gradient(135deg, #3D6DB8, #5A8DD4)", color: "#fff" },
    accent: { background: "linear-gradient(135deg, #C97838, #E88C47)", color: "#fff" },
    danger: { background: "rgba(192,80,58,0.15)", color: "#C0503A", border: "1px solid rgba(192,80,58,0.25)" },
    ghost: { background: "rgba(255,255,255,0.04)", color: "#8BA4C4", border: "1px solid rgba(255,255,255,0.08)" },
  };
  const sizes = { sm: "px-3 py-1.5 text-xs rounded-lg", md: "px-5 py-2.5 text-sm rounded-xl" };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-medium flex items-center gap-2 justify-center transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 ${sizes[size]} ${className}`}
      style={v as React.CSSProperties}
    >
      {children}
    </button>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Page; label: string; roles: Role[]; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Mon espace", roles: ["membre"], icon: <Shield size={17} /> },
  { id: "kyc", label: "Vérification d'identité", roles: ["membre"], icon: <Shield size={17} /> },
  { id: "catalogue", label: "Groupes", roles: ["membre", "admin_groupe"], icon: <Users size={17} /> },
  { id: "group-detail", label: "Mon groupe", roles: ["membre", "admin_groupe"], icon: <Users size={17} /> },
  { id: "admin", label: "Administration", roles: ["admin_groupe"], icon: <FileText size={17} /> },
  { id: "conformite", label: "Conformité", roles: ["equipe_conformite"], icon: <Lock size={17} /> },
];

function Sidebar({ page, role, onNav, notifCount }: { page: Page; role: Role; onNav: (p: Page) => void; notifCount: number }) {
  const items = NAV_ITEMS.filter((n) => n.roles.includes(role));
  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col z-30" style={{ background: "rgba(13,17,23,0.96)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="relative w-9 h-9">
          <svg width={36} height={36} viewBox="0 0 36 36">
            <circle cx={18} cy={18} r={15} fill="none" stroke="#4B7FCC" strokeWidth={2} opacity={0.3} />
            <circle cx={18} cy={18} r={10} fill="none" stroke="#4B7FCC" strokeWidth={2} opacity={0.5} />
            <circle cx={18} cy={18} r={5} fill="#4B7FCC" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-[15px] leading-tight" style={{ fontFamily: "DM Sans, sans-serif" }}>CercleMutuel</p>
          <p className="text-[10px] text-[#3A5A82] tracking-widest uppercase font-medium">entraide P2P</p>
        </div>
      </div>

      {/* Role pill */}
      <div className="mx-4 mb-4 px-3 py-1.5 rounded-full text-center text-[11px] font-medium"
        style={{ background: "rgba(75,127,204,0.1)", color: "#93B4E8", border: "1px solid rgba(75,127,204,0.15)" }}>
        {role === "membre" ? "Membre" : role === "admin_groupe" ? "Admin groupe" : "Équipe conformité"}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((item) => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative group"
              style={{ background: active ? "rgba(75,127,204,0.14)" : "transparent", color: active ? "#93B4E8" : "#5C7090" }}>
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#4B7FCC]" />}
              <span style={{ color: active ? "#4B7FCC" : "#3A4D66" }}>{item.icon}</span>
              <span className={`text-left font-medium ${active ? "text-[#B8D0F0]" : "group-hover:text-[#8BA4C4] transition-colors"}`} style={{ fontFamily: "Inter, sans-serif" }}>{item.label}</span>
              {item.id === "dashboard" && notifCount > 0 && (
                <span className="ml-auto bg-[#C0503A] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{notifCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-3 mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <PseudoAvatar pseudo="membre_482913" size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-[#8BA4C4] truncate">membre_482913</p>
            <p className="text-[10px] text-[#3A5A82]">vous</p>
          </div>
          <LogOut size={14} className="text-[#3A4D66] hover:text-[#8BA4C4] cursor-pointer transition-colors" />
        </div>
      </div>
    </aside>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────

const PSEUDO_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function AuthPage({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<"form" | "reveal">("form");
  const [pseudo, setPseudo] = useState("membre_??????");
  const FINAL_PSEUDO = "membre_482913";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);

  const startReveal = useCallback(() => {
    setStep("reveal");
    countRef.current = 0;
    intervalRef.current = setInterval(() => {
      countRef.current++;
      const target = FINAL_PSEUDO.split("");
      const suffix = target.slice(7);
      const current = suffix.map((ch, i) => {
        if (countRef.current > i * 4 + 8) return ch;
        return PSEUDO_CHARS[Math.floor(Math.random() * PSEUDO_CHARS.length)];
      });
      setPseudo("membre_" + current.join(""));
      if (countRef.current >= 7 * 4 + 8 + 10) {
        clearInterval(intervalRef.current!);
        setPseudo(FINAL_PSEUDO);
      }
    }, 60);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  if (step === "reveal") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1117" }}>
        <div className="max-w-sm w-full mx-4 text-center space-y-8">
          <div className="relative w-24 h-24 mx-auto">
            <svg width={96} height={96} viewBox="0 0 96 96">
              <circle cx={48} cy={48} r={40} fill="none" stroke="rgba(75,127,204,0.15)" strokeWidth={2} />
              <circle cx={48} cy={48} r={28} fill="none" stroke="rgba(75,127,204,0.3)" strokeWidth={2} />
              <circle cx={48} cy={48} r={14} fill="rgba(75,127,204,0.2)" stroke="#4B7FCC" strokeWidth={2} />
            </svg>
          </div>
          <div>
            <p className="text-[#5C7090] text-sm mb-3" style={{ fontFamily: "Inter, sans-serif" }}>Votre identité dans le cercle</p>
            <p className="font-mono font-bold text-2xl tracking-widest text-[#D4E0F0]" style={{ letterSpacing: "0.05em" }}>{pseudo}</p>
            <p className="text-xs text-[#3A5A82] mt-3 max-w-xs mx-auto leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
              Ce pseudonyme est permanent. Les autres membres ne verront jamais votre vrai nom.
            </p>
          </div>
          {pseudo === FINAL_PSEUDO && (
            <Btn onClick={onLogin} variant="primary" className="w-full">
              Entrer dans mon espace <ArrowRight size={15} />
            </Btn>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0D1117" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto relative">
            <svg width={56} height={56} viewBox="0 0 56 56">
              <circle cx={28} cy={28} r={24} fill="none" stroke="#4B7FCC" strokeWidth={1.5} opacity={0.25} />
              <circle cx={28} cy={28} r={16} fill="none" stroke="#4B7FCC" strokeWidth={1.5} opacity={0.45} />
              <circle cx={28} cy={28} r={7} fill="#4B7FCC" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>CercleMutuel</h1>
            <p className="text-sm text-[#5C7090] mt-1">Assurance collaborative entre pairs</p>
          </div>
        </div>

        <Card className="p-6 space-y-5">
          <div className="flex rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2.5 text-sm font-medium transition-all"
                style={{ background: mode === m ? "#1C2A3D" : "transparent", color: mode === m ? "#B8D0F0" : "#5C7090" }}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <Input label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.fr" />
            <div className="space-y-1.5 relative">
              <label className="text-xs text-[#5C7090] block">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-[#D4E0F0] text-sm outline-none focus:ring-2 focus:ring-[#4B7FCC]/40 transition-all placeholder-[#3A4D66]"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif" }}
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A4D66] hover:text-[#8BA4C4] transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <Btn onClick={mode === "register" ? startReveal : onLogin} variant="primary" className="w-full">
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
            <ArrowRight size={15} />
          </Btn>
        </Card>

        <p className="text-center text-xs text-[#3A4D66] leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          Votre identité est pseudonymisée. Aucun membre ne verra votre vrai nom.
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ kycStatus, cotisations, setCotisations, notifs, setNotifs }: {
  kycStatus: KycStatus;
  cotisations: Cotisation[];
  setCotisations: React.Dispatch<React.SetStateAction<Cotisation[]>>;
  notifs: Notif[];
  setNotifs: React.Dispatch<React.SetStateAction<Notif[]>>;
}) {
  const unpaid = cotisations.filter((c) => !c.paid);
  const unread = notifs.filter((n) => !n.read);

  const pay = (id: string) => setCotisations((prev) => prev.map((c) => c.id === id ? { ...c, paid: true } : c));
  const markRead = (id: string) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const dismiss = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  const notifIcon = { info: <Info size={14} />, success: <CheckCircle2 size={14} />, warning: <AlertTriangle size={14} /> };
  const notifColor = { info: "#4B7FCC", success: "#3A7D5C", warning: "#E88C47" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Mon espace</h1>
        <p className="text-sm text-[#5C7090] mt-1">membre_482913 · Bienvenue dans votre cercle de confiance</p>
      </div>

      {/* KYC status */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kycStatus === "verified" ? "rgba(58,125,92,0.15)" : "rgba(232,140,71,0.15)" }}>
            {kycStatus === "verified" ? <CheckCircle2 size={20} style={{ color: "#3A7D5C" }} /> : <Clock size={20} style={{ color: "#E88C47" }} />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="font-medium text-[#D4E0F0]">Vérification d'identité</p>
              <StatusBadge status={kycStatus} />
            </div>
            <p className="text-xs text-[#5C7090] mt-0.5">
              {kycStatus === "verified" && "Votre identité est confirmée. Vous pouvez rejoindre des groupes."}
              {kycStatus === "verifying" && "Traitement en cours — cela prend quelques instants…"}
              {kycStatus === "pending" && "Complétez votre vérification pour rejoindre des groupes."}
              {kycStatus === "manual_review" && "Un agent examine votre dossier. Vous serez notifié."}
              {kycStatus === "failed" && "La vérification a échoué. Veuillez soumettre à nouveau vos documents."}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cotisations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Mes cotisations</h3>
            {unpaid.length > 0 && <span className="text-xs font-mono text-[#E88C47]">{unpaid.length} à payer</span>}
          </div>
          <div className="space-y-3">
            {cotisations.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#B8D0F0] truncate">{c.groupName}</p>
                  <p className="text-xs text-[#5C7090]">Échéance : {c.dueDate}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-[#D4E0F0]">{fmt(c.amount)}</span>
                {c.paid
                  ? <span className="text-xs text-[#3A7D5C] font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Payé</span>
                  : <Btn size="sm" variant="accent" onClick={() => pay(c.id)}>Payer</Btn>}
              </div>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Notifications</h3>
            {unread.length > 0 && (
              <button onClick={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))} className="text-xs text-[#4B7FCC] hover:underline">Tout lire</button>
            )}
          </div>
          <div className="space-y-2">
            {notifs.map((n) => (
              <div key={n.id} className="flex gap-3 items-start group p-2 rounded-xl transition-colors hover:bg-white/[0.02]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${notifColor[n.type]}18`, color: notifColor[n.type] }}>
                  {notifIcon[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? "text-[#5C7090]" : "text-[#B8D0F0]"}`}>{n.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[#3A4D66]">{n.date}</span>
                    {!n.read && <button onClick={() => markRead(n.id)} className="text-[11px] text-[#4B7FCC] hover:underline">Marquer lue</button>}
                  </div>
                </div>
                <button onClick={() => dismiss(n.id)} className="text-[#3A4D66] hover:text-[#8BA4C4] transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
              </div>
            ))}
            {notifs.length === 0 && <p className="text-sm text-[#3A4D66] text-center py-4">Aucune notification</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── KYC Page ────────────────────────────────────────────────────────────────

function KycPage({ kycStatus, onSubmit }: { kycStatus: KycStatus; onSubmit: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [docType, setDocType] = useState("cni");
  const [form, setForm] = useState({ nom: "", ddn: "", numDoc: "" });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f.name);
  }, []);

  if (kycStatus === "verified") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Vérification d'identité</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(58,125,92,0.15)" }}>
            <CheckCircle2 size={32} style={{ color: "#3A7D5C" }} />
          </div>
          <div>
            <p className="font-semibold text-[#D4E0F0] text-lg">Identité confirmée</p>
            <p className="text-sm text-[#5C7090] mt-1 max-w-sm mx-auto">Vos documents ont été vérifiés et chiffrés. Aucun autre membre n'y a accès.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (kycStatus === "verifying") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Vérification d'identité</h1>
        <Card className="p-8 text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <svg width={64} height={64} className="animate-spin" style={{ animationDuration: "2s" }}>
              <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(75,127,204,0.15)" strokeWidth={3} />
              <circle cx={32} cy={32} r={26} fill="none" stroke="#4B7FCC" strokeWidth={3}
                strokeDasharray="40 124" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[#D4E0F0]">Vérification en cours…</p>
            <p className="text-sm text-[#5C7090] mt-1">Vos documents sont en cours de traitement. Cela prend quelques secondes.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Vérification d'identité</h1>
        <p className="text-sm text-[#5C7090] mt-1">Requis pour rejoindre un groupe. Vos données sont chiffrées et invisibles des autres membres.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Informations personnelles</h3>
        <Input label="Nom complet" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} placeholder="Prénom Nom" />
        <Input label="Date de naissance" type="date" value={form.ddn} onChange={(v) => setForm({ ...form, ddn: v })} />
        <div className="space-y-1.5">
          <label className="text-xs text-[#5C7090] block">Type de document</label>
          <div className="flex gap-2">
            {[{ v: "cni", l: "Carte d'identité" }, { v: "passeport", l: "Passeport" }, { v: "titre_sejour", l: "Titre de séjour" }].map((opt) => (
              <button key={opt.v} onClick={() => setDocType(opt.v)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: docType === opt.v ? "rgba(75,127,204,0.15)" : "rgba(255,255,255,0.04)", color: docType === opt.v ? "#93B4E8" : "#5C7090", border: `1px solid ${docType === opt.v ? "rgba(75,127,204,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <Input label="Numéro de document" value={form.numDoc} onChange={(v) => setForm({ ...form, numDoc: v })} placeholder="Ex : 1 88 04 75 123 456 78" />
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-[#D4E0F0] mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>Document justificatif</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className="rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
          style={{ border: `2px dashed ${dragging ? "#4B7FCC" : "rgba(255,255,255,0.08)"}`, background: dragging ? "rgba(75,127,204,0.06)" : "rgba(255,255,255,0.02)" }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(75,127,204,0.12)" }}>
            <Upload size={20} style={{ color: "#4B7FCC" }} />
          </div>
          {file
            ? <div className="text-center"><p className="text-sm text-[#3A7D5C] font-medium">{file}</p><p className="text-xs text-[#5C7090] mt-1">Prêt à être chiffré et soumis</p></div>
            : <div className="text-center"><p className="text-sm text-[#8BA4C4] font-medium">Glissez votre document ici</p><p className="text-xs text-[#5C7090] mt-0.5">PDF, JPG, PNG · max 10 Mo</p></div>}
          <label className="px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:brightness-110 transition-all"
            style={{ background: "rgba(75,127,204,0.15)", color: "#93B4E8", border: "1px solid rgba(75,127,204,0.2)" }}>
            Parcourir
            <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0].name); }} />
          </label>
        </div>
      </Card>

      <div className="flex items-start gap-3 px-1">
        <Lock size={14} className="text-[#3A7D5C] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#5C7090] leading-relaxed">Vos données personnelles sont chiffrées côté serveur (AES-256). Aucun autre membre ne peut y accéder. Seule l'équipe de conformité, dans le cadre d'une procédure légale approuvée, peut les consulter.</p>
      </div>

      <Btn onClick={onSubmit} variant="primary" className="w-full" disabled={!form.nom || !file}>
        Soumettre pour vérification <ArrowRight size={15} />
      </Btn>
    </div>
  );
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

function Catalogue({ kycStatus, onJoin }: { kycStatus: KycStatus; onJoin: (id: string) => void }) {
  const kycOk = kycStatus === "verified";
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Groupes d'entraide</h1>
          <p className="text-sm text-[#5C7090] mt-1">Rejoignez un cercle d'affinité et mutualisez vos risques.</p>
        </div>
        <Btn variant="ghost" size="sm"><Plus size={14} /> Créer un groupe</Btn>
      </div>

      {!kycOk && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(232,140,71,0.08)", border: "1px solid rgba(232,140,71,0.18)" }}>
          <AlertTriangle size={16} style={{ color: "#E88C47" }} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#C8A068]">La vérification d'identité est obligatoire pour rejoindre un groupe. <span className="underline cursor-pointer">Complétez votre KYC</span> d'abord.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GROUPS.map((g) => {
          const pct = Math.round((g.memberCount / g.maxMembers) * 100);
          const poolPct = g.poolBalance / g.poolTarget;
          const full = g.memberCount >= g.maxMembers;
          return (
            <Card key={g.id} className="p-5 flex flex-col gap-4 hover:-translate-y-[2px] transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(75,127,204,0.12)" }}>
                  <g.Icon size={18} style={{ color: "#4B7FCC" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#D4E0F0] text-[15px] leading-tight truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>{g.name}</p>
                  <p className="text-xs text-[#5C7090] mt-0.5">{g.specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CircularGaugeInline value={g.poolBalance} max={g.poolTarget} size={80} color="#4B7FCC"
                  centerLabel={`${Math.round(poolPct * 100)}%`} centerSub="cagnotte" />
                <div className="flex-1 space-y-2 text-xs text-[#5C7090]">
                  <div className="flex justify-between"><span>Membres</span><span className="font-mono text-[#8BA4C4]">{g.memberCount}/{g.maxMembers}</span></div>
                  <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? "#C0503A" : "#4B7FCC" }} />
                  </div>
                  <div className="flex justify-between"><span>Cotisation de base</span><span className="font-mono text-[#8BA4C4]">{fmt(g.baseCotisation)}/mois</span></div>
                  <div className="flex justify-between"><span>Cagnotte</span><span className="font-mono text-[#8BA4C4]">{fmt(g.poolBalance)}</span></div>
                </div>
              </div>

              <Btn onClick={() => onJoin(g.id)} variant="primary" disabled={!kycOk || full} className="w-full">
                {full ? "Groupe complet" : "Demander à rejoindre"}
              </Btn>
              {!kycOk && !full && <p className="text-[11px] text-center text-[#3A4D66]">Vérification KYC requise</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

function GroupDetail() {
  const g = GROUPS[0];
  const [claimDesc, setClaimDesc] = useState("");
  const [claimAmt, setClaimAmt] = useState("");
  const [claimFile, setClaimFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const coefficient = 0.82;

  const handleSubmit = () => {
    if (claimDesc.length >= 10 && parseFloat(claimAmt) > 0 && claimFile) setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(75,127,204,0.12)" }}>
          <g.Icon size={18} style={{ color: "#4B7FCC" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>{g.name}</h1>
          <p className="text-sm text-[#5C7090]">{g.specialty} · vous êtes membre_482913 dans ce groupe</p>
        </div>
      </div>

      {/* Pool + members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-medium text-[#D4E0F0] mb-5" style={{ fontFamily: "DM Sans, sans-serif" }}>Cagnotte commune</h3>
          <div className="flex items-center gap-6">
            <CircularGaugeInline value={g.poolBalance} max={g.poolTarget} size={120} color="#4B7FCC"
              centerLabel={fmt(g.poolBalance).replace(" €", "")} centerSub="€ collectés" />
            <div className="space-y-3 text-sm flex-1">
              <div>
                <p className="text-[#5C7090] text-xs">Objectif</p>
                <p className="font-mono font-semibold text-[#D4E0F0]">{fmt(g.poolTarget)}</p>
              </div>
              <div>
                <p className="text-[#5C7090] text-xs">Réserve tampon</p>
                <CircularGaugeInline value={g.poolBalance * 0.15} max={g.poolTarget * 0.15} size={56} color="#3A7D5C"
                  centerLabel={`${Math.round((g.poolBalance * 0.15 / (g.poolTarget * 0.15)) * 100)}%`} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium text-[#D4E0F0] mb-5" style={{ fontFamily: "DM Sans, sans-serif" }}>Membres du cercle</h3>
          <div className="grid grid-cols-4 gap-3">
            {g.memberPseudos.map((p) => (
              <div key={p} className="flex flex-col items-center gap-1.5">
                <PseudoAvatar pseudo={p} size={38} />
                <span className="text-[9px] font-mono text-[#3A4D66] text-center leading-tight">{p.slice(-6)}</span>
              </div>
            ))}
            {Array.from({ length: g.memberCount - g.memberPseudos.length }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-[38px] h-[38px] rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.06)" }} />
                <span className="text-[9px] font-mono text-[#3A4D66]">·····</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bonus-malus */}
      <Card className="p-6">
        <h3 className="font-medium text-[#D4E0F0] mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>Mon coefficient bonus-malus</h3>
        <BonusMalusGauge coefficient={coefficient} />
        <p className="text-xs text-[#5C7090] mt-3">Un coefficient inférieur à 1,00 signifie que vous bénéficiez d'un bonus — vos cotisations sont réduites en proportion.</p>
      </Card>

      {/* Declare claim */}
      <Card className="p-6">
        <h3 className="font-medium text-[#D4E0F0] mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>Déclarer un sinistre</h3>
        {submitted ? (
          <div className="flex items-center gap-3 py-3">
            <CheckCircle2 size={20} style={{ color: "#3A7D5C" }} />
            <div>
              <p className="text-sm font-medium text-[#D4E0F0]">Sinistre soumis avec succès</p>
              <p className="text-xs text-[#5C7090] mt-0.5">L'administrateur du groupe examinera votre déclaration.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#5C7090] block">Description de l'incident <span className="text-[#3A4D66]">(10 caractères min.)</span></label>
              <textarea
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                rows={3}
                placeholder="Décrivez ce qui s'est passé, le lieu, les circonstances…"
                className="w-full px-4 py-3 rounded-xl text-[#D4E0F0] text-sm resize-none outline-none focus:ring-2 focus:ring-[#4B7FCC]/40 transition-all placeholder-[#3A4D66]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif" }}
              />
              {claimDesc.length > 0 && claimDesc.length < 10 && <p className="text-xs text-[#C0503A]">Encore {10 - claimDesc.length} caractères requis</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Montant estimé (€)" type="number" value={claimAmt} onChange={setClaimAmt} placeholder="0,00" />
              <div className="space-y-1.5">
                <label className="text-xs text-[#5C7090] block">Pièce justificative</label>
                <label className="flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Upload size={15} style={{ color: claimFile ? "#3A7D5C" : "#5C7090" }} />
                  <span className="text-sm truncate" style={{ color: claimFile ? "#3A7D5C" : "#5C7090", fontFamily: "Inter, sans-serif" }}>
                    {claimFile ?? "Joindre un fichier"}
                  </span>
                  <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setClaimFile(e.target.files[0].name); }} />
                </label>
              </div>
            </div>
            <Btn onClick={handleSubmit} variant="accent" disabled={claimDesc.length < 10 || !claimAmt || !claimFile}>
              Soumettre la déclaration
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage() {
  const [claims, setClaims] = useState<Claim[]>(CLAIMS_INIT);
  const [adhesions, setAdhesions] = useState<Adhesion[]>(ADHESIONS_INIT);
  const [rejectModal, setRejectModal] = useState<{ id: string; type: "claim" | "adhesion" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [anonModal, setAnonModal] = useState<string | null>(null);
  const [anonJustif, setAnonJustif] = useState("");
  const [anonConfirm, setAnonConfirm] = useState(false);
  const [approveModal, setApproveModal] = useState<Claim | null>(null);
  const [approvedAmt, setApprovedAmt] = useState("");

  const handleApprove = () => {
    if (!approveModal) return;
    setClaims((p) => p.map((c) => c.id === approveModal.id ? { ...c, status: "validee" } : c));
    setApproveModal(null); setApprovedAmt("");
  };
  const handleReject = () => {
    if (!rejectModal || rejectReason.length < 5) return;
    if (rejectModal.type === "claim") setClaims((p) => p.map((c) => c.id === rejectModal.id ? { ...c, status: "rejetee" } : c));
    else setAdhesions((p) => p.map((a) => a.id === rejectModal.id ? { ...a, status: "refusee" } : a));
    setRejectModal(null); setRejectReason("");
  };
  const handleAcceptAdhesion = (id: string) => setAdhesions((p) => p.map((a) => a.id === id ? { ...a, status: "acceptee" } : a));
  const handleAnonRequest = () => {
    if (anonJustif.length >= 10 && anonConfirm) { setAnonModal(null); setAnonJustif(""); setAnonConfirm(false); }
  };

  const aiFraudColor = (s: number) => s < 0.3 ? "#3A7D5C" : s < 0.6 ? "#E88C47" : "#C0503A";
  const aiFraudLabel = (s: number) => s < 0.3 ? "Signal faible" : s < 0.6 ? "Signal modéré" : "Signal élevé";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Administration — Cyclistes du Grand Paris</h1>
        <p className="text-sm text-[#5C7090] mt-1">Vous êtes responsable de ce groupe. Chaque décision vous appartient.</p>
      </div>

      {/* Adhesions */}
      <div className="space-y-3">
        <h2 className="text-base font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Demandes d'adhésion</h2>
        {adhesions.filter((a) => a.status === "en_attente").length === 0 && (
          <Card className="p-4 text-center"><p className="text-sm text-[#3A4D66]">Aucune demande en attente</p></Card>
        )}
        {adhesions.filter((a) => a.status === "en_attente").map((a) => (
          <Card key={a.id} className="p-4 flex items-center gap-4">
            <PseudoAvatar pseudo={a.pseudo} size={36} showLabel />
            <span className="text-xs text-[#5C7090] ml-1">— {a.date}</span>
            <div className="ml-auto flex gap-2">
              <Btn size="sm" variant="ghost" onClick={() => { setRejectModal({ id: a.id, type: "adhesion" }); }}>Refuser</Btn>
              <Btn size="sm" variant="primary" onClick={() => handleAcceptAdhesion(a.id)}>Accepter</Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Claims */}
      <div className="space-y-4">
        <h2 className="text-base font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Sinistres déclarés</h2>
        {claims.map((c) => (
          <Card key={c.id} className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <PseudoAvatar pseudo={c.pseudo} size={36} showLabel />
              <div className="flex-1 min-w-0 ml-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-[#D4E0F0]">{fmt(c.amount)}</span>
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-[#5C7090]">{c.date}</span>
                </div>
                <p className="text-sm text-[#8BA4C4] mt-1.5 leading-relaxed">{c.description}</p>
                <p className="text-xs text-[#4B7FCC] mt-1 flex items-center gap-1"><FileText size={11} /> {c.hdfs_url}</p>
              </div>
            </div>

            {/* AI signal — discrete, not a verdict */}
            <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: aiFraudColor(c.aiScore) }} />
                <span className="text-xs font-medium" style={{ color: aiFraudColor(c.aiScore) }}>Analyse IA · {aiFraudLabel(c.aiScore)}</span>
                <span className="ml-auto font-mono text-xs text-[#5C7090]">indice {Math.round(c.aiScore * 100)}/100</span>
              </div>
              <p className="text-xs text-[#5C7090] leading-relaxed">{c.aiExplanation}</p>
              <p className="text-[11px] text-[#3A4D66] italic">Cette analyse est une aide à la décision — pas un verdict. Vous décidez.</p>
            </div>

            {c.status === "en_attente" && (
              <div className="flex items-center gap-3">
                <Btn size="sm" variant="ghost" onClick={() => { setRejectModal({ id: c.id, type: "claim" }); }}>Rejeter</Btn>
                <Btn size="sm" variant="accent" onClick={() => { setApproveModal(c); setApprovedAmt(String(c.amount)); }}>Valider le remboursement</Btn>
                {c.aiScore >= 0.5 && (
                  <button onClick={() => setAnonModal(c.pseudo)}
                    className="ml-auto text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                    style={{ color: "#C0503A", background: "rgba(192,80,58,0.08)", border: "1px solid rgba(192,80,58,0.18)" }}>
                    <Unlock size={12} /> Demander levée d'anonymat
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setRejectModal(null)}>
          <Card className="w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[#D4E0F0]">Motif du rejet</h3>
              <button onClick={() => setRejectModal(null)}><X size={16} className="text-[#5C7090]" /></button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#5C7090] block">Explication <span className="text-[#3A4D66]">(5 caractères min.)</span></label>
              <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez clairement le motif du rejet…"
                className="w-full px-4 py-3 rounded-xl text-[#D4E0F0] text-sm resize-none outline-none focus:ring-2 focus:ring-[#4B7FCC]/40 placeholder-[#3A4D66]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif" }} />
            </div>
            <Btn onClick={handleReject} variant="danger" disabled={rejectReason.length < 5} className="w-full">Confirmer le rejet</Btn>
          </Card>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setApproveModal(null)}>
          <Card className="w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[#D4E0F0]">Valider le remboursement</h3>
              <button onClick={() => setApproveModal(null)}><X size={16} className="text-[#5C7090]" /></button>
            </div>
            <Input label="Montant approuvé (€)" type="number" value={approvedAmt} onChange={setApprovedAmt} />
            <Btn onClick={handleApprove} variant="accent" className="w-full">Confirmer le remboursement de {fmt(parseFloat(approvedAmt) || 0)}</Btn>
          </Card>
        </div>
      )}

      {/* Anonymat Modal — friction volontaire */}
      {anonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => { setAnonModal(null); setAnonJustif(""); setAnonConfirm(false); }}>
          <Card className="w-full max-w-md p-6 space-y-5" style={{ border: "1px solid rgba(192,80,58,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(192,80,58,0.12)" }}>
                <Unlock size={18} style={{ color: "#C0503A" }} />
              </div>
              <div>
                <h3 className="font-semibold text-[#D4E0F0]">Levée d'anonymat</h3>
                <p className="text-xs text-[#5C7090]">Action grave et tracée · {anonModal}</p>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 text-sm text-[#C8A068] leading-relaxed" style={{ background: "rgba(192,80,58,0.07)", border: "1px solid rgba(192,80,58,0.15)" }}>
              Cette demande sera soumise à l'équipe de conformité pour approbation. Elle sera consignée dans le journal d'audit et ne peut pas être annulée.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#5C7090] block">Justification légale obligatoire</label>
              <textarea rows={3} value={anonJustif} onChange={(e) => setAnonJustif(e.target.value)}
                placeholder="Décrivez les faits précis justifiant cette demande d'identification…"
                className="w-full px-4 py-3 rounded-xl text-[#D4E0F0] text-sm resize-none outline-none focus:ring-2 focus:ring-[#C0503A]/30 placeholder-[#3A4D66]"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "Inter, sans-serif" }} />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: anonConfirm ? "rgba(192,80,58,0.25)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${anonConfirm ? "#C0503A" : "rgba(255,255,255,0.12)"}` }}
                onClick={() => setAnonConfirm(!anonConfirm)}>
                {anonConfirm && <CheckCircle2 size={10} style={{ color: "#C0503A" }} />}
              </div>
              <span className="text-xs text-[#8BA4C4] leading-relaxed">Je comprends que cette action est définitive, tracée, et soumise à approbation par l'équipe de conformité.</span>
            </label>
            <Btn onClick={handleAnonRequest} variant="danger" disabled={anonJustif.length < 10 || !anonConfirm} className="w-full">
              Soumettre la demande de levée d'anonymat
            </Btn>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Conformité Page ──────────────────────────────────────────────────────────

function ConformitePage() {
  const [anonReqs, setAnonReqs] = useState<AnonymityReq[]>(ANON_REQS_INIT);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "kyc" | "claim" | "adhesion" | "anonymat">("all");

  const handleApprove = (id: string) => {
    setAnonReqs((p) => p.map((r) => r.id === id ? { ...r, statut: "approuvee" } : r));
    setRevealed(id);
  };

  const logs = AUDIT_LOGS.filter((l) => filter === "all" || l.type === filter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Espace conformité</h1>
        <p className="text-sm text-[#5C7090] mt-1">Accès restreint — toutes les actions sont journalisées.</p>
      </div>

      {/* Anonymity requests */}
      <div className="space-y-3">
        <h2 className="text-base font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Demandes de levée d'anonymat</h2>
        {anonReqs.map((r) => {
          const isRevealed = revealed === r.id && r.statut === "approuvee";
          return (
            <div key={r.id}>
              <Card className="p-5 space-y-4" style={isRevealed ? { border: "1px solid rgba(232,140,71,0.3)" } : {}}>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(192,80,58,0.12)" }}>
                    <Unlock size={16} style={{ color: "#C0503A" }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm text-[#D4E0F0]">{r.pseudo}</span>
                      <span className="text-xs text-[#5C7090]">via {r.groupName}</span>
                      <StatusBadge status={r.statut} />
                    </div>
                    <p className="text-xs text-[#5C7090] mt-0.5">Demandé par {r.requestedBy}</p>
                    <p className="text-sm text-[#8BA4C4] mt-2 leading-relaxed">{r.justification_legale}</p>
                  </div>
                </div>

                {/* Révélation — moment visuellement exceptionnel */}
                {isRevealed && (
                  <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(232,140,71,0.06)", border: "1.5px solid rgba(232,140,71,0.25)" }}>
                    <div className="flex items-center gap-2">
                      <Unlock size={14} style={{ color: "#E88C47" }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#E88C47" }}>Identité réelle dévoilée — accès exceptionnel</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] text-[#5C7090] mb-1">Nom complet</p>
                        <p className="font-semibold text-[#D4E0F0]">{r.realName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#5C7090] mb-1">Document d'identité</p>
                        <p className="font-mono font-semibold text-[#D4E0F0]">{r.realDoc}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#E88C47] leading-relaxed">Cet accès est enregistré dans le journal d'audit avec horodatage. Les données disparaîtront à la fermeture de cette session.</p>
                  </div>
                )}

                {r.statut === "en_attente" && (
                  <div className="flex gap-2">
                    <Btn size="sm" variant="ghost">Refuser</Btn>
                    <Btn size="sm" variant="accent" onClick={() => handleApprove(r.id)}>
                      <Unlock size={13} /> Approuver et révéler l'identité
                    </Btn>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Audit log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium text-[#D4E0F0]" style={{ fontFamily: "DM Sans, sans-serif" }}>Journal d'audit</h2>
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "kyc", "claim", "adhesion", "anonymat"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: filter === f ? "rgba(75,127,204,0.15)" : "rgba(255,255,255,0.04)", color: filter === f ? "#93B4E8" : "#5C7090", border: `1px solid ${filter === f ? "rgba(75,127,204,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                {f === "all" ? "Tout" : f}
              </button>
            ))}
          </div>
        </div>
        <Card>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {logs.map((log) => {
              const typeColor = { kyc: "#4B7FCC", claim: "#E88C47", adhesion: "#3A7D5C", anonymat: "#C0503A" };
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: typeColor[log.type] }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#B8D0F0]">{log.action}</span>
                    <span className="text-xs text-[#5C7090] mx-2">·</span>
                    <span className="text-xs font-mono text-[#5C7090]">{log.target}</span>
                  </div>
                  <span className="text-xs text-[#3A4D66] font-mono whitespace-nowrap">{log.date}</span>
                  <span className="text-xs text-[#3A4D66]">par {log.actor}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [role, setRole] = useState<Role>("membre");
  const [kycStatus, setKycStatus] = useState<KycStatus>("pending");
  const [cotisations, setCotisations] = useState<Cotisation[]>(COTISATIONS_INIT);
  const [notifs, setNotifs] = useState<Notif[]>(NOTIFS_INIT);

  const submitKyc = () => {
    setKycStatus("verifying");
    setTimeout(() => setKycStatus("verified"), 5000);
  };

  const handleRoleChange = (r: Role) => {
    setRole(r);
    if (r === "equipe_conformite") setPage("conformite");
    else if (r === "admin_groupe") setPage("admin");
    else setPage("dashboard");
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  if (!authed) return <AuthPage onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen" style={{ background: "#0D1117", fontFamily: "Inter, sans-serif" }}>
      <Sidebar page={page} role={role} onNav={setPage} notifCount={unreadCount} />

      {/* Header */}
      <header className="fixed top-0 right-0 h-14 flex items-center px-6 gap-4 z-20"
        style={{ left: 240, background: "rgba(13,17,23,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Role switcher */}
        <div className="flex gap-1.5 ml-auto">
          <span className="text-xs text-[#3A4D66] self-center mr-1">Rôle démo :</span>
          {(["membre", "admin_groupe", "equipe_conformite"] as Role[]).map((r) => (
            <button key={r} onClick={() => handleRoleChange(r)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ background: role === r ? "rgba(75,127,204,0.15)" : "rgba(255,255,255,0.04)", color: role === r ? "#93B4E8" : "#5C7090", border: `1px solid ${role === r ? "rgba(75,127,204,0.2)" : "rgba(255,255,255,0.05)"}` }}>
              {r === "membre" ? "Membre" : r === "admin_groupe" ? "Admin" : "Conformité"}
            </button>
          ))}
        </div>
        <button onClick={() => setPage("dashboard")} className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all">
          <Bell size={16} className="text-[#5C7090]" />
          {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C0503A]" />}
        </button>
      </header>

      <main className="min-h-screen pt-14" style={{ marginLeft: 240 }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {page === "dashboard" && <Dashboard kycStatus={kycStatus} cotisations={cotisations} setCotisations={setCotisations} notifs={notifs} setNotifs={setNotifs} />}
          {page === "kyc" && <KycPage kycStatus={kycStatus} onSubmit={submitKyc} />}
          {page === "catalogue" && <Catalogue kycStatus={kycStatus} onJoin={() => setPage("group-detail")} />}
          {page === "group-detail" && <GroupDetail />}
          {page === "admin" && <AdminPage />}
          {page === "conformite" && <ConformitePage />}
        </div>
      </main>
    </div>
  );
}
