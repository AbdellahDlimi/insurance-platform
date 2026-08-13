ALTER TABLE profil_onboarding 
  ADD COLUMN IF NOT EXISTS situation_familiale VARCHAR(30),
  ADD COLUMN IF NOT EXISTS nombre_personnes_a_charge INTEGER,
  ADD COLUMN IF NOT EXISTS couverture_existante TEXT[],
  ADD COLUMN IF NOT EXISTS priorite_assurance VARCHAR(30);
