import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Btn, Card, pageVariants } from '../ui.jsx';
import { api } from '../api.js';

export const PaymentSuccess = ({ navigate }) => {
  const [status, setStatus] = useState('PENDING'); // PENDING, PAID, FAILED
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    
    if (!paymentId) {
      // Fallback in case of direct access or legacy redirect
      const cotisationId = params.get('cotisation_id');
      if (cotisationId) {
        // Direct confirmation fallback
        api.payCotisation(cotisationId)
          .then(() => {
            setStatus('PAID');
            setLoading(false);
          })
          .catch(() => {
            setStatus('FAILED');
            setLoading(false);
          });
      } else {
        setLoading(false);
        setStatus('PAID'); // general success message
      }
      return;
    }

    // Polling function
    let intervalId;
    const checkStatus = async () => {
      try {
        const payment = await api.getPayment(paymentId);
        setAmount(payment.amount);
        if (payment.status === 'PAID') {
          setStatus('PAID');
          setLoading(false);
          clearInterval(intervalId);
        } else if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
          setStatus('FAILED');
          setLoading(false);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Error fetching payment status:", err);
      }
    };

    // Initial check
    checkStatus();

    // Start polling every 2 seconds
    intervalId = setInterval(checkStatus, 2000);

    // Clean up
    return () => clearInterval(intervalId);
  }, []);

  return (
    <motion.div {...pageVariants} style={{ paddingTop: '8rem', paddingBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ maxWidth: '450px', width: '100%', textAlign: 'center', background: 'var(--ink-90)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '1rem 0' }}>
            <Loader2 size={48} color="var(--gold)" className="animate-spin" />
            <h1 className="text-display-sm" style={{ marginBottom: '0.25rem' }}>Traitement en cours</h1>
            <p style={{ color: 'var(--paper-dim)' }}>
              Votre paiement est en cours de confirmation par Stripe. Veuillez patienter...
            </p>
          </div>
        ) : status === 'PAID' ? (
          <>
            <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
            <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>Paiement réussi</h1>
            <p style={{ color: 'var(--paper-dim)', marginBottom: '2rem' }}>
              Merci ! Votre cotisation {amount ? `de ${amount} €` : ''} a bien été réglée et créditée sur la cagnotte.
            </p>
            <Btn variant="primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
              Retour au Dashboard
            </Btn>
          </>
        ) : (
          <>
            <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
            <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>Échec de validation</h1>
            <p style={{ color: 'var(--paper-dim)', marginBottom: '2rem' }}>
              Nous n'avons pas pu confirmer votre paiement. Si vous avez été débité, veuillez contacter le support.
            </p>
            <Btn variant="primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
              Retour au Dashboard
            </Btn>
          </>
        )}
      </Card>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};
