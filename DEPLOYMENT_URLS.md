# 🚀 Perfex ERP - URLs de Déploiement

## ✅ Statut de Déploiement: COMPLET

Tous les environnements ont été déployés avec succès sur Cloudflare!

---

## 🌐 URLs des API

### Environnement Dev
- **URL API**: https://perfex-api-dev.yassine-techini.workers.dev
- **Base de données**: perfex-db-dev (990c74a6-b0b6-4904-8d52-5f1968e06768)
- **KV Sessions**: 2fc4dbf91ef149f4810d0614f3fc7dde
- **KV Cache**: d9edec6c56cb4f3bbe68be2747d6d7e6
- **Worker ID**: b831502d-43c2-4256-8d9d-f6591a3065f7

### Environnement Staging
- **URL API**: https://perfex-api-staging.yassine-techini.workers.dev
- **Base de données**: perfex-db-staging (23e79bcb-34c8-467c-a582-4f363fa1779c)
- **KV Sessions**: 7a0c3cb3fbf047ca9d7f8977c9b98004
- **KV Cache**: db57371d4269410bb4459e519f5c33c3
- **Worker ID**: 77e4616b-f22c-424e-8e03-07c11b135662

### Environnement Production
- **URL API**: https://perfex-api.yassine-techini.workers.dev
- **Base de données**: perfex-db-prod (b615d292-465b-4292-9914-2263fd7a66eb)
- **KV Sessions**: 85379b8924b444188374361b23898c75
- **KV Cache**: f7fff34646004bdd80b6ce1f17fdc7aa
- **Worker ID**: 3e7af637-0cf7-431a-95e2-f5b84ae850cd

---

## 🧪 Tester les APIs

```bash
# Test Dev
curl https://perfex-api-dev.yassine-techini.workers.dev/

# Test Staging
curl https://perfex-api-staging.yassine-techini.workers.dev/

# Test Production
curl https://perfex-api.yassine-techini.workers.dev/
```

---

## 📦 Ressources Créées

### Bases de Données D1
- ✅ perfex-db-dev (13 migrations appliquées)
- ✅ perfex-db-staging (13 migrations appliquées)
- ✅ perfex-db-prod (13 migrations appliquées)

### KV Namespaces
- ✅ Dev: SESSIONS + CACHE
- ✅ Staging: SESSIONS + CACHE
- ✅ Production: SESSIONS + CACHE

### Secrets JWT
- ✅ Dev: JWT_ACCESS_SECRET + JWT_REFRESH_SECRET
- ✅ Staging: JWT_ACCESS_SECRET + JWT_REFRESH_SECRET
- ✅ Production: JWT_ACCESS_SECRET + JWT_REFRESH_SECRET

---

## 🔍 Dashboard Cloudflare

Accédez au dashboard pour monitoring:
- **Dev Worker**: https://dash.cloudflare.com/6435a77d3ce17b7de468c6618e7b2b14/workers/services/view/perfex-api-dev
- **Staging Worker**: https://dash.cloudflare.com/6435a77d3ce17b7de468c6618e7b2b14/workers/services/view/perfex-api-staging
- **Production Worker**: https://dash.cloudflare.com/6435a77d3ce17b7de468c6618e7b2b14/workers/services/view/perfex-api

---

## 📝 Prochaines Étapes

### 1. Pousser sur GitHub

```bash
# Créer un nouveau repo sur GitHub
# https://github.com/new
# Nom suggéré: perfex-erp

# Ajouter le remote et pousser
git remote add origin https://github.com/VOTRE_USERNAME/perfex-erp.git
git push -u origin main

# Créer la branche develop
git checkout -b develop
git push -u origin develop
git checkout main
```

### 2. Déployer le Frontend (Apps/Web)

Le frontend React doit être déployé sur Cloudflare Pages:

```bash
cd apps/web

# Build pour Dev
VITE_API_URL=https://perfex-api-dev.yassine-techini.workers.dev/api/v1 \
VITE_ENVIRONMENT=development \
pnpm build

# Déployer sur Cloudflare Pages
wrangler pages deploy dist --project-name=perfex-web-dev

# Build pour Staging
VITE_API_URL=https://perfex-api-staging.yassine-techini.workers.dev/api/v1 \
VITE_ENVIRONMENT=staging \
pnpm build

wrangler pages deploy dist --project-name=perfex-web-staging

# Build pour Production
VITE_API_URL=https://perfex-api.yassine-techini.workers.dev/api/v1 \
VITE_ENVIRONMENT=production \
pnpm build

wrangler pages deploy dist --project-name=perfex-web
```

### 3. Seed des Données de Démonstration

```bash
# Pour chaque environnement, exécutez le seed script:
cd packages/database

# Dev
npm run seed:dev

# Staging
npm run seed:staging

# Production (optionnel)
npm run seed:production
```

**Credentials de test**:
- Email: `admin@democompany.com`
- Password: `Admin123!`

---

## 🎉 Félicitations!

Votre ERP Perfex est maintenant déployé sur 3 environnements Cloudflare!

**Total des déploiements**: 3 APIs + 88 tables + 6 KV namespaces

**Date de déploiement**: 24 novembre 2025
**Compte Cloudflare**: yassine.techini@devfactory.ai
