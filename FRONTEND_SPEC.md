# Spécifications & Prompt Front-End
## Plateforme d'Assurance Mutuelle Collaborative & Tontine Peer-to-Peer (P2P)

### 1. VISION GÉNÉRALE DU PROJET
Nous développons une plateforme d'**assurance mutuelle collaborative (P2P Insurance / Tontine moderne)**. 
L'objectif est d'offrir une alternative transparente, équitable et communautaire à l'assurance traditionnelle. 

**Principe clé :**
- Les utilisateurs rejoignent ou créent des **groupes de mutualisation (pools de risque / tontines)**.
- Chaque membre verse une cotisation mensuelle/périodique dans une **Cagnotte commune (Pot commun)**.
- En cas de sinistre d'un membre, le dédommagement est soumis à la communauté/aux admins et versé directement depuis la cagnotte du groupe.
- Les fonds non utilisés restent la propriété du groupe (possibilité de redistribution ou de réduction des cotisations).

---

### 2. STACK TECHNIQUE DU FRONT-END
- **Framework Core :** React 18+ (avec Vite)
- **Styling :** Tailwind CSS + CSS Custom Properties (Design System personnalisé)
- **Animations :** Framer Motion (Transitions fluides, micro-interactions)
- **Icônes :** Lucide React (`lucide-react`)
- **Paiements :** Intégration Stripe (Stripe Elements / Checkout Modal)
- **Gestion des états & API :** REST API Backend (FastAPI Python) avec authentification JWT Token.

---

### 3. ARBORESCENCE & PLAN DES PAGES DU FRONT-END

