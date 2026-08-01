Rôle : Tu es un Tech Lead Front-End et un designer UX/UI d'exception. Ton but est de concevoir le code d'une interface front-end moderne, interactive et hautement esthétique pour une plateforme d'assurance collaborative et de cagnottes d'entraide (Insurance & Mutual Aid Platform).

### 1. STACK TECHNIQUE ET CONFIGURATION
- Framework : React.js (avec Vite) ou Next.js (App Router).
- Langage : TypeScript (typage strict pour toutes les props et données).
- Styling : Tailwind CSS (avec des classes modernes et arbitraires si nécessaire).
- Icônes : Lucide-react (importations propres).
- Composants de base : Utilise des balises sémantiques HTML5 (header, main, aside, section, article).

### 2. CHARTE GRAPHIQUE ET IDENTITÉ VISUELLE (Design Premium)
- Thème : Dark Mode Premium et épuré.
- Palette de couleurs (HSL ou Hex) :
  - Background principal : Noir de jais / Ardoise très sombre (ex: #0B0F19 ou slate-950)
  - Cartes/Containers : Gris bleuté sombre avec bordure subtile (ex: slate-900 avec bordure slate-800/50)
  - Couleur primaire (Actions) : Violet électrique ou Bleu Indigo vibrant (ex: indigo-500, #6366F1)
  - Couleur secondaire (Succès/Validations) : Vert émeraude brillant (ex: emerald-500, #10B981)
  - Accents/Alertes : Orange ambré (ex: amber-500) ou Rose magenta pour les cagnottes.
- Effets visuels : 
  - Glassmorphism discret (backdrop-blur-md, bg-white/5, border-white/10) pour la barre latérale et les modales.
  - Ombres portées douces (shadow-2xl, shadow-indigo-500/5).
  - Micro-animations de transition (transition-all duration-300 ease-in-out) sur le hover des boutons, liens de navigation et cartes.

### 3. ARCHITECTURE ET NAVIGATION (Layout)
L'application doit utiliser un layout global avec :
- Une Sidebar (Barre latérale) gauche fixe contenant :
  - Logo de la marque ("SecureMutual")
  - Liens de navigation : Tableau de bord, Groupes d'entraide, Cagnottes (Pots), Profil & KYC, Notifications (avec badge rouge).
  - Profil utilisateur rapide en bas avec nom, avatar et statut.
- Un Header supérieur contenant :
  - Barre de recherche globale.
  - Icône de notifications (cliquable, ouvrant un menu déroulant).
  - Sélecteur de langue ou bouton de déconnexion.
- Une Zone de Contenu Principal (Main Content) responsive (grille fluide changeant de 1 colonne sur mobile à 3 colonnes sur grand écran).

### 4. MODULES ET VUES À IMPLÉMENTER

#### A. Tableau de Bord (Dashboard)
- 3 cartes de statistiques clés en haut : 
  - Total des cotisations (montant en €)
  - Statut de l'assurance active (ex: "Protégé" avec badge vert)
  - Nombre de groupes rejoints
- Un graphique interactif simplifié (SVG ou barres CSS de progression animées) montrant l'évolution des cagnottes de secours.
- Section "Activité Récente" avec une liste d'historique (ex: "Cotisation payée", "Nouveau membre dans le groupe X").

#### B. Gestion des Groupes & Cagnottes (Groups & Cagnottes)
- Une vue en grille (Grid Layout) affichant les groupes actifs. Chaque carte de groupe doit afficher :
  - Nom du groupe, nombre de membres actifs, objectif de la cagnotte (ex : "Fonds d'urgence santé").
  - Barre de progression (%) vers l'objectif financier.
  - Bouton dynamique "Contribuer" (qui ouvre une modale interactive pour saisir un montant).

#### C. Espace KYC & Profil (Identity Verification)
- Un panneau de statut KYC clair (ex: "En attente de vérification", "Vérifié", ou "Action requise").
- Une zone de dépôt de fichiers (Drag & Drop) stylisée pour téléverser une pièce d'identité (carte d'identité, passeport).
- Les champs du formulaire de profil (Nom complet, Adresse, Date de naissance) avec états de focus colorés et validation visuelle.

#### D. Centre de Notifications (Interactive Toast & List)
- Une liste de notifications récentes (système d'alertes) avec différents types :
  - `info` (bleu) : Notification système ou mise à jour.
  - `warning` (orange) : KYC expiré ou document manquant.
  - `success` (vert) : Contribution validée ou cagnotte atteinte.
- Chaque notification doit avoir un bouton de fermeture (croix) fonctionnel en React (gestion d'état locale).

### 5. CODE ET RÈGLES DE PRODUCTION EXIGÉES
- Aucun placeholder, aucun commentaire du type `// Ajouter le reste du code ici`. Fournis le code complet.
- Crée des données fictives réalistes (Mock Data) directement intégrées dans le fichier pour simuler les requêtes d'API (par exemple, un tableau de notifications, un tableau de groupes d'assurance).
- Le code doit être structuré de manière modulaire (ex: composants séparés comme `Sidebar.tsx`, `Dashboard.tsx`, `KycUpload.tsx`, `CagnotteCard.tsx` réunis dans un point d'entrée principal).
- Utilise des hooks React standard (`useState`, `useEffect`) pour rendre l'interface interactive :
  - Le clic sur les onglets de la Sidebar change le contenu affiché dans la zone principale.
  - Le clic sur "Contribuer" incrémente réellement la jauge de progression de la cagnotte.
  - Le bouton de suppression d'une notification l'efface de la liste en temps réel.
