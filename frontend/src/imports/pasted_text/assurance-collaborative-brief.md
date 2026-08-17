# Brief de design — Frontend Plateforme Assurance Collaborative P2P

## 1. Le produit, en une phrase et son âme

Une plateforme où des inconnus pseudonymisés forment de petits cercles de
confiance mutuelle par affinité (cyclistes, possesseurs de smartphones,
etc.), cotisent dans une cagnotte commune, et se remboursent entre eux
sans assureur traditionnel — avec une IA qui surveille discrètement en
fond, sans jamais décider à la place des humains.

**Ce n'est PAS** : une appli fintech froide et corporate, un dashboard SaaS
générique, ni un site "assurance" classique avec des photos de familles
souriantes et du bleu corporate.

**C'est** : un cercle. Une caisse commune entre pairs qui se font confiance
sans se connaître. L'identité visuelle doit évoquer la **mutualisation**,
le **cercle de confiance**, et la **transparence sous pseudonyme** — pas
la bureaucratie assurantielle.

---

## 2. Direction visuelle — à explorer, pas à copier un pattern par défaut

Refuse les 3 patterns par défaut de l'IA générative (fond crème + serif +
terracotta ; fond noir + un seul accent acide ; layout journal à hairlines).
À la place, pars de la vraie matière du sujet : **le cercle, la cotisation
mutuelle, le pseudonyme**.

