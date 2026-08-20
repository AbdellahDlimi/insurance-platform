import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, LogOut, CheckCheck, Shield, Users, Wallet, AlertTriangle, UserCheck, Eye, Lock, Sparkles } from 'lucide-react';
import { Btn } from './ui.jsx';
import { api } from './api.js';

/* ── Notification type config ── */
const NOTIF_CONFIG = {
  welcome:       { icon: Sparkles, color: '#c8a96e', label: 'Bienvenue',    route: '/dashboard' },
  kyc:           { icon: Shield,   color: '#7FC9A0', label: 'KYC',          route: '/kyc' },
  kyc_approved:  { icon: Shield,   color: '#7FC9A0', label: 'KYC',          route: '/dashboard' },
  kyc_rejected:  { icon: Shield,   color: '#E08888', label: 'KYC',          route: '/kyc' },
  adhesion:      { icon: Users,    color: '#8BB8E8', label: 'Adhésion',     route: '/groups' },
  cotisation:    { icon: Wallet,   color: '#c8a96e', label: 'Cotisation',   route: '/groups' },
  sinistre:      { icon: AlertTriangle, color: '#E08888', label: 'Sinistre', route: '/claims' },
  fraude:        { icon: Eye,      color: '#E08888', label: 'Fraude',       route: '/dashboard' },
  anonymat:      { icon: Lock,     color: '#8BB8E8', label: 'Anonymat',     route: '/dashboard' },
  compliance_alert: { icon: Shield, color: '#c8a96e', label: 'Conformité', route: '/groups' },
};
const DEFAULT_CONFIG = { icon: Bell, color: 'var(--paper-dim)', label: 'Notification', route: '/dashboard' };


