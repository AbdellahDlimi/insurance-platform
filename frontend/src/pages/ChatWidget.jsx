import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  Shield,
  HelpCircle,
  FileText,
  Calculator,
  Flame
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Génère un ID de session unique
const getSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const QUICK_PROMPTS = [
  { fr: "Comment déclarer un sinistre ?", ar: "كيف أصرح عن حادث؟", icon: Flame },
  { fr: "Calcul de ma cotisation ?", ar: "كيف يتم حساب اشتراكي؟", icon: Calculator },
  { fr: "Qu'est-ce que le buffer pool ?", ar: "ما هو صندوق الأمان (Buffer Pool)؟", icon: Shield },
  { fr: "Conditions d'adhésion & KYC", ar: "شروط الانضمام والتحقق (KYC)", icon: FileText },
];

const WELCOME_MESSAGES = {
  fr: "Bonjour ! Je suis le **Copilote TrustPool** 🛡️\nComment puis-je vous accompagner aujourd'hui dans la gestion de vos groupes et sinistres ?",
  ar: "مرحباً بكم! أنا **مساعد TrustPool الذكي** 🛡️\nكيف يمكنني مساعدتكم اليوم في إدارة مجموعاتكم ومطالباتكم؟",
};

const PLACEHOLDERS = {
  fr: "Posez votre question (français, arabe, anglais)...",
  ar: "اطرح سؤالك هنا (بالعربية، الفرنسية...)...",
};

function detectLang(text) {
  if (!text) return 'fr';
  const arabic = Array.from(text).filter(c => c >= '\u0600' && c <= '\u06FF').length;
  return arabic / text.length > 0.15 ? 'ar' : 'fr';
}

// Logo officiel TP Shield
const TPShieldLogo = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 40 46" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M20 1L2 7V20C2 31.8 9.7 42.6 20 45C30.3 42.6 38 31.8 38 20V7L20 1Z" 
      fill="#141414" 
      stroke="#C8A96E" 
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path 
      d="M13 14H27M20 14V32M20 20H26C28.2 20 28.2 26 26 26H20" 
      stroke="#DFBA73" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Rendu Markdown riche & structuré
function RichMarkdown({ content, onCitationClick }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-[#F0EDE6]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Titre niveau 3 (###)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 
              key={idx} 
              className="text-sm font-semibold text-[#DFBA73] pt-2 pb-1 border-b border-[#C8A96E]/20 flex items-center gap-1.5"
            >
              <span>◈</span>
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        // Titre niveau 2 (##)
        if (trimmed.startsWith('## ')) {
          return (
            <h3 
              key={idx} 
              className="text-[15px] font-bold text-[#E8C88A] pt-3 pb-1 border-b border-[#C8A96E]/30"
            >
              {trimmed.replace('## ', '')}
            </h3>
          );
        }

        // Liste à puces (* ou -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-1">
              <span className="text-[#C8A96E] text-xs mt-1 select-none">◆</span>
              <div className="flex-1">{renderInlineFormatting(itemText, onCitationClick)}</div>
            </div>
          );
        }

        // Liste numérotée (ex: 1. , 2. )
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#C8A96E]/20 text-[#DFBA73] text-[10px] font-bold mt-0.5 select-none">
                {numMatch[1]}
              </span>
              <div className="flex-1">{renderInlineFormatting(numMatch[2], onCitationClick)}</div>
            </div>
          );
        }

        // Paragraphe normal
        return (
          <p key={idx} className="my-1">
            {renderInlineFormatting(trimmed, onCitationClick)}
          </p>
        );
      })}
    </div>
  );
}

