import React from 'react';
import { motion } from 'framer-motion';

/* ── Framer Motion presets ── */
export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.3 } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.09 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/* ── Surface card ── */
export const Card = ({ children, className = '', gold = false, hover = false, onClick }) => (
  <motion.div
    onClick={onClick}
    whileHover={hover ? { y: -3, borderColor: 'rgba(200,169,110,0.35)' } : {}}
    className={`${gold ? 'surface-gold' : 'surface'} p-6 ${hover ? 'cursor-pointer' : ''} ${className}`}
    style={{ transition: 'border-color 0.2s, transform 0.2s' }}
  >
    {children}
  </motion.div>
);

/* ── Primary / secondary / ghost / danger buttons ── */
export const Btn = ({ children, variant = 'primary', className = '', loading = false, ...props }) => {
  const map = {
    primary:   'btn btn-primary',
    secondary: 'btn btn-secondary',
    ghost:     'btn btn-ghost',
    danger:    'btn btn-danger',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`${map[variant]} ${className} ${loading ? 'opacity-60 pointer-events-none' : ''}`}
      disabled={loading}
      {...props}
    >
      {loading ? <span className="spinner" /> : children}
    </motion.button>
  );
};

export const Field = ({ label, type = 'text', ...props }) => {
  const [show, setShow] = React.useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && <label className="input-label">{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input 
          type={inputType} 
          className="input-field" 
          style={{ width: '100%', paddingRight: isPassword ? '2.5rem' : '1rem' }} 
          {...props} 
        />
        {isPassword && (
          <button 
            type="button" 
            onClick={() => setShow(!show)} 
            style={{ 
              position: 'absolute', right: '0.75rem', background: 'none', border: 'none', 
              color: 'var(--paper-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              padding: '0.25rem'
            }}
            title={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Badge ── */
export const Badge = ({ children, variant = 'info' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

/* ── Gold italic display text ── */
export const DisplayItalic = ({ children, className = '' }) => (
  <em className={`text-italic text-gold ${className}`} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
    {children}
  </em>
);

/* ── Decorative ruled label ── */
export const SectionLabel = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
    <span className="text-label">{children}</span>
    <div className="rule-horizontal" style={{ flex: 1, opacity: 0.4 }} />
  </div>
);

/* ── Full-page centered loader ── */
export const PageLoader = ({ label = 'Chargement…' }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
    <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
    <p className="text-caption">{label}</p>
  </div>
);

/* ── Error / alert banners ── */
export const AlertBanner = ({ children, type = 'error' }) => (
  <div className={`toast-${type}`}>
    <p style={{ fontSize: '0.875rem', color: 'var(--paper-dim)' }}>{children}</p>
  </div>
);

/* ── Step progress dots ── */
export const StepProgress = ({ total, current }) => {
  const dots = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="step-progress">
      {dots.map((d, i) => (
        <React.Fragment key={d}>
          <div className={`step-dot ${d < current ? 'done' : d === current ? 'active' : ''}`} />
          {i < dots.length - 1 && <div className={`step-line ${d < current ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};
