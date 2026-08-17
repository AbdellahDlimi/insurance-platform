import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Btn } from '../ui.jsx';
import StripePaymentModal from './StripePaymentModal.jsx';

export const PaymentButton = ({
  groupId,
  amount = null,
  label = "Payer ma cotisation",
  variant = "primary",
  size = "md",
  style = {},
  onSuccess,
  onError
}) => {
  const [showModal, setShowModal] = useState(false);

  const handlePay = (e) => {
    if (e) e.preventDefault();
    setShowModal(true);
  };

  const handlePaymentSuccess = (paymentId) => {
    if (onSuccess) onSuccess(paymentId);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <Btn
        variant={variant}
        size={size}
        onClick={handlePay}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          ...style
        }}
      >
        <CreditCard size={18} />
        <span>{label}</span>
      </Btn>

      <StripePaymentModal
        isOpen={showModal}
        onClose={handleClose}
        groupId={groupId}
        amount={amount}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
};

export default PaymentButton;