// Mise en forme inline (Gras, italique, badges [1], etc.)
function renderInlineFormatting(text, onCitationClick) {
  // Découpage pour identifier les gras **texte** et citations [1], [2]
  const regex = /(\*\*[^*]+\*\*|\[\d+(?:,\s*\d+)*\])/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Badge de citation [1] ou [1, 2]
    if (/^\[\d+(?:,\s*\d+)*\]$/.test(part)) {
      return (
        <button
          key={i}
          onClick={() => onCitationClick && onCitationClick(part)}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium bg-[#C8A96E]/15 text-[#DFBA73] border border-[#C8A96E]/30 hover:bg-[#C8A96E]/30 transition-all cursor-pointer select-none"
          title="Source documentaire vérifiée"
        >
          {part}
        </button>
      );
    }

    return part;
  });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(getSessionId());
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGES.fr, lang: 'fr', id: 'welcome' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uiLang, setUiLang] = useState('fr');
  const [copiedId, setCopiedId] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, messages, loading]);

  const resetChat = () => {
    const newSession = getSessionId();
    setSessionId(newSession);
    setMessages([
      { role: 'assistant', content: WELCOME_MESSAGES[uiLang] || WELCOME_MESSAGES.fr, lang: uiLang, id: 'welcome_' + newSession }
    ]);
  };

  const copyMessage = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = useCallback(async (customText) => {
    const text = (customText || input).trim();
    if (!text || loading) return;

    const lang = detectLang(text);
    setUiLang(lang);
    if (!customText) setInput('');

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `asst_${Date.now()}`;

    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text, lang }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(
        `${API}/ai/copilote/chat`,
        { message: text, session_id: sessionId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: data.message,
        lang: data.langue_reponse || lang,
        sources: data.sources || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: lang === 'ar'
          ? "عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى."
          : "Désolé, une erreur est survenue lors du traitement. Veuillez réessayer.",
        lang: lang,
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isRtl = uiLang === 'ar';

  return (
    <>
      {/* ── Bouton flottant (Launcher) ─────────────────────────────── */}
      <button
        id="chat-widget-toggle"
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl ${
          open 
            ? 'w-14 h-14 rounded-full bg-[#161618] border border-[#C8A96E]/50 text-[#DFBA73] hover:bg-[#1E1E22]' 
            : 'h-14 px-5 rounded-full bg-gradient-to-r from-[#141416] via-[#1A1A1E] to-[#141416] border border-[#C8A96E]/60 text-[#F0EDE6] hover:border-[#C8A96E] hover:shadow-[0_0_25px_rgba(200,169,110,0.35)] hover:-translate-y-0.5'
        }`}
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        title="Copilote TrustPool"
      >
        {open ? (
          <X size={22} className="text-[#DFBA73] transition-transform duration-200 rotate-0 hover:rotate-90" />
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <TPShieldLogo size={26} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C8A96E] animate-pulse ring-2 ring-[#0C0C0C]" />
            </div>
            <div className="text-left font-serif">
              <div className="text-xs font-semibold tracking-wide text-[#DFBA73] uppercase leading-none">
                TrustPool
              </div>
              <div className="text-[13px] font-sans font-medium text-[#F0EDE6] mt-0.5">
                {isRtl ? 'المساعد الذكي' : 'Copilote IA'}
              </div>
            </div>
          </>
        )}
      </button>

      {/* ── Fenêtre de Chat Principale ───────────────────────────────── */}
      {open && (
        <div 
          className="fixed bottom-24 right-6 z-[9998] w-[420px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-120px)] flex flex-col rounded-2xl overflow-hidden border border-[#C8A96E]/30 bg-[#0C0C0C]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ direction: isRtl ? 'rtl' : 'ltr' }}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="px-5 py-4 bg-gradient-to-b from-[#18181C] to-[#121214] border-b border-[#C8A96E]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-[#0C0C0C] border border-[#C8A96E]/30 shadow-inner">
                <TPShieldLogo size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-[15px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F0EDE6] to-[#DFBA73]">
                    TrustPool Copilote
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#C8A96E]/20 text-[#DFBA73] border border-[#C8A96E]/40">
                    RAG
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#A08048] mt-0.5 font-sans">
                  <span className="w-2 h-2 rounded-full bg-[#C8A96E] animate-pulse" />
                  <span>{isRtl ? 'مساعد ذكي · متصل' : 'Assistant IA · En ligne'}</span>
                </div>
              </div>
            </div>

            {/* Actions Header */}
            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                className="p-2 rounded-lg text-[#F0EDE6]/60 hover:text-[#DFBA73] hover:bg-[#C8A96E]/10 transition-colors"
                title="Nouvelle conversation"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-[#F0EDE6]/60 hover:text-[#DFBA73] hover:bg-[#C8A96E]/10 transition-colors"
                title="Réduire"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* ── Corps des Messages ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#C8A96E]/20 scrollbar-track-transparent">
            {/* Quick Prompts (si 1 seul message) */}
            {messages.length <= 1 && (
              <div className="mb-2 p-3 rounded-xl bg-[#141416]/80 border border-[#C8A96E]/15 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A08048] flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#C8A96E]" />
                  <span>{isRtl ? 'أسئلة مقترحة' : 'Suggestions rapides'}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_PROMPTS.map((p, idx) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSend(isRtl ? p.ar : p.fr)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-[#F0EDE6] bg-[#0C0C0C]/60 hover:bg-[#C8A96E]/15 border border-[#C8A96E]/20 hover:border-[#C8A96E]/50 transition-all flex items-center gap-2 group"
                        style={{ textAlign: isRtl ? 'right' : 'left' }}
                      >
                        <Icon size={14} className="text-[#C8A96E] shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="flex-1">{isRtl ? p.ar : p.fr}</span>
                        <span className="text-[#C8A96E]/40 group-hover:text-[#C8A96E] text-[10px]">→</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liste des bulles de messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isArabic = msg.lang === 'ar';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  style={{ direction: isArabic ? 'rtl' : 'ltr' }}
                >
                  {/* Avatar Copilote */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#16161A] border border-[#C8A96E]/40 flex items-center justify-center shrink-0 mt-1 shadow-md">
                      <TPShieldLogo size={16} />
                    </div>
                  )}

                  {/* Contenu de la bulle */}
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-all ${
                      isUser
                        ? 'bg-gradient-to-br from-[#242018] via-[#1E1B14] to-[#181610] text-[#F0EDE6] border border-[#C8A96E]/40 rounded-br-none'
                        : msg.error
                        ? 'bg-red-950/40 text-red-200 border border-red-800/40 rounded-bl-none'
                        : 'bg-[#141416] text-[#F0EDE6] border border-white/10 rounded-bl-none shadow-black/40'
                    }`}
                  >
                    {/* Header bulle IA */}
                    {!isUser && (
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 text-[11px] text-[#A08048]">
                        <span className="font-semibold flex items-center gap-1">
                          <span>TrustPool Copilote</span>
                        </span>
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          className="p-1 hover:text-[#DFBA73] transition-colors rounded"
                          title="Copier la réponse"
                        >
                          {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}

                    {/* Texte du message avec rendu Markdown */}
                    <div style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {isUser ? (
                        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <RichMarkdown content={msg.content} />
                      )}
                    </div>

                    {/* Citations de Sources documentaires */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#C8A96E]/15">
                        <div className="text-[10.5px] font-semibold tracking-wider text-[#A08048] uppercase mb-1.5 flex items-center gap-1">
                          <FileText size={11} className="text-[#C8A96E]" />
                          <span>{isArabic ? 'المصادر المعتمدة' : 'Sources documentaires'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.slice(0, 3).map((s, si) => (
                            <span
                              key={si}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#0C0C0C] text-[#DFBA73] border border-[#C8A96E]/30"
                            >
                              <span>📄</span>
                              <span className="truncate max-w-[200px]">{s.titre || s.collection}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Indicateur de chargement / Thinking state */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#16161A] border border-[#C8A96E]/40 flex items-center justify-center shrink-0 mt-1">
                  <TPShieldLogo size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-[#141416] border border-[#C8A96E]/25 flex items-center gap-2">
                  <span className="text-xs text-[#DFBA73] font-medium">Recherche & synthèse</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E] animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Zone de Saisie (Footer) ──────────────────────────────── */}
          <div className="p-3.5 bg-gradient-to-t from-[#141416] via-[#101012] to-transparent border-t border-[#C8A96E]/20">
            <div className="relative flex items-center gap-2 bg-[#0C0C0C] rounded-xl border border-[#C8A96E]/30 focus-within:border-[#C8A96E] focus-within:ring-1 focus-within:ring-[#C8A96E]/40 transition-all p-1.5 shadow-inner">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={PLACEHOLDERS[isRtl ? 'ar' : 'fr']}
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-[13.5px] text-[#F0EDE6] placeholder-[#A08048]/60 px-3 py-2 resize-none outline-none max-h-24 overflow-y-auto"
                style={{
                  direction: isRtl ? 'rtl' : 'ltr',
                  textAlign: isRtl ? 'right' : 'left',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className={`p-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center shrink-0 ${
                  loading || !input.trim()
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-[#DFBA73] to-[#C8A96E] text-[#0C0C0C] font-semibold hover:shadow-[0_0_15px_rgba(200,169,110,0.5)] active:scale-95 cursor-pointer shadow-md'
                }`}
                title="Envoyer"
              >
                <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[10.5px] text-[#A08048]/70 select-none">
              <span>TrustPool AI RAG Engine</span>
              <span>Gemini 3.1 Flash</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
