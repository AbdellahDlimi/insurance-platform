# 🛡️ TrustPool — Plateforme SaaS d'Assurance Collaborative P2P assistée par IA

> **Projet de Fin d'Année — École Nationale des Sciences Appliquées (ENSA)**  
> *Filière : Big Data, Data Science & Intelligence Artificielle*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791.svg?style=flat&logo=postgresql)](https://github.com/pgvector/pgvector)
[![Kafka](https://img.shields.io/badge/Streaming-Apache%20Kafka%20KRaft-231F20.svg?style=flat&logo=apachekafka)](https://kafka.apache.org/)
[![Docker](https://img.shields.io/badge/Infra-Docker%20Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20RAG-8E75B2.svg?style=flat&logo=google)](https://aistudio.google.com/)
[![Stripe](https://img.shields.io/badge/Paiement-Stripe%20API-635BFF.svg?style=flat&logo=stripe)](https://stripe.com/)

---

## 📌 Présentation du projet

**TrustPool** modernise le modèle de l'assurance collaborative en pair-à-pair (*P2P*) grâce aux technologies modernes de données et d'intelligence artificielle.

### 🤝 Mutualisation solidaire

Constitution de communautés de risque autonomes avec une double trésorerie :

- **Cagnotte d'indemnisation directe**
- **Buffer Pool** de réserve prudentielle

### 📈 Tarification dynamique — Bonus-Malus

Ajustement individuel et transparent de la cotisation selon la sinistralité réelle constatée :

- `+0.20` par sinistre validé
- coefficient plafonné à `2.00`

### 🤖 IA & RAG embarqués

- **Matchmaker IA** : recommandation sémantique de groupes via embeddings Google Gemini et similarité cosinus.
- **Chien de Garde Anti-Fraude** : analyse des pièces justificatives, extraction OCR et calcul d'un score de risque de fraude.
- **Copilote IA** : assistant conversationnel RAG permettant aux membres d'obtenir des réponses à partir de la documentation disponible.

### 🔐 Sécurité & confidentialité

- Chiffrement symétrique du coffre-fort KYC avec **Fernet / AES-256**
- Pseudonymisation des identités
- Journal d'audit immuable
- Authentification et autorisation par JWT

---

# 🏗️ Architecture globale

```text
┌────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND — React 18 + Vite                         │
│                                                                        │
│ Dashboard Membre · Catalogue Groupes · Déclaration Sinistres           │
│ Console Admin · Espace Conformité · Paiement Stripe                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                              HTTP / REST / CORS
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         BACKEND API — FastAPI                         │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Users / KYC  │  │   Groupes    │  │   Cagnotte   │  │ Sinistres  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Payments    │  │    Audit     │  │ Notifications│  │   AI / RAG │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└───────┬──────────────┬──────────────┬──────────────┬─────────────┬────┘
        │              │              │              │             │
┌───────▼──────┐ ┌─────▼───────┐ ┌────▼────────┐ ┌───▼────────┐ ┌─▼─────────┐
│ PostgreSQL   │ │ Apache Kafka │ │ MinIO (S3) │ │ Neo4j Graph│ │ Stripe /  │
│ + pgvector   │ │ Event Bus    │ │ Pièces      │ │ Réseaux    │ │ Gemini AI │
└──────────────┘ └──────────────┘ └─────────────┘ └────────────┘ └───────────┘
```

---

# 🛠️ Stack technologique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Python |
| Base de données | PostgreSQL, pgvector |
| Streaming | Apache Kafka — KRaft |
| Stockage objet | MinIO — S3 compatible |
| Base graphe | Neo4j |
| IA | Google Gemini, RAG, embeddings |
| Paiement | Stripe API |
| Conteneurisation | Docker, Docker Compose |
| Tests | Pytest |
| Authentification | JWT |
| Sécurité | Fernet / AES-256, KMS, pseudonymisation |

---

# 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Docker Compose
- Python `3.10+`
- Node.js `18+`
- npm

---

# 🚀 Guide de démarrage rapide

## 1️⃣ Cloner le dépôt

```bash
git clone https://github.com/AbdellahDlimi/insurance-platform.git
cd insurance-platform
```

---

## 2️⃣ Démarrer l'infrastructure Docker

Lancez PostgreSQL, Kafka, MinIO, Neo4j et Adminer :

```bash
docker compose up -d
```

Vérifiez l'état des conteneurs :

```bash
docker compose ps
```

### Services principaux

| Conteneur | Port | Rôle |
|---|---:|---|
| `p2p_postgres` | `5432` | PostgreSQL + pgvector |
| `p2p_kafka` | `9094` | Bus d'événements Kafka |
| `p2p_minio` | `9000 / 9001` | Stockage objet S3 |
| `p2p_neo4j` | `7474 / 7687` | Base de données graphe |
| `p2p_adminer` | `8080` | Administration PostgreSQL |

---

## 3️⃣ Configurer et lancer le Backend

Accédez au dossier backend :

```bash
cd backend
```

### 🪟 Windows — PowerShell

Créez l'environnement virtuel :

```powershell
python -m venv venv
```

Activez-le :

```powershell
.\venv\Scripts\Activate.ps1
```

### ⚠️ En cas d'erreur PowerShell

Si PowerShell affiche une erreur du type :

```text
PSSecurityException
script execution is disabled
```

Exécutez d'abord :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Puis :

```powershell
.\venv\Scripts\Activate.ps1
```

> Cette modification concerne uniquement la session PowerShell actuelle.

---

### 🐧 Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

### Installer les dépendances

```bash
pip install -r requirements.txt
```

---

### Créer le fichier `.env`

#### Windows

```powershell
copy .env.example .env
```

#### Linux / macOS

```bash
cp .env.example .env
```

> ⚠️ Configurez les variables nécessaires dans `.env` avant de lancer les services IA, Stripe ou les autres services nécessitant des clés/API.

---

### Initialiser les données de démonstration

```bash
python create_admin.py
python create_admin_agent.py
python scripts/create_5_groups.py
python scripts/seed_recommendation.py
```

---

### Lancer FastAPI

```bash
uvicorn app.main:app --reload --port 8000
```

Le backend sera disponible sur :

- **API** : http://localhost:8000
- **Swagger UI** : http://localhost:8000/docs

---

# 4️⃣ Installer et lancer le Frontend

Ouvrez un **deuxième terminal** :

```bash
cd frontend
```

Installez les dépendances :

```bash
npm install
```

Lancez le serveur de développement :

```bash
npm run dev
```

Application web :

**http://localhost:3000**

---

# 5️⃣ 🏭 Compiler pour la production

```bash
cd frontend
npm run build
npm run preview
```

---

# 🔑 Comptes de test

| Rôle | Email | Mot de passe | Fonctionnalités |
|---|---|---|---|
| Officier de conformité | `admin@conformite.com` | `Admin123!` | Validation KYC, levée d'anonymat, audit |
| Membre / Admin groupe | `test@example.com` | `Password123!` | Dashboard, adhésion, cotisation, sinistres |

> ⚠️ Ces identifiants sont destinés uniquement à l'environnement de démonstration/test. Ne pas les utiliser en production.

### 💳 Mode test Stripe

Pour tester le paiement avec Stripe :

```text
Numéro : 4242 4242 4242 4242
Expiration : une date future
CVC : 123
```

---

# 🧪 Tests automatisés

Depuis le dossier `backend` :

```bash
python -m pytest
```

Pour obtenir plus de détails :

```bash
python -m pytest -v
```

---

# 🌐 Tableau des services

| Service | URL locale | Identifiants / Informations |
|---|---|---|
| Frontend | http://localhost:3000 | Application React |
| Backend API | http://localhost:8000 | FastAPI |
| Swagger UI | http://localhost:8000/docs | Documentation API |
| Adminer | http://localhost:8080 | PostgreSQL |
| MinIO Console | http://localhost:9001 | `minioadmin` / `miniopassword` |
| Neo4j Browser | http://localhost:7474 | `neo4j` / `password` |
| Kafka Broker | `localhost:9094` | Bus d'événements |

### 🔑 Configuration Adminer

```text
Système : PostgreSQL
Serveur : postgres-db
Utilisateur : admin
Mot de passe : password
Base de données : insurance_db
```

> Les valeurs ci-dessus correspondent à la configuration de démonstration actuelle. Vérifiez `docker-compose.yml` et `.env` si votre environnement utilise d'autres identifiants.

---

# 📂 Structure du projet

```text
insurance-platform/
│
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── chien_de_garde/          # Analyse des fraudes
│   │   │   ├── matchmaker/              # Recommandation vectorielle
│   │   │   ├── rag_analyseur_preuves/   # OCR & analyse des preuves
│   │   │   └── rag_copilote/             # Chatbot RAG
│   │   │
│   │   ├── core/
│   │   │   ├── auth.py                  # Gestion JWT & rôles
│   │   │   ├── database.py              # Sessions SQLAlchemy
│   │   │   ├── kms.py                   # Chiffrement Fernet / AES
│   │   │   ├── storage.py               # Client MinIO / S3
│   │   │   └── email/                   # Service SMTP & templates
│   │   │
│   │   ├── modules/
│   │   │   ├── users_kyc/
│   │   │   ├── groups/
│   │   │   ├── cagnotte/
│   │   │   ├── claims/
│   │   │   ├── payments/
│   │   │   └── audit/
│   │   │
│   │   ├── config.py
│   │   └── main.py
│   │
│   ├── scripts/                         # Seeds BDD & Embeddings
│   ├── tests/                           # Tests unitaires Pytest
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   └── App.jsx
│   └── package.json
│
├── infra/                               # Scripts SQL d'initialisation
│
├── rapport/                             # Rapport de projet (LaTeX & PDF)
│
├── docker-compose.yml
└── README.md
```

---

# 🔄 Flux principal d'une déclaration de sinistre

```text
Membre
  │
  ▼
Déclaration du sinistre
  │
  ▼
Upload des pièces justificatives
  │
  ▼
MinIO — Stockage sécurisé
  │
  ▼
Analyse IA / OCR / RAG
  │
  ▼
Score de risque & contrôle anti-fraude
  │
  ▼
Validation / décision
  │
  ▼
Cagnotte
  │
  ▼
Indemnisation
  │
  ▼
Mise à jour Bonus-Malus
  │
  ▼
Audit & Notification
```

---

# 🤖 Modules IA

## 🧠 Matchmaker IA

Le système transforme les caractéristiques d'un membre en représentation vectorielle afin de recommander les groupes les plus pertinents selon une similarité sémantique.

```text
Profil membre
     │
     ▼
Embedding Gemini
     │
     ▼
pgvector
     │
     ▼
Similarité cosinus
     │
     ▼
Groupes recommandés
```

---

## 🛡️ Chien de Garde — Anti-Fraude

Analyse des documents liés à une déclaration de sinistre afin d'identifier des incohérences ou anomalies potentielles.

```text
Pièces justificatives
        │
        ▼
       OCR
        │
        ▼
Extraction des informations
        │
        ▼
Analyse IA
        │
        ▼
Score de risque
        │
        ▼
Contrôle humain / décision
```

---

## 💬 Copilote IA — RAG

Le chatbot permet aux utilisateurs d'interroger la documentation de la plateforme et d'obtenir des réponses contextualisées.

```text
Question utilisateur
        │
        ▼
Recherche vectorielle
        │
        ▼
Documents pertinents
        │
        ▼
LLM / Gemini
        │
        ▼
Réponse contextualisée
```

---

# 🔐 Sécurité

TrustPool intègre plusieurs mécanismes de sécurité :

- 🔑 Authentification JWT
- 🔒 Chiffrement des données sensibles
- 🥷 Pseudonymisation des utilisateurs
- 📜 Journal d'audit
- 🗄️ Coffre-fort KYC
- 🛡️ Contrôle des accès par rôle
- 🔐 Gestion sécurisée des secrets via variables d'environnement
- 💳 Paiements traités via Stripe

> **Important :** ne jamais versionner un fichier `.env` contenant des secrets, clés API, mots de passe ou clés Stripe réelles.

---

# 🐳 Docker

### ▶️ Démarrer les services

```bash
docker compose up -d
```

### ⏹️ Arrêter les services

```bash
docker compose down
```

### 🗑️ Arrêter les services et supprimer les volumes

```bash
docker compose down -v
```

### 🔄 Redémarrer les services

```bash
docker compose restart
```

### 📋 Voir l'état des conteneurs

```bash
docker compose ps
```

### 📜 Voir tous les logs

```bash
docker compose logs -f
```

### 📜 Voir les logs de PostgreSQL

```bash
docker compose logs -f postgres-db
```

> ⚠️ Le service Docker PostgreSQL s'appelle **`postgres-db`** dans `docker-compose.yml`.

---

# 👥 Équipe

Projet réalisé par une équipe d'élèves-ingénieurs de l'**ENSA**, dans le cadre du cursus :

**Big Data · Data Science · Intelligence Artificielle**

---

# 📄 Documentation

Les principaux documents du projet sont disponibles dans le dépôt :

- `CONVENTIONS.md` — conventions de développement
- `FRONTEND_SPEC.md` — spécifications frontend
- `RAPPORT_TRUSTPOOL.md` — rapport technique
- `rapport/` — rapport académique et ressources associées

---

# ⭐ TrustPool

> **Mutualiser. Sécuriser. Analyser. Indemniser.**

Une approche moderne de l'assurance collaborative P2P, combinant **Big Data, IA, RAG, streaming événementiel et sécurité**.
