# NextLearn API v2

Backend REST API pour l'application NextLearn - Bibliothèque académique camerounaise.

**Note** : Cette version v2 conserve MongoDB (déjà configuré dans la v1) et réimplémente tous les modules avec une architecture Clean Architecture améliorée.

## Stack Technique

- **Runtime** : Node.js 20+
- **Framework** : Express.js
- **Base de données** : MongoDB avec Mongoose (configuré depuis v1)
- **Cache** : Redis (optionnel)
- **Stockage fichiers** : Cloudinary
- **Email** : SendGrid ou SMTP
- **Authentification** : JWT (Access + Refresh tokens)
- **Validation** : Zod
- **Documentation** : Swagger/OpenAPI

## Architecture

Architecture en couches (Clean Architecture) :

```
src/
├── config/              # Configuration (env, database, redis, swagger)
├── modules/             # Modules fonctionnels
│   ├── auth/            # Authentification (OTP + PIN)
│   ├── users/           # Gestion utilisateurs
│   ├── references/      # Référentiels (universités, filières, matières)
│   ├── documents/       # Documents PDF
│   ├── favorites/       # Favoris
│   ├── progress/        # Progression lecture
│   ├── offline/         # Téléchargements hors ligne
│   ├── epreuves/        # Annales d'examens
│   ├── quiz/            # Quiz et questions
│   ├── progression/     # Stats et gamification
│   ├── notifications/   # Notifications
│   └── sync/            # Synchronisation offline
├── infrastructure/      # Implémentations concrètes
│   ├── repositories/    # Repositories Mongoose
│   ├── mailer/          # SendGrid/SMTP
│   └── storage/         # Cloudinary
├── middleware/          # Middleware Express
├── shared/              # Utilitaires partagés
│   ├── errors/          # Erreurs custom
│   ├── http/            # Response helpers
│   └── utils/           # Pagination, etc.
├── models/              # Schémas Mongoose
└── seeds/               # Données initiales
```

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables d'environnement dans .env
```

## Configuration (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/nextlearn

# Redis (optionnel)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=votre-secret-key-min-32-caracteres
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary (stockage PDF)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# Email (SendGrid ou SMTP)
SENDGRID_API_KEY=votre_sendgrid_api_key
# OU
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=votre_email@example.com
SMTP_PASS=votre_password

# Firebase Cloud Messaging (optionnel)
FCM_PROJECT_ID=votre_project_id
```

## Scripts

```bash
# Développement avec hot-reload
npm run dev

# Compiler TypeScript
npm run build

# Démarrer en production
npm start

# Exécuter les tests
npm test

# Seed des données initiales
npm run seed
```

## Documentation API

Une fois le serveur démarré, accédez à la documentation Swagger :

- **Swagger UI** : http://localhost:5000/api-docs
- **OpenAPI JSON** : http://localhost:5000/api-docs.json

## Endpoints Principaux

### Authentification
- `POST /api/auth/register` - Inscription (email + infos + envoi OTP)
- `POST /api/auth/verify-otp` - Vérification OTP
- `POST /api/auth/setup-pin` - Configuration PIN
- `POST /api/auth/login` - Login avec PIN
- `POST /api/auth/refresh` - Rafraîchir access token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur

### Référentiels
- `GET /api/references/universites` - Liste universités
- `GET /api/references/filieres` - Liste filières
- `GET /api/references/matieres` - Liste matières

### Documents
- `GET /api/documents` - Liste documents (pagination, filtres)
- `GET /api/documents/:id` - Détail document
- `POST /api/documents/:id/view` - Incrémenter vues
- `POST /api/documents/:id/download` - Télécharger (URL signée)
- `POST /api/documents/:id/rate` - Noter document

### Favoris
- `GET /api/favorites` - Liste favoris
- `POST /api/favorites/:documentId` - Ajouter favori
- `DELETE /api/flavorites/:documentId` - Retirer favori

### Progression
- `GET /api/progress/lecture/:documentId` - Progression lecture
- `PUT /api/progress/lecture/:documentId` - Mettre à jour progression
- `POST /api/progress/session` - Créer session d'étude

### Épreuves
- `GET /api/epreuves` - Liste annales
- `GET /api/epreuves/:id` - Détail épreuve
- `POST /api/epreuves/:id/download` - Télécharger corrigé

### Quiz
- `GET /api/quiz` - Liste quiz
- `GET /api/quiz/:id` - Détail quiz avec questions
- `POST /api/quiz/:id/submit` - Soumettre réponses

### Progression (Stats)
- `GET /api/progression/stats` - Statistiques globales
- `GET /api/progression/badges` - Badges utilisateur
- `POST /api/progression/badges/check` - Vérifier nouveaux badges

### Notifications
- `GET /api/notifications` - Liste notifications
- `PUT /api/notifications/:id/read` - Marquer comme lu
- `PUT /api/notifications/read-all` - Tout marquer comme lu

### Synchronisation
- `POST /api/sync` - Synchroniser données offline
- `GET /api/sync` - Récupérer données depuis dernière sync

## Sécurité

- **Authentification** : JWT Bearer token requis sur les routes protégées
- **Rate limiting** : 100 req/min par IP
- **OTP rate limit** : 5 tentatives par 10 minutes
- **CORS** : Configuré pour origines autorisées
- **Helmet** : Headers de sécurité HTTP activés

## Seed des Données

Pour peupler la base avec les référentiels camerounais :

```bash
npm run seed
```

Cela insère :
- 10 universités camerounaises
- Filières par université
- Matières avec codes et semestres

## Développement

### Ajouter un nouveau module

1. Créer le dossier dans `src/modules/{module}/`
2. Implémenter les couches :
   - `domain/` : Interfaces et types
   - `{module}.service.ts` : Logique métier
   - `{module}.controller.ts` : Handlers HTTP
   - `{module}.routes.ts` : Définition routes
   - `index.ts` : Barrel export
3. Créer l'implémentation repository dans `src/infrastructure/repositories/`
4. Enregistrer dans `src/app.ts` (DI + routes)

### Conventions

- Utiliser TypeScript strict
- Async/await pour les opérations asynchrones
- Pagination standardisée (`parsePagination`, `createPaginationMeta`)
- Gestion d'erreurs avec classes custom (`NotFoundError`, `ConflictError`)
- Réponses HTTP standardisées (`successResponse`)
- Routes protégées avec `authGuard` middleware

## Licence

ISC
