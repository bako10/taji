# Taji — Contexte projet pour Claude Code

## Ce qu'est Taji

Application SaaS de gestion de stations-service pour le Mali. Cœur métier : la **réconciliation quotidienne pompes / cuves / caisse** qui révèle les écarts (litres et FCFA) — coulage, fraude, erreurs — que la gestion au cahier ne voit pas. Prix à la pompe fixés par l'État au Mali : la rentabilité d'une station se joue sur le contrôle des pertes et la marge nette, c'est l'argument de vente du produit.

Porteur : Sangaré Bakary (propriétaire du projet, non-développeur professionnel — expliquer les choix techniques simplement). Premiers clients : propriétaires de stations déjà identifiés à Bamako, mix mono et multi-stations. Phase actuelle : **pilote terrain**.

## État actuel (vérifié le 6 août 2026)

- **App en production** : PWA monofichier (`index.html`, JS vanilla) déployée sur GitHub Pages → https://bako10.github.io/taji/ — manifest, service worker (`sw.js`), icônes. Dépôt : `github.com/bako10/taji` (public).
- **Base Supabase** : projet `taji` (ref `ayvmfcttcondxvfpdiok`, eu-west-2), URL `https://ayvmfcttcondxvfpdiok.supabase.co`, clé publishable `sb_publishable_WEoGK95LS8IXeNoZyV9Sng_Vnjukyd-` (publique par conception). Migrations 001→007 appliquées et versionnées dans `supabase/migrations/`. Données réelles du porteur présentes (1 org, 1 station, clôtures) — ne plus considérer la base comme jetable sans lui demander.
- Le projet Supabase voisin « bako10's Project » héberge une AUTRE application (Ciwara) — **ne jamais y toucher**.

## Décision de trajectoire (assumée — 6 août 2026)

**La refonte React + TypeScript + Vite + Tailwind est lancée MAINTENANT.** La PWA vanilla actuelle est **gelée** : elle reste en ligne (GitHub Pages) pour les démos jusqu'à parité de la v2, mais on n'y ajoute plus de fonctionnalités — corrections de bugs critiques uniquement. Cible v2 : mêmes écrans et mêmes calculs, déployée sur **Vercel**, même base Supabase. Contrainte : la PWA actuelle doit rester accessible sans interruption jusqu'à la bascule. À parité validée par le porteur : bascule, et option dépôt privé (Vercel n'exige pas un dépôt public).

**La base n'est plus jetable** : elle contient les vraies données du porteur (org, station, clôtures). Toute évolution = migration additive versionnée ; toute opération destructive = demander d'abord.

## Modèle de données (résumé — la vérité est dans les migrations)

`organizations` (1 propriétaire) → `stations` → `tanks` (cuves, par produit) → `nozzles` (pistolets, index initial). `station_members` (+ `invites` par code) rattachent gérants **et pompistes** (migration 007). `prices` historisés par org/produit/date, avec **prix d'achat** `buy_price_fcfa` (006) pour la marge. Saisie quotidienne : `nozzle_readings` (index, pompiste optionnel via `staff`), `tank_dips`, `deliveries` (facturé vs reçu), `cash_entries` (especes / orange_money / moov_money / credit → `credit_clients`), `credit_payments`, **`expenses`** (dépenses du jour par catégorie, 006). `day_closures` fige la journée (summary jsonb) ; `audit_log` trace clôtures/réouvertures.

## Logique métier — invariante, testée

Par station, jour et produit :
- Ventes (L) = Σ (index fermeture − index ouverture) des pistolets
- Écart cuve (L) = jauge réelle − (stock précédent + livraisons − ventes), avec rattrapage des jours non jaugés
- CA théorique = ventes × prix de vente en vigueur à la date (prix historisés)
- Écart caisse = total encaissé − CA théorique
- Marge brute = ventes × (prix de vente − prix d'achat) ; **marge nette = marge brute − dépenses du jour** (006)
- Statut : conforme si |écart caisse| ≤ 0,5 % du CA et |écart cuve| ≤ 0,5 % des ventes ; à surveiller jusqu'à 1,5 % / 2 % ; écart important au-delà

Règles d'or : une journée clôturée est **verrouillée par la base** (policies RLS, pas seulement l'UI) ; seul le propriétaire rouvre (tracé dans `audit_log`). Un membre peut supprimer **ses propres saisies** avant clôture (007). Isolation totale entre organisations. Un gérant ne voit que sa station.

## Pièges connus (payés cher — ne pas les repayer)

1. **INSERT … RETURNING vs policies SELECT** : une policy SELECT dépendant d'une sous-requête sur la même table ne voit pas la ligne insérée dans la même commande → « new row violates row-level security ». Toujours un prédicat direct (ex. `owner_id = auth.uid()`) en plus de la sous-requête. Corrigé en migration 004 — préserver.
2. **Jeton d'auth perdu selon l'environnement** (Safari + fichier local) : l'app force le header Authorization sur chaque requête REST (`authFetch` dans index.html). Ne pas retirer ce mécanisme.
3. **Auto-confirmation d'email** (003, trigger sur `auth.users`) : temporaire, à retirer seulement quand un SMTP sera branché — sinon les inscriptions cassent.
4. Politiques RLS permissives = combinées en **OU** : ajouter une policy élargit l'accès, ne le restreint jamais (cf. 007).

## Sécurité & confidentialité

- Le dépôt est **public** (exigence GitHub Pages gratuit) : n'y committer AUCUN document business (études, tarifs, stratégie — le dossier `docs/` doit rester hors Git), aucun secret autre que la clé publishable.
- Toute évolution de schéma = nouvelle migration versionnée dans `supabase/migrations/`, appliquée via MCP Supabase, jamais de modif manuelle non versionnée.
- Après chaque migration : tester les policies en SQL (simulation `request.jwt.claims` : propriétaire, gérant, pompiste, intrus) et lancer les advisors Supabase.

## Principes UX — non négociables

Mobile-first (Android entrée de gamme, écran 5-6"), français simple, gros boutons, une action par écran côté gérant/pompiste, saisie du jour ≤ 5 minutes. FCFA sans décimales, format `fr-FR`. Fonctionne en 3G ; PWA installable. Thème clair/sombre. Le gérant peu à l'aise avec le numérique est l'utilisateur de référence. Messages d'erreur en français, actionnables.

## Feuille de route

1. **Refonte React/TS/Vite/Tailwind → parité avec la PWA** (en cours — priorité absolue), déploiement Vercel
2. Bascule v2 + option dépôt privé ; la PWA legacy est archivée
3. Offline réel : file de synchronisation des saisies (PWA v2)
4. Envoi automatique du rapport quotidien via API WhatsApp Business
5. Photos horodatées des index (preuve anti-fraude)
6. Alertes (seuils d'écart, stock bas, plafond crédit dépassé)
7. Module boutique & lubrifiants
