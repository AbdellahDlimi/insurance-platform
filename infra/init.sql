-- ============================================================================
-- Plateforme SaaS d'Assurance Collaborative P2P
-- Script de création du schéma PostgreSQL — généré à partir du diagramme de classes
-- 15 tables (MoteurIA exclu : service sans état, pas de persistance)
-- ============================================================================

-- Extension pour la génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Extension pgvector (embeddings du Matchmaker / RAG) — à activer même si non
-- représentée explicitement sur ce diagramme de classes
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 1. UTILISATEUR
-- ============================================================================
CREATE TABLE utilisateur (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pseudonyme          VARCHAR(100) NOT NULL UNIQUE,
    email               VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash   VARCHAR(255) NOT NULL,
    role                VARCHAR(50)  NOT NULL DEFAULT 'membre', -- membre / admin_groupe
    statut_compte       VARCHAR(50)  NOT NULL DEFAULT 'actif',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. EQUIPE_CONFORMITE
-- ============================================================================
CREATE TABLE equipe_conformite (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom     VARCHAR(150) NOT NULL
);

-- ============================================================================
-- 3. GROUPE
-- ============================================================================
CREATE TABLE groupe (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom                 VARCHAR(150) NOT NULL,
    specialite          VARCHAR(100) NOT NULL,
    est_ouvert          BOOLEAN      NOT NULL DEFAULT TRUE,
    capacite_max        INTEGER,
    admin_id            UUID NOT NULL REFERENCES utilisateur(id),
    cotisation_de_base  NUMERIC(12,2) NOT NULL,
    buffer_pool_cible   NUMERIC(12,2),
    reglement_pdf_url   TEXT
);

CREATE INDEX idx_groupe_admin_id ON groupe(admin_id);

-- ============================================================================
-- 4. COFFRE_KYC  (relation 1-1 avec Utilisateur : "contient")
-- ============================================================================
CREATE TABLE coffre_kyc (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id          UUID NOT NULL UNIQUE REFERENCES utilisateur(id),
    donnees_chiffrees       BYTEA NOT NULL,
    ref_cle_kms             VARCHAR(255) NOT NULL,
    statut_verification     VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending / verified / failed / manual_review
    fournisseur_api         VARCHAR(50), -- ex: Veriff, Onfido
    verifie_par_agent_id    UUID REFERENCES equipe_conformite(id), -- si validation manuelle
    verifie_le              TIMESTAMPTZ,
    document_url            TEXT,
    commentaire_review      TEXT
);

-- ============================================================================
-- 5. CAGNOTTE  (relation 1-1 avec Groupe : "dispose_de")
-- ============================================================================
CREATE TABLE cagnotte (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    groupe_id           UUID NOT NULL UNIQUE REFERENCES groupe(id),
    solde_actuel        NUMERIC(14,2) NOT NULL DEFAULT 0,
    solde_buffer_pool   NUMERIC(14,2) NOT NULL DEFAULT 0,
    periode_courante    VARCHAR(20) NOT NULL -- ex: "2026-07"
);

-- ============================================================================
-- 6. NOTIFICATION
-- ============================================================================
CREATE TABLE notification (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id  UUID NOT NULL REFERENCES utilisateur(id),
    type            VARCHAR(50) NOT NULL,
    contenu         TEXT NOT NULL,
    lu              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_utilisateur_id ON notification(utilisateur_id);

-- ============================================================================
-- 7. MOYEN_PAIEMENT
-- ============================================================================
CREATE TABLE moyen_paiement (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id      UUID NOT NULL REFERENCES utilisateur(id),
    token_psp           VARCHAR(255) NOT NULL, -- token du prestataire de paiement, jamais le numéro complet
    derniers_chiffres   VARCHAR(4),
    statut_validation   VARCHAR(50) NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_moyen_paiement_utilisateur_id ON moyen_paiement(utilisateur_id);

-- ============================================================================
-- 8. DEMANDE_ADHESION  (table de jonction Utilisateur <-> Groupe, avant validation)
-- ============================================================================
CREATE TABLE demande_adhesion (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id          UUID NOT NULL REFERENCES utilisateur(id),
    groupe_id               UUID NOT NULL REFERENCES groupe(id),
    score_compatibilite     NUMERIC(5,4), -- calculé par MoteurIA.calculerScoreCompatibilite()
    statut                  VARCHAR(50) NOT NULL DEFAULT 'en_attente', -- en_attente / acceptee / refusee
    date_demande            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demande_adhesion_utilisateur_id ON demande_adhesion(utilisateur_id);
CREATE INDEX idx_demande_adhesion_groupe_id ON demande_adhesion(groupe_id);

-- ============================================================================
-- 9. ADHESION  (table de jonction Utilisateur <-> Groupe, une fois validée)
-- ============================================================================
CREATE TABLE adhesion (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id          UUID NOT NULL REFERENCES utilisateur(id),
    groupe_id               UUID NOT NULL REFERENCES groupe(id),
    statut                  VARCHAR(50) NOT NULL DEFAULT 'active',
    coefficient_actuel      NUMERIC(5,4) NOT NULL DEFAULT 1.0,
    nb_sinistres_periode    INTEGER NOT NULL DEFAULT 0,
    date_adhesion           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (utilisateur_id, groupe_id)
);

CREATE INDEX idx_adhesion_utilisateur_id ON adhesion(utilisateur_id);
CREATE INDEX idx_adhesion_groupe_id ON adhesion(groupe_id);

-- ============================================================================
-- 10. SINISTRE
-- ============================================================================
CREATE TABLE sinistre (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adhesion_id             UUID NOT NULL REFERENCES adhesion(id),
    groupe_id               UUID NOT NULL REFERENCES groupe(id),
    description             TEXT NOT NULL,
    montant_declare         NUMERIC(12,2) NOT NULL,
    montant_approuve        NUMERIC(12,2),
    statut                  VARCHAR(50) NOT NULL DEFAULT 'en_attente', -- en_attente / validee / rejetee
    score_fraude            NUMERIC(5,4), -- calculé par MoteurIA.calculerScoreAnomalie()
    resume_ia               TEXT,          -- généré par MoteurIA.genererResumeIA()
    date_declaration        TIMESTAMPTZ NOT NULL DEFAULT now(),
    traite_par_admin_id     UUID REFERENCES utilisateur(id)
);

CREATE INDEX idx_sinistre_adhesion_id ON sinistre(adhesion_id);
CREATE INDEX idx_sinistre_groupe_id ON sinistre(groupe_id);

-- ============================================================================
-- 11. PIECE_JUSTIFICATIVE
-- ============================================================================
CREATE TABLE piece_justificative (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sinistre_id     UUID NOT NULL REFERENCES sinistre(id),
    hdfs_url          TEXT NOT NULL,
    type_fichier    VARCHAR(50),
    texte_ocr       TEXT
);

CREATE INDEX idx_piece_justificative_sinistre_id ON piece_justificative(sinistre_id);

-- ============================================================================
-- 12. ALERTE_FRAUDE
-- ============================================================================
CREATE TABLE alerte_fraude (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sinistre_id         UUID NOT NULL REFERENCES sinistre(id),
    score               NUMERIC(5,4) NOT NULL,
    niveau_severite     VARCHAR(20) NOT NULL, -- faible / moyen / eleve
    explication_ia      TEXT,                  -- généré par MoteurIA.genererExplicationFraude()
    statut_traitement   VARCHAR(50) NOT NULL DEFAULT 'ouverte',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerte_fraude_sinistre_id ON alerte_fraude(sinistre_id);

-- ============================================================================
-- 13. COTISATION
-- ============================================================================
CREATE TABLE cotisation (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adhesion_id             UUID NOT NULL REFERENCES adhesion(id),
    cagnotte_id             UUID NOT NULL REFERENCES cagnotte(id),
    montant_base            NUMERIC(12,2) NOT NULL,
    coefficient_applique    NUMERIC(5,4) NOT NULL,
    montant_final           NUMERIC(12,2) NOT NULL,
    statut_paiement         VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    paye_le                 TIMESTAMPTZ
);

CREATE INDEX idx_cotisation_adhesion_id ON cotisation(adhesion_id);
CREATE INDEX idx_cotisation_cagnotte_id ON cotisation(cagnotte_id);

-- ============================================================================
-- 14. DEMANDE_LEVEE_ANONYMAT
-- ============================================================================
CREATE TABLE demande_levee_anonymat (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sinistre_id             UUID NOT NULL REFERENCES sinistre(id),
    utilisateur_cible_id    UUID NOT NULL REFERENCES utilisateur(id),
    groupe_id               UUID NOT NULL REFERENCES groupe(id),
    demande_par_admin_id    UUID NOT NULL REFERENCES utilisateur(id),
    justification_legale    TEXT NOT NULL,
    statut                  VARCHAR(50) NOT NULL DEFAULT 'en_attente', -- en_attente / approuvee / refusee
    valide_par_agent_id     UUID REFERENCES equipe_conformite(id),
    date_execution           TIMESTAMPTZ
);

CREATE INDEX idx_demande_levee_sinistre_id ON demande_levee_anonymat(sinistre_id);
CREATE INDEX idx_demande_levee_utilisateur_cible_id ON demande_levee_anonymat(utilisateur_cible_id);

-- ============================================================================
-- 15. JOURNAL_AUDIT
-- Note : acteur_id et cible_id sont volontairement SANS contrainte FK stricte,
-- car ils sont polymorphiques (acteur = Utilisateur OU EquipeConformite ;
-- cible = n'importe quelle entité tracée, désignée par cible_type)
-- ============================================================================
CREATE TABLE journal_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acteur_id       UUID NOT NULL,        -- id d'un Utilisateur ou d'un membre EquipeConformite
    action          VARCHAR(100) NOT NULL,
    cible_type      VARCHAR(50) NOT NULL, -- ex: "Sinistre", "CoffreKYC", "DemandeLeveeAnonymat"
    cible_id        UUID NOT NULL,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_audit_cible ON journal_audit(cible_type, cible_id);
CREATE INDEX idx_journal_audit_acteur_id ON journal_audit(acteur_id);

-- ============================================================================
-- 16. PROFIL_ONBOARDING
-- ============================================================================
CREATE TABLE profil_onboarding (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id              UUID NOT NULL UNIQUE REFERENCES utilisateur(id),
    tranche_age                 VARCHAR(20) NOT NULL,
    situation_pro               VARCHAR(50) NOT NULL,
    interets_assurance          TEXT[] NOT NULL,
    budget_max_mensuel          NUMERIC(8,2) NOT NULL,
    niveau_risque               VARCHAR(20) NOT NULL,
    region                      VARCHAR(100),
    situation_familiale         VARCHAR(30),
    nombre_personnes_a_charge   INTEGER,
    couverture_existante        TEXT[],
    priorite_assurance          VARCHAR(30),
    created_at                  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Fin du script — 16 tables créées
-- Rappel : MoteurIA n'a pas de table (service sans état, pas d'attributs
-- persistés sur le diagramme de classes)
-- ============================================================================
