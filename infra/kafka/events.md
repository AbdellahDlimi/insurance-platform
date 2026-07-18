# Contrat des topics Kafka — Plateforme Assurance Collaborative P2P

Ce fichier est la **source de vérité** du format des events. Toute modification
doit être discutée à deux avant d'être appliquée, car elle impacte le
producteur ET le(s) consommateur(s).

## Convention générale

- Nommage : `<entite>.<action>` (participe passé), minuscules, séparateur point.
- Chaque event contient une enveloppe commune :

```json
{
  "event_id": "uuid",
  "event_type": "nom.du.topic",
  "version": "1.0",
  "occurred_at": "2026-07-18T10:32:00Z",
  "payload": { }
}
```

- `version` permet de faire évoluer un schéma sans casser les consommateurs
  déjà en prod (ajout de champ = pas de bump de version majeure ; suppression
  ou renommage de champ = bump obligatoire + discussion à deux).

---

## 1. `user.kyc_verified`
**Producteur :** Personne A (module Utilisateurs/KYC)
**Consommateurs :** Personne B (Notifications)

```json
{
  "event_id": "uuid",
  "event_type": "user.kyc_verified",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "utilisateur_id": "uuid",
    "statut": "verified | manual_review_approved",
    "verifie_le": "iso8601"
  }
}
```

---

## 2. `adhesion.requested`
**Producteur :** Personne A (Groupes/Adhésions)
**Consommateurs :** Personne B (Notifications)

```json
{
  "event_id": "uuid",
  "event_type": "adhesion.requested",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "demande_adhesion_id": "uuid",
    "utilisateur_id": "uuid",
    "groupe_id": "uuid",
    "score_compatibilite": 0.87
  }
}
```

---

## 3. `adhesion.validated`
**Producteur :** Personne A (Groupes/Adhésions)
**Consommateurs :** Personne B (Notifications, Analyse réseau)

```json
{
  "event_id": "uuid",
  "event_type": "adhesion.validated",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "adhesion_id": "uuid",
    "utilisateur_id": "uuid",
    "groupe_id": "uuid",
    "valide_par_admin_id": "uuid",
    "statut": "acceptee | refusee"
  }
}
```

---

## 4. `cotisation.recalculated`
**Producteur :** Personne A (Cagnotte/Bonus-Malus — job planifié)
**Consommateurs :** Personne B (Notifications)

```json
{
  "event_id": "uuid",
  "event_type": "cotisation.recalculated",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "adhesion_id": "uuid",
    "utilisateur_id": "uuid",
    "groupe_id": "uuid",
    "ancien_coefficient": 1.10,
    "nouveau_coefficient": 1.05,
    "montant_final": 42.50,
    "periode": "2026-08"
  }
}
```

---

## 5. `claim.created`
**Producteur :** Personne B (Sinistres/Litiges)
**Consommateurs :** Personne B (Chien de Garde, Analyseur de preuves, Analyse réseau — via Kafka même si même personne, pour rester découplé)

```json
{
  "event_id": "uuid",
  "event_type": "claim.created",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "sinistre_id": "uuid",
    "adhesion_id": "uuid",
    "groupe_id": "uuid",
    "utilisateur_id": "uuid",
    "montant_declare": 1250.00,
    "description": "texte libre"
  }
}
```

---

## 6. `fraud.alert.raised`
**Producteur :** Personne B (Chien de Garde — Isolation Forest)
**Consommateurs :** Personne B (Notifications, Audit)

```json
{
  "event_id": "uuid",
  "event_type": "fraud.alert.raised",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "alerte_id": "uuid",
    "sinistre_id": "uuid",
    "score": 0.82,
    "niveau_severite": "faible | moyen | eleve",
    "explication_ia": "texte généré par le module Explainable AI"
  }
}
```

---

## 7. `claim.validated`
**Producteur :** Personne B (Sinistres/Litiges — décision admin)
**Consommateurs :** Personne A (Cagnotte/Bonus-Malus — déclenche le malus), Personne B (Notifications)

⚠️ **Event le plus critique du projet** — point d'intégration direct entre A et B.

```json
{
  "event_id": "uuid",
  "event_type": "claim.validated",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "sinistre_id": "uuid",
    "adhesion_id": "uuid",
    "groupe_id": "uuid",
    "utilisateur_id": "uuid",
    "valide_par_admin_id": "uuid",
    "montant_declare": 1250.00,
    "montant_approuve": 1200.00,
    "score_fraude_a_la_decision": 0.12
  }
}
```

---

## 8. `claim.rejected`
**Producteur :** Personne B (Sinistres/Litiges — décision admin)
**Consommateurs :** Personne B (Notifications)

```json
{
  "event_id": "uuid",
  "event_type": "claim.rejected",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "sinistre_id": "uuid",
    "adhesion_id": "uuid",
    "groupe_id": "uuid",
    "utilisateur_id": "uuid",
    "rejete_par_admin_id": "uuid",
    "motif": "texte libre"
  }
}
```

---

## 9. `anonymity.lift.requested` / `anonymity.lift.approved`
**Producteur :** Personne B (Audit)
**Consommateurs :** Personne B (Audit — trace), Personne A (Utilisateurs/KYC — déchiffrement via KMS)

```json
{
  "event_id": "uuid",
  "event_type": "anonymity.lift.requested",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "demande_levee_id": "uuid",
    "sinistre_id": "uuid",
    "utilisateur_cible_id": "uuid",
    "groupe_id": "uuid",
    "demande_par_admin_id": "uuid",
    "justification_legale": "texte libre"
  }
}
```

```json
{
  "event_id": "uuid",
  "event_type": "anonymity.lift.approved",
  "version": "1.0",
  "occurred_at": "iso8601",
  "payload": {
    "demande_levee_id": "uuid",
    "valide_par_agent_id": "uuid",
    "date_execution": "iso8601"
  }
}
```

---

## Récapitulatif des topics

| Topic | Producteur | Consommateur(s) |
|---|---|---|
| `user.kyc_verified` | A | B (Notifications) |
| `adhesion.requested` | A | B (Notifications) |
| `adhesion.validated` | A | B (Notifications, Analyse réseau) |
| `cotisation.recalculated` | A | B (Notifications) |
| `claim.created` | B | B (Chien de Garde, Analyseur preuves, Analyse réseau) |
| `fraud.alert.raised` | B | B (Notifications, Audit) |
| `claim.validated` | B | **A (Cagnotte)**, B (Notifications) |
| `claim.rejected` | B | B (Notifications) |
| `anonymity.lift.requested` | B | B (Audit) |
| `anonymity.lift.approved` | B | **A (Utilisateurs/KYC)**, B (Audit) |
