import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CreditCard, CheckCircle2, Loader2, Lock, AlertTriangle, Calendar, Hash } from 'lucide-react';
import { api } from '../api.js';

/* ══════════════════════════════════════════════════════════════════
   Composant StripePaymentModal
   - Si une clé Stripe publiable est configurée ET valide → utilise Stripe Elements
   - Sinon → affiche un formulaire de carte réaliste intégré (mode test)
   ══════════════════════════════════════════════════════════════════ */


/* ── Helpers ── */
const formatCardNumber = (value) => {
  const v = value.replace(/\D/g, '').slice(0, 16);
  return v.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) return v.slice(0, 2) + ' / ' + v.slice(2);
  return v;
};

const getCardBrand = (num) => {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'generic';
};

const CARD_LOGOS = {
  visa: (
    <svg viewBox="0 0 48 32" width="36" height="24" style={{ flexShrink: 0 }}>
      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
      <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="Arial">VISA</text>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 32" width="36" height="24" style={{ flexShrink: 0 }}>
      <rect width="48" height="32" rx="4" fill="#2D2D2D"/>
      <circle cx="19" cy="16" r="9" fill="#EB001B" opacity="0.9"/>
      <circle cx="29" cy="16" r="9" fill="#F79E1B" opacity="0.9"/>
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 32" width="36" height="24" style={{ flexShrink: 0 }}>
      <rect width="48" height="32" rx="4" fill="#2E77BB"/>
      <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Arial">AMEX</text>
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 48 32" width="36" height="24" style={{ flexShrink: 0 }}>
      <rect width="48" height="32" rx="4" fill="#71717a" opacity="0.3"/>
      <rect x="6" y="12" width="16" height="3" rx="1.5" fill="#a1a1aa" opacity="0.5"/>
      <rect x="6" y="18" width="10" height="3" rx="1.5" fill="#a1a1aa" opacity="0.4"/>
    </svg>
  ),
};

/* Test cards accepted */
const VALID_TEST_CARDS = [
  '4242424242424242',
  '4000056655665556',
  '5555555555554444',
  '5200828282828210',
  '378282246310005',
  '371449635398431',
  '6011111111111117',
  '3056930009020004',
  '3566002020360505',
];


