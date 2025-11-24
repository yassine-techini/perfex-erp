# 🚀 Instructions de Déploiement Rapide

## Étape 1: Pousser sur GitHub

```bash
# 1. Créer un nouveau dépôt sur GitHub
# Aller sur: https://github.com/new
# Nom: perfex-erp
# Ne PAS initialiser avec README

# 2. Dans votre terminal, exécuter:
git remote add origin https://github.com/VOTRE_USERNAME/perfex-erp.git
git branch -M main
git push -u origin main

# 3. Créer la branche develop
git checkout -b develop
git push -u origin develop
git checkout main
```

**✅ Votre lien GitHub**: `https://github.com/VOTRE_USERNAME/perfex-erp`

---

## Étape 2: Configuration Cloudflare

### A. S'authentifier

```bash
wrangler login
```

### B. Créer les bases de données

```bash
# Dev
wrangler d1 create perfex-db-dev

# Staging
wrangler d1 create perfex-db-staging

# Production
wrangler d1 create perfex-db-prod
```

**📝 IMPORTANT**: Notez les `database_id` de chaque base!

### C. Créer les KV Namespaces

```bash
# Dev - Sessions
wrangler kv:namespace create SESSIONS --preview
wrangler kv:namespace create CACHE --preview

# Staging - Sessions
wrangler kv:namespace create SESSIONS --env staging
wrangler kv:namespace create CACHE --env staging

# Production - Sessions
wrangler kv:namespace create SESSIONS --env production
wrangler kv:namespace create CACHE --env production
```

**📝 IMPORTANT**: Notez tous les `id` des namespaces!

### D. Configurer wrangler.toml

Éditer `apps/workers/api/wrangler.toml` et remplacer les IDs:

```toml
# Remplacer YOUR_DEV_DB_ID, YOUR_STAGING_DB_ID, YOUR_PROD_DB_ID
# Remplacer YOUR_DEV_SESSIONS_KV_ID, etc.
```

### E. Configurer les secrets

```bash
# Générer des secrets sécurisés
openssl rand -base64 32  # Pour JWT_ACCESS_SECRET
openssl rand -base64 32  # Pour JWT_REFRESH_SECRET

# Dev
wrangler secret put JWT_ACCESS_SECRET --env dev
wrangler secret put JWT_REFRESH_SECRET --env dev

# Staging
wrangler secret put JWT_ACCESS_SECRET --env staging
wrangler secret put JWT_REFRESH_SECRET --env staging

# Production
wrangler secret put JWT_ACCESS_SECRET --env production
wrangler secret put JWT_REFRESH_SECRET --env production
```

---

## Étape 3: Déploiement

### Option 1: Script Automatique

```bash
# Rendre le script exécutable
chmod +x scripts/deploy-all.sh

# Exécuter le script
./scripts/deploy-all.sh

# Choisir l'environnement:
# 1 = Dev
# 2 = Staging
# 3 = Production
# 4 = Tous
```

### Option 2: Déploiement Manuel

#### Dev

```bash
# Migrations
cd packages/database
wrangler d1 migrations apply perfex-db-dev --remote
cd ../..

# API
cd apps/workers/api
pnpm build
wrangler deploy --env dev
cd ../../..

# Frontend
cd apps/web
VITE_API_URL=https://perfex-api-dev.VOTRE-SUBDOMAIN.workers.dev/api/v1 pnpm build
wrangler pages deploy dist --project-name=perfex-web-dev
cd ../..
```

#### Staging

```bash
# Migrations
cd packages/database
wrangler d1 migrations apply perfex-db-staging --remote
cd ../..

# API
cd apps/workers/api
pnpm build
wrangler deploy --env staging
cd ../../..

# Frontend
cd apps/web
VITE_API_URL=https://perfex-api-staging.VOTRE-SUBDOMAIN.workers.dev/api/v1 pnpm build
wrangler pages deploy dist --project-name=perfex-web-staging
cd ../..
```

#### Production

```bash
# Migrations
cd packages/database
wrangler d1 migrations apply perfex-db-prod --remote
cd ../..

# API
cd apps/workers/api
pnpm build
wrangler deploy --env production
cd ../../..

# Frontend
cd apps/web
VITE_API_URL=https://perfex-api.VOTRE-SUBDOMAIN.workers.dev/api/v1 pnpm build
wrangler pages deploy dist --project-name=perfex-web
cd ../..
```

---

## 🌐 Vos URLs

Après le déploiement, vous recevrez les URLs de Cloudflare.

### Dev
- **API**: `https://perfex-api-dev.VOTRE-SUBDOMAIN.workers.dev`
- **App**: `https://perfex-web-dev.pages.dev`

### Staging
- **API**: `https://perfex-api-staging.VOTRE-SUBDOMAIN.workers.dev`
- **App**: `https://perfex-web-staging.pages.dev`

### Production
- **API**: `https://perfex-api.VOTRE-SUBDOMAIN.workers.dev`
- **App**: `https://perfex-web.pages.dev`

---

## ✅ Vérification

```bash
# Tester l'API
curl https://perfex-api-dev.VOTRE-SUBDOMAIN.workers.dev/

# Devrait retourner:
# {"status":"ok","service":"perfex-api",...}
```

Ouvrir dans le navigateur:
- `https://perfex-web-dev.pages.dev`

Login de test:
- Email: `admin@democompany.com`
- Password: `Admin123!`

---

## 📝 Notes Importantes

1. **Remplacer VOTRE_USERNAME** par votre username GitHub
2. **Remplacer VOTRE-SUBDOMAIN** par votre subdomain Cloudflare (affiché après wrangler login)
3. **Sauvegarder vos IDs** de database et KV namespaces
4. **Générer des secrets uniques** pour chaque environnement
5. **Ne jamais committer** les fichiers `.env` ou `.dev.vars`

---

## 🆘 Besoin d'Aide?

Consultez le guide complet: `DEPLOYMENT.md`

---

## 🎉 C'est tout!

Votre ERP Perfex est maintenant déployé sur Cloudflare avec 3 environnements! 🚀
