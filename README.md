# ⛽ Taji — Gestion de stations-service

**Taji** (« essence » en bambara) est une application de gestion pour propriétaires et gérants de stations-service au Mali. Son cœur : la **réconciliation quotidienne pompes / cuves / caisse**, qui fait apparaître chaque jour les écarts en litres et en FCFA.

## Fonctionnalités

- **Saisie du jour** (gérant) : index des pompes (ouverture/fermeture), jaugeage des cuves, livraisons (volume facturé vs reçu), encaissements par mode (espèces, Orange Money, Moov Money, crédits clients), dépenses du jour
- **Clôture quotidienne** : calcul automatique des écarts (cuve et caisse), rapport figé, partage WhatsApp (partage natif) et export PDF, réouverture réservée au propriétaire
- **Marge nette quotidienne** : prix d'achat historisé par produit + dépenses → marge brute carburant et marge nette (CA réel − achats − dépenses), au rapport, au dashboard et aux rapports mensuels
- **Tableau de bord propriétaire** : vue multi-stations, statut conforme / à surveiller / écart important, marge nette agrégée, tendance 14 jours
- **Application installable & hors-ligne (PWA)** : icône sur l'écran d'accueil, ouverture plein écran, chargement même sans réseau ; les saisies faites hors-ligne sont gardées sur l'appareil et synchronisées automatiquement au retour du réseau
- **Crédits clients B2B** : comptes clients, plafonds (alerte dépassement), encours, remboursements
- **Équipe & quarts** : pompistes par pistolet, litres servis par personne
- **Rapports mensuels** : synthèses par station, marge nette, exports CSV pour le comptable
- **Multi-utilisateurs sécurisé** : propriétaire / gérants par code d'invitation, isolation stricte par organisation (RLS PostgreSQL), journal d'audit

## Architecture

- **Front-end** : `index.html` — application monofichier (vanilla JS), mobile-first, français, clair/sombre automatique
- **PWA** : `manifest.webmanifest`, `sw.js` (coquille hors-ligne), `icons/` ; couche hors-ligne côté page (cache des lectures + file d'écritures rejouée) — installable sur Android/iPhone
- **Back-end** : [Supabase](https://supabase.com) (PostgreSQL + Auth + API REST), schéma dans `supabase/migrations/`
- **Sécurité** : Row Level Security sur toutes les tables ; les journées clôturées sont verrouillées côté base, pas seulement côté interface

## Positionnement

Face au concurrent **StationPlus** (Maroc/France, connexion Internet obligatoire, MAD/EUR), Taji se différencie sur le terrain ouest-africain : **fonctionne hors-ligne**, **Mobile Money (Orange/Moov)** natif, **FCFA**, et **marge nette quotidienne** (l'argument commercial principal de StationPlus, désormais couvert).

## Démarrage

1. Créer un projet Supabase et appliquer les migrations de `supabase/migrations/` dans l'ordre.
2. Dans `index.html`, renseigner `SUPABASE_URL` et `SUPABASE_KEY` (clé *publishable*).
3. Ouvrir `index.html` dans un navigateur (ou le déployer sur Vercel / Netlify / tout hébergeur statique).
4. Créer le compte propriétaire, suivre l'assistant (organisation → station → cuves → pistolets → prix).
5. Générer un code d'invitation par gérant (Réglages → station), à saisir par le gérant à son inscription.

## Feuille de route

- [x] Mode hors-connexion complet (PWA + file de synchronisation)
- [x] Marge nette quotidienne + suivi des dépenses
- [x] Partage WhatsApp (natif) et export PDF des rapports
- [ ] Envoi *automatique* du rapport quotidien via l'API WhatsApp Business
- [ ] Photos horodatées des index (preuve) — nécessite Supabase Storage
- [ ] Module boutique & lubrifiants
- [ ] Import de données au démarrage (clients + soldes, produits + stock)
- [ ] Notifications d'alerte push (stock bas ; le dépassement de plafond crédit est déjà signalé)
- [ ] Application pompiste par quart

## Notes

- Les prix à la pompe sont historisés : les rapports passés conservent le prix en vigueur à leur date.
- L'auto-confirmation d'email (migration 003) est temporaire — la retirer une fois un fournisseur SMTP configuré.
- Projet démarré en août 2026. Étude d'opportunité et cahier des charges dans `docs/`.
