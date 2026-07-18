# Conventions du projet — à valider ensemble avant de commencer

## 1. Contrat Kafka
Voir `infra/kafka/events.md` — source de vérité de tous les schémas d'events.

## 2. Structure de dossiers
Chaque module métier suit le pattern :
  router.py -> service.py -> repository.py -> models.py -> events.py

## 3. Authentification
JWT émis par le module users_kyc (Personne A).
Dépendances partagées dans app/core/auth.py : get_current_user(), require_role().

## 4. Répartition des modules
- Personne A : users_kyc, groups, cagnotte
- Personne B : claims, notifications, audit, ai/*

## 5. Base de données
Un seul schéma (infra/init.sql), versionné sur Git.
Chacun fait tourner sa propre instance locale via docker-compose.yml.
