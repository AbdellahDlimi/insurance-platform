ALTER TABLE coffre_kyc
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS commentaire_review TEXT;
