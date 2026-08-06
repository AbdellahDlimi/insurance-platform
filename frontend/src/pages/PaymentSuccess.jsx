import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Btn, Card, pageVariants } from '../ui.jsx';

export const PaymentSuccess = ({ navigate }) => {
  return (
    <motion.div {...pageVariants} style={{ paddingTop: '8rem', paddingBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ maxWidth: '400px', textAlign: 'center', background: 'var(--ink-90)' }}>
        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
        <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>Paiement réussi</h1>
        <p style={{ color: 'var(--paper-dim)', marginBottom: '2rem' }}>
          Merci ! Votre cotisation a bien été réglée.
        </p>
        <Btn variant="primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
          Retour au Dashboard
        </Btn>
      </Card>
    </motion.div>
  );
};
