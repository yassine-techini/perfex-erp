# Perfex API Worker

API backend pour Perfex ERP AI-Native, déployé sur Cloudflare Workers avec Hono.js.

## 🏗️ Architecture

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Storage**: KV (cache, sessions), R2 (files), Vectorize (embeddings)
- **Language**: TypeScript

## 📦 Stack

- `hono` - Fast web framework for edge
- `drizzle-orm` - Type-safe ORM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `zod` - Runtime validation

## 🚀 Démarrage

### Installation

```bash
pnpm install
```

### Configuration

1. **Cloudflare Resources** (déjà créés):
   - D1 Database: `perfex-db`
   - KV: `CACHE`, `SESSIONS`
   - Vectorize: `perfex-vectors`
   - Queue: `perfex-jobs`

2. **Secrets**:
```bash
# JWT Secret
wrangler secret put JWT_SECRET
# Entrer: HxPErEGceXFAl4ArKdMKzfhDKRcgxScS1FNRHwXVkhY=
```

3. **Database Migration**:
```bash
# Local
wrangler d1 migrations apply perfex-db --local

# Production
wrangler d1 migrations apply perfex-db --remote
```

### Développement

```bash
# Démarrer le serveur de dev
pnpm dev

# L'API sera disponible sur http://localhost:8787
```

### Tests

```bash
# Lancer les tests
pnpm test

# Avec coverage
pnpm test:coverage
```

### Déploiement

```bash
# Staging
pnpm deploy:staging

# Production
pnpm deploy
```

## 📚 API Endpoints

### Health Check

```
GET /
GET /api/v1/health
```

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "organizationName": "Acme Corp" // optional
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    ...
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Get Profile
```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

#### Update Profile
```http
PUT /api/v1/auth/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "avatarUrl": "https://..."
}
```

#### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

## 🔒 Sécurité

### Password Requirements
- Minimum 8 caractères
- Au moins 1 majuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial

### Rate Limiting
- **Login**: 5 tentatives / 15 minutes
- **Register**: 3 tentatives / heure
- **Password Reset**: 3 tentatives / heure
- **API Auth**: 100 requêtes / minute
- **API Public**: 30 requêtes / minute

### JWT Tokens
- **Access Token**: 15 minutes
- **Refresh Token**: 7 jours

## 🧪 Tests

Les tests couvrent:
- ✅ Utilitaires crypto (hashing, JWT)
- ✅ Rate limiting
- ✅ AuthService
- ✅ Routes API

Coverage cible: **80%+**

## 📁 Structure

```
src/
├── index.ts              # Entry point
├── middleware/
│   └── auth.ts          # JWT middleware
├── routes/
│   └── auth.ts          # Auth routes
├── services/
│   └── auth.service.ts  # Auth business logic
└── utils/
    ├── crypto.ts        # Hashing & JWT
    └── rate-limit.ts    # Rate limiting
```

## 🔧 Développement

### Ajouter une nouvelle route

1. Créer le fichier dans `src/routes/`
2. Monter dans `src/index.ts`:
```typescript
import myRoutes from './routes/my-routes';
apiV1.route('/my-endpoint', myRoutes);
```

### Ajouter une migration

```bash
cd packages/database
pnpm generate
wrangler d1 migrations apply perfex-db --local
```

## 📝 Variables d'environnement

Définies dans `wrangler.toml`:
- `ENVIRONMENT`: development | staging | production
- `LOG_LEVEL`: debug | info | warn | error

## 🐛 Debugging

```bash
# Logs en temps réel
wrangler tail

# Logs avec filtres
wrangler tail --format pretty
```

## 📊 Monitoring

- Cloudflare Dashboard: https://dash.cloudflare.com/
- Workers Analytics
- D1 Analytics
- KV Analytics

## 🚀 Performance

- Cold start: ~10ms
- Request latency: ~50ms (median)
- Global edge deployment
- Auto-scaling

## 📖 Documentation

- [Hono.js Docs](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)

## 🤝 Contribution

Voir [CONTRIBUTING.md](../../../CONTRIBUTING.md)

## 📄 License

Proprietary - Perfex ERP
