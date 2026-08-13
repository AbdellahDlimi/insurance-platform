import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, Lock, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../api.js';

export const StripeCheckout = ({ navigate }) => {
  const [paymentId, setPaymentId]       = useState('');
  const [cotisationId, setCotisationId] = useState('');
  const [amount, setAmount]             = useState('60');
  const [loading, setLoading]           = useState(false);
  const [completed, setCompleted]       = useState(false);

  const [cardNumber, setCardNumber]     = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry]     = useState('13 / 4');
  const [cardCvc, setCardCvc]           = useState('129');
  const [nameOnCard, setNameOnCard]     = useState('abdellah');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('payment_id');
    const cid = params.get('cotisation_id');
    const amt = params.get('amount');

    if (pid) setPaymentId(pid);
    if (cid) setCotisationId(cid);
    if (amt) {
      // Format amount cleanly (e.g., 60 instead of 60.00 if integer)
      const num = parseFloat(amt);
      setAmount(isNaN(num) ? amt : (num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)));
    }
  }, []);

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (paymentId) {
        await api.confirmSimulatedPayment(paymentId);
      } else if (cotisationId) {
        await api.payCotisation(cotisationId);
      }

      setCompleted(true);
      setTimeout(() => {
        navigate(`/payment/success?payment_id=${paymentId}&cotisation_id=${cotisationId}`);
      }, 1000);
    } catch (err) {
      console.error('Erreur de paiement:', err);
      alert('Erreur lors de la validation du paiement.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#090a0c', color: '#f0ede6',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: '480px',
          background: '#111318', border: '1px solid rgba(240,237,230,0.1)',
          borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
        }}
      >
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a059', fontWeight: 600, marginBottom: '0.25rem' }}>
              MONTANT À PAYER
            </p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.5rem', fontWeight: 700, color: '#c5a059', margin: 0, lineHeight: 1 }}>
              {amount} EUR
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'rgba(240,237,230,0.4)', fontSize: '0.875rem' }}>
            <Lock size={15} />
            <span>Sécurisé</span>
          </div>
        </div>

        {/* White Card Container */}
        <form onSubmit={handlePay}>
          <div style={{
            background: '#ffffff', borderRadius: '14px', padding: '1.5rem',
            color: '#1e293b', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Numéro de carte */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Numéro de carte
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.625rem 0.875rem',
                background: '#ffffff'
              }}>
                <CreditCard size={20} color="#94a3b8" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  required
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: 'monospace', fontSize: '1rem', color: '#0f172a', letterSpacing: '0.05em'
                  }}
                />
                <span style={{
                  background: '#0f172a', color: '#ffffff', fontWeight: 800,
                  padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.05em'
                }}>
                  VISA
                </span>
              </div>
            </div>

            {/* Date d'expiration & CVC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Date d'expiration
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.625rem 0.875rem',
                  background: '#ffffff'
                }}>
                  <Calendar size={18} color="#94a3b8" />
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    required
                    style={{
                      width: '100%', border: 'none', outline: 'none', background: 'transparent',
                      fontSize: '0.95rem', color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  CVC
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.625rem 0.875rem',
                  background: '#ffffff'
                }}>
                  <Lock size={18} color="#94a3b8" />
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value)}
                    required
                    style={{
                      width: '100%', border: 'none', outline: 'none', background: 'transparent',
                      fontSize: '0.95rem', color: '#0f172a'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Nom du titulaire */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                Nom du titulaire
              </label>
              <div style={{
                border: '1.5px solid #c5a059', borderRadius: '8px', padding: '0.625rem 0.875rem',
                background: '#ffffff'
              }}>
                <input
                  type="text"
                  value={nameOnCard}
                  onChange={e => setNameOnCard(e.target.value)}
                  required
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '1rem', color: '#0f172a', fontWeight: 500
                  }}
                />
              </div>
            </div>
          </div>

          {/* Test Mode Banner */}
          <div style={{
            background: '#091322', border: '1px solid #1e293b', borderRadius: '10px',
            padding: '0.875rem 1rem', marginTop: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#38bdf8', fontWeight: 600 }}>
              <CreditCard size={16} />
              <span>Mode Test</span>
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>— Utilisez la carte</span>
              <span style={{ background: '#1e293b', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                4242 4242 4242 4242
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.375rem', margin: 0, paddingLeft: '1.5rem' }}>
              Date : n'importe quelle date future · CVC : 3 chiffres
            </p>
          </div>

          {/* Submit Pay Button */}
          <button
            type="submit"
            disabled={loading || completed}
            style={{
              marginTop: '1.5rem', width: '100%', padding: '0.9375rem',
              background: completed ? '#10b981' : '#c5a059', color: '#090a0c',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.05rem',
              cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(197, 160, 89, 0.25)'
            }}
          >
            {completed ? (
              <>
                <CheckCircle2 size={20} />
                <span>Paiement Réussi !</span>
              </>
            ) : loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Validation du paiement...</span>
                </>
            ) : (
              <span>Payer {amount} EUR</span>
            )}
          </button>
        </form>
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