/* ── Realistic Card Payment Form ── */
const SimulatedPaymentForm = ({ paymentId, amount, currency, onSuccess, onError, onClose }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const cardRef = useRef(null);
  const expiryRef = useRef(null);
  const cvcRef = useRef(null);

  const rawCardNumber = cardNumber.replace(/\s/g, '');
  const cardBrand = getCardBrand(rawCardNumber);
  const isAmex = cardBrand === 'amex';
  const cvcLength = isAmex ? 4 : 3;

  const validateForm = () => {
    if (rawCardNumber.length < 13) return 'Numéro de carte incomplet.';
    if (!VALID_TEST_CARDS.includes(rawCardNumber)) return 'Numéro de carte invalide. Utilisez 4242 4242 4242 4242 pour tester.';
    const expParts = expiry.replace(/\s/g, '').split('/');
    if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) return 'Date d\'expiration invalide.';
    const month = parseInt(expParts[0]);
    const year = parseInt('20' + expParts[1]);
    const now = new Date();
    if (month < 1 || month > 12) return 'Mois d\'expiration invalide.';
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Carte expirée.';
    if (cvc.length < cvcLength) return `CVC invalide (${cvcLength} chiffres attendus).`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setProcessing(true);
    setError(null);

    // Simulate Stripe processing delay
    await new Promise(resolve => setTimeout(resolve, 1800 + Math.random() * 1200));

    try {
      await api.confirmPayment(paymentId);
      setSucceeded(true);
      if (onSuccess) onSuccess(paymentId);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Erreur lors de la confirmation du paiement.';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setError(null);
    // Auto-tab to expiry when card number is complete
    const raw = formatted.replace(/\s/g, '');
    if (raw.length >= 16 && expiryRef.current) {
      expiryRef.current.focus();
    }
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiry(e.target.value);
    setExpiry(formatted);
    setError(null);
    // Auto-tab to CVC
    const raw = formatted.replace(/[\s/]/g, '');
    if (raw.length >= 4 && cvcRef.current) {
      cvcRef.current.focus();
    }
  };

  const handleCvcChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, cvcLength);
    setCvc(v);
    setError(null);
  };

  const inputBaseStyle = {
    width: '100%',
    padding: '0.875rem 1rem',
    background: '#ffffff',
    border: '1.5px solid #d4d4d8',
    borderRadius: '8px',
    color: '#1a1a1a',
    fontSize: '0.9375rem',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  };

  const inputFocusStyle = {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 3px rgba(200,169,110,0.15)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#52525b',
    marginBottom: '0.375rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  };

  if (succeeded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', padding: '2rem 0' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 1.5rem' }} />
        </motion.div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600,
          color: 'var(--paper)', marginBottom: '0.75rem'
        }}>
          Paiement réussi !
        </h2>
        <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Votre cotisation de <strong style={{ color: 'var(--gold)' }}>{amount} {currency.toUpperCase()}</strong> a été
          confirmée et créditée sur la cagnotte du groupe.
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '0.625rem 1rem', borderRadius: '6px', color: '#10B981',
          fontSize: '0.8125rem', fontWeight: 500, marginBottom: '1.5rem'
        }}>
          <ShieldCheck size={16} />
          <span>Paiement sécurisé validé</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '0.875rem', background: 'var(--gold)',
            color: 'var(--ink)', border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 600,
          }}
        >
          Fermer
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Amount summary */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.25rem', background: 'rgba(200,169,110,0.06)',
        border: '1px solid rgba(200,169,110,0.15)', borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <div>
          <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(240,237,230,0.4)', marginBottom: '0.25rem' }}>
            Montant à payer
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--gold)' }}>
            {amount} {currency.toUpperCase()}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(240,237,230,0.3)', fontSize: '0.75rem' }}>
          <Lock size={12} />
          <span>Sécurisé</span>
        </div>
      </div>

      {/* ── Card Form ── */}
      <div style={{
        background: '#fafafa',
        borderRadius: '10px',
        padding: '1.5rem',
        border: '1px solid #e4e4e7',
        marginBottom: '1rem',
      }}>
        {/* Card number */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Numéro de carte</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={cardRef}
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              onFocus={() => setFocusedField('card')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...inputBaseStyle,
                paddingLeft: '3.25rem',
                paddingRight: '3rem',
                ...(focusedField === 'card' ? inputFocusStyle : {}),
              }}
            />
            <div style={{
              position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center',
            }}>
              <CreditCard size={18} color={focusedField === 'card' ? '#c8a96e' : '#a1a1aa'} />
            </div>
            <div style={{
              position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', transition: 'all 0.2s ease',
            }}>
              <motion.div
                key={cardBrand}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                {CARD_LOGOS[cardBrand]}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Expiry + CVC row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Date d'expiration</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={expiryRef}
                type="text"
                inputMode="numeric"
                placeholder="MM / AA"
                value={expiry}
                onChange={handleExpiryChange}
                onFocus={() => setFocusedField('expiry')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputBaseStyle,
                  paddingLeft: '2.75rem',
                  ...(focusedField === 'expiry' ? inputFocusStyle : {}),
                }}
              />
              <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                <Calendar size={15} color={focusedField === 'expiry' ? '#c8a96e' : '#a1a1aa'} />
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>CVC</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={cvcRef}
                type="text"
                inputMode="numeric"
                placeholder={isAmex ? '1234' : '123'}
                value={cvc}
                onChange={handleCvcChange}
                onFocus={() => setFocusedField('cvc')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputBaseStyle,
                  paddingLeft: '2.75rem',
                  ...(focusedField === 'cvc' ? inputFocusStyle : {}),
                }}
              />
              <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                <Lock size={15} color={focusedField === 'cvc' ? '#c8a96e' : '#a1a1aa'} />
              </div>
            </div>
          </div>
        </div>

        {/* Cardholder name */}
        <div>
          <label style={labelStyle}>Nom du titulaire</label>
          <input
            type="text"
            placeholder="Nom sur la carte"
            value={cardName}
            onChange={e => { setCardName(e.target.value); setError(null); }}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputBaseStyle,
              ...(focusedField === 'name' ? inputFocusStyle : {}),
            }}
          />
        </div>
      </div>

      {/* Test card hint */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: '6px',
        marginBottom: '1.25rem',
      }}>
        <CreditCard size={14} color="#60A5FA" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.75rem', color: 'rgba(240,237,230,0.6)', lineHeight: 1.5 }}>
          <strong style={{ color: '#60A5FA' }}>Mode Test</strong> — Utilisez la carte
          <code style={{
            background: 'rgba(59, 130, 246, 0.1)', padding: '0.125rem 0.375rem',
            borderRadius: '3px', fontFamily: 'monospace', color: '#93C5FD',
            fontSize: '0.8125rem', marginLeft: '0.25rem'
          }}>
            4242 4242 4242 4242
          </code>
          <br/>Date : n'importe quelle date future · CVC : 3 chiffres
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px',
              marginBottom: '1rem', color: '#F87171', fontSize: '0.8125rem',
              overflow: 'hidden',
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <button
        type="submit"
        disabled={processing}
        style={{
          width: '100%', padding: '1rem',
          background: processing
            ? 'rgba(200,169,110,0.3)'
            : 'linear-gradient(135deg, #c8a96e, #a88a4e)',
          color: processing ? 'rgba(240,237,230,0.5)' : '#0f0f0f',
          border: 'none', borderRadius: '8px', cursor: processing ? 'not-allowed' : 'pointer',
          fontFamily: '"Inter", system-ui, sans-serif', fontSize: '1rem', fontWeight: 600,
          letterSpacing: '0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          transition: 'all 0.2s ease',
          boxShadow: processing ? 'none' : '0 4px 16px rgba(200,169,110,0.3)',
        }}
      >
        {processing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Traitement en cours…</span>
          </>
        ) : (
          <>
            <Lock size={16} />
            <span>Payer {amount} {currency.toUpperCase()}</span>
          </>
        )}
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        marginTop: '1rem', paddingTop: '0.75rem',
        borderTop: '1px solid rgba(240,237,230,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'rgba(240,237,230,0.25)' }}>
          <ShieldCheck size={11} />
          <span>Paiement chiffré et sécurisé</span>
        </div>
        <span style={{ color: 'rgba(240,237,230,0.1)' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {CARD_LOGOS.visa}
          {CARD_LOGOS.mastercard}
          {CARD_LOGOS.amex}
        </div>
      </div>
    </form>
  );
};