#### A. Vitrine & Marketing (Tout public)
1. **Landing Page (`/`) :**
   - Hero section percutante (Titre engageant, CTA d'inscription, illustration/animation 3D ou mockup dynamique).
   - Statistiques clés de la plateforme (Total assuré, nombre de groupes, taux de satisfaction, cagnotte globale).
   - Arguments clés (Transparence vs Assurance traditionnelle, Économies, Contrôle communautaire).
   - Témoignages et cas d'usage (Auto, Santé, Matériel, Petits risques).
   - Section FAQ interactive et Footer.
2. **Comment ça marche (`/how-it-works`) :**
   - Parcours en 3 à 4 étapes visuelles (1. Rejoint un groupe -> 2. Cotise à la cagnotte -> 3. Couvert en cas d'imprévu -> 4. Récupère le surplus).
   - Comparatif visuel : Assurance Traditionnelle vs Assurance Mutuelle P2P.
3. **Fonctionnalités (`/features`) :**
   - Focus détaillé sur la sécurité, la transparence des cagnottes, la gestion automatisée des sinistres et les paiements Stripe.

#### B. Auth & Onboarding
4. **Authentification (`/auth` ou Modale) :**
   - Inscription / Connexion (Email/Mot de passe, OAuth Social).
   - Sélection du rôle au départ ou après inscription.
5. **Onboarding / Profil de Risque (`/onboarding`) :**
   - Questionnaire étape par étape (Step-by-step form) pour évaluer le profil de risque de l'utilisateur et lui recommander les meilleurs groupes.

#### C. Espace Utilisateur Membre
6. **Dashboard Général (`/dashboard`) :**
   - Synthèse personnelle : Groupes actifs, statut des cotisations, cagnotte cumulée, sinistres en cours, alertes KYC.
   - Raccourcis rapides : Déclarer un sinistre, Payer sa cotisation, Explorer de nouveaux groupes.
   - Graphique d'évolution des cotisations / économies réalisées.
7. **Profil & Vérification KYC (`/profile` & `/kyc`) :**
   - Informations personnelles et sécurité du compte.
   - **Module KYC (Know Your Customer) :** Formulaire de dépôt de pièces d'identité (Carte d'identité, justificatif de domicile, selfie de vérification). Badge d'état visuel (`Vérifié`, `En attente`, `Rejeté`).
8. **Explorateur de Groupes (`/groups`) :**
   - Liste/Grille des groupes de mutualisation disponibles avec filtres par catégorie de risque, montant de cotisation, nombre de membres.
   - Bouton d'action rapide pour faire une demande d'adhésion ou créer un nouveau groupe.
9. **Détail d'un Groupe / Pool Dashboard (`/groups/:id`) :**
   - **En-tête :** Nom du groupe, règle de couverture, badge de risque.
   - **Cagnotte commune (Pot commun) :** Solde actuel, jauge d'objectif, historique des entrées/sorties.
   - **Paiements / Cotisation :** Modal d'intégration Stripe (`StripePaymentModal.jsx`) pour régler sa cotisation mensuelle ou ponctuelle.
   - **Liste des membres :** Rôles (Admin, Membres), statuts de paiement.
   - **Historique des Sinistres du groupe :** Sinistres soumis, validés ou rejetés.
10. **Gestion des Sinistres (`/claims` & `/claims/new`) :**
    - Formulaire de déclaration de sinistre (Description, montant demandé, date, téléversement des pièces justificatives/photos).
    - Suivi en temps réel de l'état d'un sinistre (Soumis, En cours de vote, Approuvé, Déboursé).

#### D. Espaces d'Administration (Rôles Dédiés)
11. **Dashboard Admin de Groupe (`/groups/:id/admin` ou vue intégrée) :**
    - Gestion des demandes d'adhésion en attente (Accepter / Refuser).
    - Validation et arbitrage des sinistres soumis par les membres du groupe.
    - Configuration des règles du groupe et des cotisations.
12. **Dashboard Admin Plateforme (`/admin/dashboard` & `/admin/kyc`) :**
    - Vue d'ensemble système : Nombre total d'utilisateurs, cagnottes globales, volume de sinistres.
    - **Gestion KYC Globale (`/admin/kyc`) :** Interface de validation des documents d'identité soumis par les utilisateurs (Visualisation des pièces, Approuver, Rejeter avec motif).
    - **Logs d'Audit (`Audit Logs`) :** Historique des événements clés du système (Événements Kafka/Audit backend).

---

### 4. DIRECTIVES D'ESTHÉTIQUE & DESIGN SYSTEM

- **Univers Visuel :** Premium, Moderne, Rassurer (Finance/Assurance Tech moderne type Revolut, Wise, Alan, Stripe).
- **Thème de couleurs :**
  - **Dark Mode Luxury ou Light Clean Minimalist** (Fond sombre élégant avec accents dorés/champagne `#C8A96E` ou Bleu Finance `#0F172A` / `#2563EB`).
  - Palette sémantique claire pour les statuts : Vert (Vérifié / Approuvé), Orange (En attente / Modéré), Rouge (Rejeté / Sinistre).
- **Typographie :** Polices modernes et lisibles (ex: *Inter*, *Outfit*, *Plus Jakarta Sans*).
- **UI Components :**
  - Cartes avec effet de survol (Hover scale, subtle glow).
  - Modales d'action claires avec animations fluides (`AnimatePresence`).
  - Badges de statut très visuels et indicateurs de progression/gauges.
  - Squelettes de chargement (Skeleton loaders) et états vides (Empty states) soignés.

---

### 5. OBJECTIFS ET CONSIGNES POUR LA REFONTE DU FRONT-END

1. **Expérience Utilisateur (UX) Fluide :** Réduire la complexité des concepts financiers et de mutuelle. L'interface doit rendre la création de groupe et la cotisation en 1 clic.
2. **Composants Réutilisables & Clean Code :** Structurer le code en composants modulaires (Buttons, Modals, Cards, Badges, Tables, Inputs, Charts).
3. **Responsivité Parfaite :** Mobile-First (l'application doit être parfaite sur smartphone comme sur grand écran).
4. **Interactivité & Dynamic Feedback :** Micro-interactions sur les boutons, retours visuels instantanés lors de la soumission de formulaires ou de paiements Stripe.