Piste à explorer (à valider/ajuster par ton propre jugement de design, pas
à suivre au pixel près) : une identité construite autour du **cercle comme
motif structurel** — pas juste des coins arrondis, mais des anneaux
concentriques, des jauges circulaires pour visualiser la cagnotte et le
coefficient bonus-malus, des avatars pseudonymisés disposés en cercle
pour représenter un groupe. Une palette qui évoque la confiance sobre
plutôt que le corporate : penser à des teintes profondes (bleu nuit,
vert forêt) associées à un accent chaud unique qui marque les moments
de mutualisation (validation d'un sinistre, versement dans la cagnotte).

Construis ton propre système de tokens (4-6 couleurs nommées en hex,
2-3 typographies avec rôles distincts, un concept de layout, UN élément
signature mémorable) avant de commencer à produire des écrans — et
confronte ce système au brief avant de continuer, en te demandant s'il
serait le même pour n'importe quel autre produit fintech, ou s'il est
vraiment spécifique à CE produit-ci.

---

## 3. Logique métier complète (pour que chaque écran soit fonctionnellement juste)

### Rôles utilisateurs (déterminent ce que chaque écran doit montrer/cacher)
1. **`membre`** : soumet son KYC, rejoint des groupes, déclare des sinistres, paie ses cotisations
2. **`admin_groupe`** : créateur d'un groupe — valide/refuse les adhésions, valide/rejette les sinistres, demande une levée d'anonymat
3. **`equipe_conformite`** : consulte les logs d'audit, approuve les levées d'anonymat, voit les données KYC déchiffrées après approbation

### Principe transverse non négociable
**L'IA n'a jamais le dernier mot.** Tout score de fraude, toute alerte,
doit être présenté comme une aide à la décision pour l'admin/la conformité
— jamais comme un verdict automatique. Design-le comme tel : pas de gros
badge rouge "FRAUDE DÉTECTÉE", plutôt un signal discret avec explication
en langage clair, à côté d'un vrai bouton de décision humaine.

### Pseudonymisation
Les membres d'un groupe se voient sous des pseudonymes du type
`membre_482913` — jamais de vrai nom entre membres. Seule l'équipe
conformité, après une procédure de levée d'anonymat approuvée, voit le
nom réel. Ce contraste (anonyme partout, sauf ce moment précis et tracé)
est une opportunité de design forte : marque visuellement ce moment
comme exceptionnel.

---

## 4. Pages à concevoir, avec leur contenu fonctionnel exact

### A. Connexion & Inscription
- Formulaire email + mot de passe (register, login)
- Après inscription, l'utilisateur reçoit un pseudonyme généré
  automatiquement — c'est un bon moment pour une micro-interaction
  (révéler le pseudonyme comme un "tirage", pas juste l'afficher platement)

### B. Dashboard utilisateur (`membre`)
- Statut KYC : `pending` → `verified` → (ou `failed`/`manual_review`).
  Le KYC passe automatiquement à `verified` après ~5 secondes en dev
  (traitement asynchrone) — prévoir un état "en cours de vérification"
  avec polling ou notification, pas un simple spinner infini
- Mes groupes actifs (avec pseudonyme affiché pour ce groupe)
- Mes cotisations à payer, avec bouton "Payer" → `POST /cotisations/{id}/pay`
- Mes notifications (liste, marquer comme lues)

### C. Espace KYC
Formulaire : nom complet, date de naissance, numéro de document, type de
document, fournisseur (Veriff). Une fois soumis, montrer clairement que
ces données seront chiffrées et jamais visibles par les autres membres.

### D. Catalogue des groupes
- Liste des groupes ouverts, filtrable par spécialité
- Voir le détail d'un groupe avant de rejoindre (nom, spécialité,
  cotisation de base, capacité, buffer pool cible)
- Bouton "Créer un groupe" (devient `admin_groupe`)
- Bouton "Demander à rejoindre" (nécessite KYC `verified` — désactivé
  sinon, avec explication claire pourquoi)

### E. Détail d'un groupe (vue membre)
- Solde de la cagnotte + buffer pool — **occasion idéale pour une
  visualisation circulaire/jauge**, pas juste un chiffre
- Liste des autres membres, sous pseudonyme uniquement
- Déclaration de sinistre : description (min 10 caractères), montant,
  upload de pièce justificative
- Mon coefficient bonus-malus actuel, avec historique visuel (bonus =
  coefficient qui descend vers 0.50, malus = qui monte vers 2.0)

### F. Espace administration du groupe (vue `admin_groupe`)
- Demandes d'adhésion en attente → accepter/refuser
- Sinistres déclarés → valider (avec montant approuvé) ou rejeter
  (avec motif, min 5 caractères). Afficher le score de fraude et
  l'explication IA à côté, mais TOUJOURS avec l'admin qui doit cliquer
  activement — jamais de pré-remplissage suggérant une décision
- Bouton "Demander une levée d'anonymat" sur un membre suspect —
  action grave, doit avoir une friction volontaire dans le design
  (confirmation, justification légale obligatoire à saisir)

### G. Espace conformité (vue `equipe_conformite`)
- Logs d'audit (filtrable par type de cible, ID cible)
- Demandes de levée d'anonymat en attente → approuver
- Une fois approuvée, affichage des données KYC réelles déchiffrées —
  ce moment doit être visuellement distinct du reste de l'app (on sort
  de l'anonymat, le design doit le signaler sans ambiguïté)

---

## 5. Annuaire technique complet (pour que les states/erreurs soient réalistes)

- Auth : JWT Bearer token, header `Authorization: Bearer <token>`
- Rôles dans le payload : `membre` | `admin_groupe` | `equipe_conformite`
- Statuts KYC possibles : `pending`, `verified`, `failed`, `manual_review`
- Statuts sinistre : `en_attente`, `validee`, `rejetee`
- Statuts adhésion : `en_attente`, `acceptee`, `refusee`
- Montants : décimaux à 2 chiffres (12,2) — toujours afficher avec 2
  décimales et devise
- Coefficient bonus-malus : entre 0.50 (bonus max) et 2.0 (malus max),
  départ à 1.0

---

## 6. Ce que je te demande de produire

1. D'abord, ton plan de design compact (palette nommée en hex, typo avec
   rôles, concept de layout en wireframes ASCII, l'élément signature) —
   confronte-le au brief avant de continuer, dis-moi ce que tu changes
   et pourquoi si une partie ressemble à un défaut générique.
2. Puis les écrans prioritaires dans cet ordre : Dashboard membre →
   Détail d'un groupe (vue membre) → Espace admin (validation sinistre)
   → Espace conformité (levée d'anonymat).
3. Garde un système cohérent (composants réutilisables : carte de
   sinistre, badge de statut, jauge de cagnotte, avatar pseudonymisé)
   plutôt que des écrans redessinés isolément.
4. Reste responsive jusqu'au mobile, focus clavier visible, respecte
   `prefers-reduced-motion`.
5. Écris toi-même le contenu textuel (labels, messages d'erreur, états
   vides) dans un français clair, orienté utilisateur ("Payez votre
   cotisation" plutôt que "Exécuter la transaction de paiement"), jamais
   de lorem ipsum ni de jargon technique interne (jamais "webhook",
   "coefficient_actuel" tel quel, etc. — traduis en langage humain).