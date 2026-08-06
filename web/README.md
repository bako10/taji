# Taji v2 — application React (refonte)

Refonte de la PWA `index.html` (racine du dépôt) en **React + TypeScript + Vite + Tailwind**.
La PWA v1 reste en ligne (GitHub Pages) jusqu'à la bascule. Même base Supabase (projet `taji`).

## Développement local

```bash
cd web
cp .env.example .env      # renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (clé publishable)
npm install
npm run dev               # http://localhost:5173
```

Autres commandes : `npm run build` (typecheck + build), `npm run preview`, `npm test`
(test numérique de la réconciliation), `npm run lint`.

## Déploiement Vercel

1. Sur vercel.com → **Add New Project** → importer le dépôt GitHub `bako10/taji`.
2. **Root Directory** : `web` (important — l'app n'est pas à la racine).
3. Framework détecté : **Vite**. Build `npm run build`, output `dist` (auto).
4. **Environment Variables** (Settings → Environment Variables) :
   - `VITE_SUPABASE_URL` = `https://ayvmfcttcondxvfpdiok.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clé *publishable* (voir `.env.example`)
5. Déployer. `vercel.json` gère déjà le routage SPA (deep links).

Le fichier `.env` réel n'est jamais committé (ignoré). La clé publishable est publique par
conception — la sécurité repose sur les policies RLS de la base.

## Structure

- `src/lib/` — client Supabase, types générés, format fr-FR, prix, **reconcile** (calcul pur testé)
- `src/context/Session.tsx` — auth + contexte (profil, orgs, stations, membres, prix) + rôles
- `src/pages/` — auth, onboarding, saisie, historique, crédits, équipe, rapports, réglages
- `src/components/` — coquille, UI, carte de rapport
