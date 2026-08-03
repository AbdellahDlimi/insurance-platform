import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, LogOut } from 'lucide-react';
import { Btn } from './ui.jsx';

export const Navbar = ({ currentPath, navigate, user, logout, pendingCount = 0 }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

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
    ? [
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
          <img
            src="/logo.png"
            alt="TrustPool"
            style={{ height: '2rem', width: 'auto', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
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
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paper-dim)', position: 'relative' }}>
                <Bell size={18} />
                {pendingCount > 0 ? (
                  <motion.span
                    key={pendingCount}
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
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </motion.span>
                ) : (
                  <span style={{ position: 'absolute', top: 0, right: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
                )}
              </button>
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
        { title: 'Plateforme', links: ['Comment ça marche', 'Les Groupes', 'Tarification'] },
        { title: 'Légal',      links: ['Mentions Légales', 'Confidentialité', 'CGU / CGV'] },
      ].map(col => (
        <div key={col.title}>
          <p className="text-label" style={{ marginBottom: '1rem' }}>{col.title}</p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {col.links.map(l => (
              <li key={l} className="text-caption" style={{ cursor: 'pointer' }}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </footer>
);