/* ── Relative time helper ── */
const timeAgo = (dateStr) => {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

export const Navbar = ({ currentPath, navigate, user, logout }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Fetch unread count + polling every 30s */
  const fetchUnread = useCallback(() => {
    if (user) {
      api.getNotifications(true)
        .then(res => setUnreadCount(res.length))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch (e) {
        console.error('Error fetching notifications:', e);
      }
    }
    setShowNotifications(!showNotifications);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, lu: true })));
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.lu) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, lu: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {}
    }
    const cfg = NOTIF_CONFIG[notif.type] || DEFAULT_CONFIG;
    setShowNotifications(false);
    navigate(cfg.route);
  };

  const [avatarStr, setAvatarStr] = useState(null);

  useEffect(() => {
    const loadProfile = () => {
      if (user?.id) {
        const saved = localStorage.getItem(`trustpool_profile_${user.id}`);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            setAvatarStr(data.avatarBase64);
          } catch (e) {}
        }
      }
    };
    loadProfile();
    window.addEventListener('profile_updated', loadProfile);
    return () => window.removeEventListener('profile_updated', loadProfile);
  }, [user]);

  const navLinks = user
    ? user.role === 'admin_plateforme'
      ? [
          { name: 'Dashboard Admin', path: '/admin/dashboard' },
          { name: 'Vérifications KYC', path: '/admin/kyc' },
        ]
      : [
          { name: 'Dashboard', path: '/dashboard' },
          { name: 'Groupes',   path: '/groups' },
          { name: 'Sinistres', path: '/claims' },
        ]
    : [
        { name: 'Comment ça marche', path: '/how-it-works' },
        { name: 'Fonctionnalités',   path: '/features' },
      ];

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container-editorial" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <video
            autoPlay muted loop playsInline
            style={{ height: '2.5rem', width: 'auto', objectFit: 'contain', borderRadius: '4px' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          >
            <source src="/logo.mp4" type="video/mp4" />
          </video>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--paper)', letterSpacing: '-0.02em', display: 'none' }}>
            Trust<span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Pool</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden-mobile">
          {navLinks.map(link => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.5rem 1rem', fontSize: '0.8125rem', letterSpacing: '0.04em',
                color: currentPath === link.path ? 'var(--gold)' : 'var(--paper-dim)',
                borderBottom: currentPath === link.path ? '1px solid var(--gold)' : '1px solid transparent',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="hidden-mobile">
          {user ? (
            <>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button 
                  onClick={toggleNotifications}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-dim)', position: 'relative' }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 ? (
                    <motion.span
                      key={unreadCount}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      style={{
                        position: 'absolute', top: -4, right: -6,
                        minWidth: 16, height: 16, borderRadius: '999px',
                        background: 'var(--gold)', color: 'var(--ink)',
                        fontSize: '0.5625rem', fontWeight: 700, lineHeight: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  ) : (
                    <span style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'transparent' }} />
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: 360,
                        background: '#121418', border: '1px solid var(--gold-line)', borderRadius: 12,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.9)', zIndex: 99999, overflow: 'hidden',
                        backdropFilter: 'blur(20px)',
                      }}
                    >
                      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--gold-line)', background: '#17191e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--paper)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={handleMarkAllRead}
                            style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}
                          >
                            <CheckCheck size={14} /> Tout lire
                          </button>
                        )}
                      </div>
                      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', background: '#121418' }}>
                        {notifications.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--paper-dim)' }}>
                            <Bell size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.2, display: 'block' }} />
                            <p style={{ fontSize: '0.875rem' }}>Aucune notification pour le moment.</p>
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const cfg = NOTIF_CONFIG[n.type] || DEFAULT_CONFIG;
                            const Icon = cfg.icon;
                            return (
                              <div
                                key={n.id}
                                onClick={() => handleNotifClick(n)}
                                style={{
                                  padding: '0.875rem 1rem', borderRadius: 8, cursor: 'pointer',
                                  background: n.lu ? 'rgba(255,255,255,0.02)' : 'rgba(200,169,110,0.1)',
                                  border: `1px solid ${n.lu ? 'rgba(240,237,230,0.06)' : 'rgba(200,169,110,0.25)'}`,
                                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                                  transition: 'all 0.15s ease-in-out',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,169,110,0.16)'}
                                onMouseLeave={e => e.currentTarget.style.background = n.lu ? 'rgba(255,255,255,0.02)' : 'rgba(200,169,110,0.1)'}
                              >
                                <div style={{
                                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                  background: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  marginTop: '0.1rem', border: `1px solid ${cfg.color}40`
                                }}>
                                  <Icon size={15} color={cfg.color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: cfg.color, fontWeight: 700 }}>
                                      {cfg.label}
                                    </span>
                                    {!n.lu && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.8125rem', color: n.lu ? 'var(--paper-dim)' : 'var(--paper)', fontWeight: n.lu ? 400 : 500, lineHeight: 1.45 }}>
                                    {n.contenu}
                                  </p>
                                  <span style={{ fontSize: '0.6875rem', color: 'rgba(240,237,230,0.35)', marginTop: '0.375rem', display: 'block' }}>
                                    {timeAgo(n.created_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ width: 1, height: 24, background: 'var(--gold-line)' }} />
              <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--slate), var(--gold-dim))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--paper)',
                  overflow: 'hidden', border: '1px solid var(--gold-line)',
                }}>
                  {avatarStr ? (
                    <img src={avatarStr} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.pseudonyme?.charAt(0).toUpperCase()
                  )}
                </div>
              </button>
              <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-dim)' }}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => navigate('/login')}>Connexion</Btn>
              <Btn variant="primary" onClick={() => navigate('/register')}>Rejoindre</Btn>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="show-mobile"
          onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-dim)' }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', background: 'rgba(12,12,12,0.97)', borderBottom: '1px solid var(--gold-line)', backdropFilter: 'blur(24px)' }}
          >
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {navLinks.map(link => (
                <button
                  key={link.name}
                  onClick={() => { navigate(link.path); setOpen(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '1.125rem', fontFamily: 'var(--font-display)', color: 'var(--paper)' }}
                >
                  {link.name}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--gold-line)', margin: '0.5rem 0' }} />
              {user
                ? <Btn variant="danger" onClick={() => { logout(); setOpen(false); }}>Déconnexion</Btn>
                : <>
                    <Btn variant="secondary" onClick={() => { navigate('/login'); setOpen(false); }}>Connexion</Btn>
                    <Btn variant="primary" onClick={() => { navigate('/register'); setOpen(false); }}>Rejoindre</Btn>
                  </>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
        @media (min-width: 769px) { .show-mobile   { display: none !important; } }
      `}</style>
    </header>
  );
};

export const Footer = ({ navigate }) => (
  <footer style={{ borderTop: '1px solid var(--gold-line)', marginTop: '6rem', paddingBlock: '3rem' }}>
    <div className="container-editorial" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
      <div style={{ gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/logo.png" alt="TrustPool" style={{ height: '1.75rem', width: 'auto', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
          />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--paper)', display: 'none' }}>Trust<em style={{ color: 'var(--gold)' }}>Pool</em></span>
        </div>
        <p className="text-caption" style={{ maxWidth: '26ch' }}>
          TrustPool — la première plateforme d'assurance collaborative propulsée par l'IA.
        </p>
      </div>
      {[
        { title: 'Plateforme', links: [{ label: 'Comment ça marche', path: '/how-it-works' }, { label: 'Les Groupes', path: '/groups' }] },
        { title: 'Légal',      links: [{ label: 'Mentions Légales', path: '#' }, { label: 'Confidentialité', path: '#' }] },
        { title: 'Équipe',     links: [{ label: 'Espace Conformité', path: '/login?role=admin' }] }
      ].map(col => (
        <div key={col.title}>
          <p className="text-label" style={{ marginBottom: '1rem' }}>{col.title}</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {col.links.map(l => (
              <li key={l.label} className="text-caption" style={{ cursor: 'pointer' }} onClick={() => navigate(l.path)}>{l.label}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </footer>
);
