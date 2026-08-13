import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { Btn, Card, pageVariants } from '../ui.jsx';

export const PaymentCancel = ({ navigate }) => {
  return (
    <motion.div {...pageVariants} style={{ paddingTop: '8rem', paddingBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ maxWidth: '400px', textAlign: 'center', background: 'var(--ink-90)' }}>
        <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h1 className="text-display-sm" style={{ marginBottom: '1rem' }}>Paiement annulé</h1>
        <p style={{ color: 'var(--paper-dim)', marginBottom: '2rem' }}>
          Vous avez annulé la procédure de paiement. Vous pourrez réessayer plus tard depuis votre dashboard.
        </p>
        <Btn variant="primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
          Retour au Dashboard
        </Btn>
      </Card>
    </motion.div>
  );
};