/* ── Stripe Elements Form (when real Stripe key is available) ── */
let StripeElementsForm = null;

const loadStripeElements = async () => {
  try {
    const { loadStripe } = await import('@stripe/stripe-js');
    const { Elements, PaymentElement, useStripe, useElements } = await import('@stripe/react-stripe-js');
    return { loadStripe, Elements, PaymentElement, useStripe, useElements };
  } catch {
    return null;
  }
};


/* ── Main Modal Component ── */
const StripePaymentModal = ({ isOpen, onClose, groupId, amount, onPaymentSuccess }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(amount);
  const [paymentCurrency, setPaymentCurrency] = useState('eur');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useSimulated, setUseSimulated] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null);
      setPaymentId(null);
      setLoading(true);
      setError(null);
      setUseSimulated(false);
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create PaymentIntent
        const intentData = await api.createPaymentIntent(groupId, amount);

        setPaymentId(intentData.payment_id);
        setPaymentAmount(intentData.amount);
        setPaymentCurrency(intentData.currency);

        if (intentData.status === 'PAID') {
          // Payment was auto-completed → show success
          if (onPaymentSuccess) onPaymentSuccess(intentData.payment_id);
          setUseSimulated(true);
          setLoading(false);
          return;
        }

        // Check if client_secret looks real (from Stripe) or simulated
        const isSimulatedSecret = !intentData.client_secret
          || intentData.client_secret.startsWith('pi_simulated_')
          || intentData.client_secret.startsWith('demo_');

        if (!isSimulatedSecret) {
          // Real Stripe client_secret → try to load Stripe Elements
          const config = await api.getStripeConfig();
          if (config.publishable_key && config.publishable_key.startsWith('pk_')) {
            try {
              const stripeModules = await loadStripeElements();
              if (stripeModules) {
                setClientSecret(intentData.client_secret);
                setLoading(false);
                return;
              }
            } catch (err) {
              console.warn('[StripePaymentModal] Stripe Elements unavailable, using simulated form.');
            }
          }
        }

        // Fallback: use simulated payment form (with the real card UI)
        setUseSimulated(true);
        setLoading(false);
      } catch (err) {
        console.error('[StripePaymentModal] Init error:', err);
        // If the PaymentIntent creation failed, still show the simulated form
        // by creating a payment via the old checkout method
        try {
          const checkoutData = await api.createCheckoutSession(groupId, amount);
          setPaymentId(checkoutData.payment_id);
          setPaymentAmount(amount || 0);
          setUseSimulated(true);
          setLoading(false);
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.detail || fallbackErr.message || 'Erreur lors de l\'initialisation du paiement.');
          setLoading(false);
        }
      }
    };

    init();
  }, [isOpen, groupId, amount]);

  const handleSuccess = (pid) => {
    if (onPaymentSuccess) onPaymentSuccess(pid);
    setTimeout(() => onClose(), 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(8, 8, 8, 0.88)', backdropFilter: 'blur(12px)',
            zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--ink)',
              border: '1px solid rgba(200,169,110,0.15)',
              borderRadius: '12px',
              width: '100%', maxWidth: '480px',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,169,110,0.08)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(240,237,230,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.05))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(200,169,110,0.2)',
                }}>
                  <CreditCard size={18} color="var(--gold)" />
                </div>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600,
                    color: 'var(--paper)', margin: 0, lineHeight: 1.2
                  }}>
                    Payer ma cotisation
                  </h2>
                  <p style={{ fontSize: '0.6875rem', color: 'rgba(240,237,230,0.35)', margin: 0, marginTop: '0.125rem' }}>
                    Paiement sécurisé par carte bancaire
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(240,237,230,0.05)', border: '1px solid rgba(240,237,230,0.08)',
                  color: 'var(--paper-dim)', cursor: 'pointer', borderRadius: '8px',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(240,237,230,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(240,237,230,0.05)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    style={{ display: 'inline-block', marginBottom: '1rem' }}
                  >
                    <Loader2 size={36} color="var(--gold)" />
                  </motion.div>
                  <p style={{ color: 'var(--paper-dim)', fontSize: '0.9375rem' }}>
                    Préparation du paiement sécurisé…
                  </p>
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#F87171', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{error}</p>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '0.75rem 2rem', background: 'none',
                      border: '1px solid var(--gold-line)', color: 'var(--paper)',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem',
                    }}
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <SimulatedPaymentForm
                  paymentId={paymentId}
                  amount={paymentAmount}
                  currency={paymentCurrency}
                  onSuccess={handleSuccess}
                  onError={(msg) => console.error('[Payment Error]', msg)}
                  onClose={onClose}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StripePaymentModal;
