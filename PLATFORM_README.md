# 🌊 Master Waves — Plateforme de livraison

Application de livraison à domicile (type Glovo) en **modèle plateforme** :
les restaurants sont des partenaires, les livreurs appartiennent à la société de livraison.

## Architecture

| Composant | Dossier | Techno |
|---|---|---|
| Backend API + Portail partenaire + Admin | `platform/` | Next.js (Vercel) |
| Base de données | Turso (SQLite cloud) | `@libsql/client` |
| App mobile Client | `mobile/client-app/` | React Native (Expo) |
| App mobile Livreur / Gérant | `mobile/driver-app/` | React Native (Expo) |
| Temps réel (GPS, notifs) | — | Pusher |
| Cartes & navigation | — | Google Maps |

## Rôles

- **admin** : gère les restaurants partenaires (portail web `/admin`).
- **restaurant** : gère son menu, horaires, profil ; valide les commandes (portail web `/partner`).
- **manager (gérant)** : reçoit les commandes, fixe le prix de livraison, dispatche aux livreurs, suit les livreurs sur carte, crée des commandes téléphoniques, annulation totale (app mobile Pro).
- **driver (livreur)** : gère plusieurs livraisons à la fois, partage sa position GPS (app mobile Pro).
- **client** : commande, suit en temps réel, note (app mobile Client).

## Flux d'une commande

1. Le **client** commande → statut `pending_restaurant`.
2. Le **restaurant** valide → `preparing` (le gérant voit la commande mais ne peut agir qu'à cette étape).
3. Le **gérant** fixe le prix de livraison (10–50 DH) et assigne un livreur → `driver_assigned`.
4. Le **livreur** : `going_to_restaurant` → `picked_up` → `delivering` → `delivered`.
5. Le **client** suit la position du livreur en temps réel et note après livraison.

**Commande téléphonique** : le gérant crée directement la commande en `preparing`.

### Règles d'annulation
- **Client** : seulement avant préparation (`pending_restaurant`). Ensuite → appeler le service.
- **Restaurant** : seulement avant d'avoir validé.
- **Gérant** : à n'importe quelle étape (pouvoir total).

## Démarrage — Backend (`platform/`)

```bash
cd platform
cp .env.example .env          # remplir Turso, JWT, Pusher, Google Maps, Cloudinary
npm install
npm run db:init               # crée les tables (local: db/local.db)
npm run db:seed               # comptes + données de démo
npm run dev                   # http://localhost:3000
```

Comptes de démo (mot de passe = `<role>123`) :
`admin@`, `manager@`, `driver@`, `resto@`, `client@masterwaves.ma`.

### Base de données : Turso
```bash
# Installer la CLI turso, puis :
turso db create masterwaves
turso db show masterwaves --url        # → TURSO_DATABASE_URL
turso db tokens create masterwaves     # → TURSO_AUTH_TOKEN
```
En local sans Turso, l'app utilise `file:./db/local.db`.

### Déploiement Vercel
1. Importer le dossier `platform/` sur Vercel.
2. Renseigner les variables d'environnement (voir `.env.example`).
3. `npm run db:init` / `db:seed` une fois contre la base Turso de prod.

## Démarrage — Apps mobiles

```bash
cd mobile/client-app   # (ou mobile/driver-app)
npm install
npx expo start
```
- Régler `extra.apiBaseUrl` dans `app.json` :
  - Émulateur Android : `http://10.0.2.2:3000/api`
  - Appareil physique : `http://<IP-de-votre-PC>:3000/api`
  - Production : `https://votre-app.vercel.app/api`
- Mettre votre clé Google Maps dans `app.json` (`android.config.googleMaps.apiKey`).

## Import CSV de produits
Depuis le portail partenaire (onglet *Import CSV*). Colonnes :
```
name,description,price,category
Pizza Reine,Champignons jambon,65,Pizzas
```
Les catégories manquantes sont créées automatiquement.

## Paiement
- **Espèces à la livraison** : actif par défaut.
- **CMI** (recommandé pour le Maroc) : champ `payment_method = 'cmi'` prévu en base ;
  brancher le SDK CMI sur le checkout pour finaliser (hors périmètre MVP).
