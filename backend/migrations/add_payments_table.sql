-- Migration pour la création de la table payment
CREATE TABLE IF NOT EXISTS payment (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groupe(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'eur',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    stripe_session_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_payment_stripe_session_id ON payment(stripe_session_id);
CREATE INDEX IF NOT EXISTS ix_payment_user_id ON payment(user_id);
CREATE INDEX IF NOT EXISTS ix_payment_group_id ON payment(group_id);
