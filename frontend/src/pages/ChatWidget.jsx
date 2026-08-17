import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Génère un ID de session unique par onglet
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const WELCOME_MESSAGES = {
  fr: "Bonjour ! Je suis le Copilote TrustPool 🤝\nComment puis-je vous aider aujourd'hui ?",
  ar: "مرحباً! أنا مساعد TrustPool 🤝\nكيف يمكنني مساعدتك اليوم؟",
};

const PLACEHOLDER = {
  fr: "Posez votre question en français ou en arabe...",
  ar: "اطرح سؤالك بالعربية أو بالفرنسية...",
};

function detectLang(text) {
  if (!text) return 'fr';
  const arabic = Array.from(text).filter(c => c >= '\u0600' && c <= '\u06FF').length;
  return arabic / text.length > 0.15 ? 'ar' : 'fr';
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGES.fr, lang: 'fr' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uiLang, setUiLang] = useState('fr');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const lang = detectLang(text);
    setUiLang(lang);
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, lang }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(
        `${API}/ai/copilote/chat`,
        { message: text, session_id: SESSION_ID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        lang: data.langue_reponse,
        sources: data.sources || [],
      }]);
    } catch (err) {
      const lang2 = uiLang;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang2 === 'ar'
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Désolé, une erreur est survenue. Réessayez.',
        lang: lang2,
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, uiLang]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isRtl = uiLang === 'ar';

  return (
    <>
      {/* Bouton flottant */}
      <button
        id="chat-widget-toggle"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          height: 58, borderRadius: 29, padding: open ? '0' : '0 24px',
          width: open ? 58 : 'auto',
          background: 'linear-gradient(135deg, #2962ff, #448aff)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(41,98,255,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 26, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          color: '#fff', fontWeight: 600, fontFamily: 'inherit',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
        title="Copilote TrustPool"
      >
        {open ? '✕' : (
          <>
            <span style={{ fontSize: 24, lineHeight: 1 }}>🤝</span>
            <span style={{ fontSize: 15 }}>{isRtl ? 'المساعد الذكي' : 'Votre assistant'}</span>
          </>
        )}
      </button>

      {/* Fenêtre de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 98, right: 28, zIndex: 9998,
          width: 380, maxHeight: '72vh',
          display: 'flex', flexDirection: 'column',
          background: '#0f1117',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          boxShadow: '0 16px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #2962ff, #448aff)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>🤝</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                Copilote TrustPool
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                {isRtl ? 'مساعد ذكي · متاح الآن' : 'Assistant IA · En ligne'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#4cef7a' }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const rtl = msg.lang === 'ar';
              return (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  direction: rtl ? 'rtl' : 'ltr',
                }}>
                  {!isUser && (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#2962ff,#448aff)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0, marginRight: rtl ? 0 : 8, marginLeft: rtl ? 8 : 0,
                    }}>🤝</div>
                  )}
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: isUser
                      ? (rtl ? '18px 4px 18px 18px' : '18px 18px 4px 18px')
                      : (rtl ? '4px 18px 18px 18px' : '18px 18px 18px 4px'),
                    background: isUser
                      ? 'linear-gradient(135deg,#2962ff,#448aff)'
                      : (msg.error ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'),
                    color: '#e8eaf6',
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    textAlign: rtl ? 'right' : 'left',
                    border: msg.error ? '1px solid rgba(239,68,68,0.3)' : 'none',
                  }}>
                    {msg.content}
                    {/* Sources */}
                    {msg.sources?.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                          {rtl ? '📚 المصادر' : '📚 Sources'}
                        </div>
                        {msg.sources.slice(0, 2).map((s, si) => (
                          <div key={si} style={{
                            fontSize: 11, color: '#7986cb',
                            padding: '2px 0',
                          }}>
                            · {s.titre || s.collection}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2962ff,#448aff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🤝</div>
                <div style={{
                  padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.06)', display: 'flex', gap: 5,
                }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#448aff',
                      animation: `bounce 1.2s ${d * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8,
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={PLACEHOLDER[isRtl ? 'ar' : 'fr']}
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '10px 14px',
                color: '#e8eaf6', fontSize: 14,
                resize: 'none', outline: 'none',
                fontFamily: isRtl ? 'Noto Sans Arabic, Arial, sans-serif' : 'inherit',
                direction: isRtl ? 'rtl' : 'ltr',
                textAlign: isRtl ? 'right' : 'left',
              }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: loading || !input.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg,#2962ff,#448aff)',
                border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {isRtl ? '←' : '→'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
