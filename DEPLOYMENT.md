# Guide de Déploiement Perfex ERP

Ce guide vous explique comment déployer Perfex ERP sur GitHub et Cloudflare avec 3 environnements (dev, staging, production).

## 📋 Table des Matières

1. [Pousser le code sur GitHub](#pousser-sur-github)
2. [Configuration Cloudflare](#configuration-cloudflare)
3. [Déploiement Dev](#déploiement-dev)
4. [Déploiement Staging](#déploiement-staging)
5. [Déploiement Production](#déploiement-production)
6. [URLs des Environnements](#urls-des-environnements)

---

## 🚀 Pousser sur GitHub

### 1. Créer un Dépôt GitHub

```bash
# Aller sur https://github.com/new
# Nom du dépôt: perfex-erp
# Description: Modern Enterprise Resource Planning System
# Public ou Private: Votre choix
# Ne pas initialiser avec README (on en a déjà un)
```

### 2. Configurer Git Localement

```bash
# Vérifier l'état actuel
git status

# Configurer votre identité (si pas déjà fait)
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"

# Vérifier la branche
git branch  # Devrait montrer 'main'
```

### 3. Ajouter le Remote et Pousser

```bash
# Ajouter le remote (remplacer YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/perfex-erp.git

# Vérifier le remote
git remote -v

# Pousser le code
git push -u origin main

# Si vous avez déjà un remote 'origin', le remplacer:
# git remote set-url origin https://github.com/YOUR_USERNAME/perfex-erp.git
```

### 4. Créer la Branche Develop

```bash
# Créer et pousser la branche develop
git checkout -b develop
git push -u origin develop

# Retourner sur main
git checkout main
```

**Lien du dépôt**: `https://github.com/YOUR_USERNAME/perfex-erp`

---

## ☁️ Configuration Cloudflare

### Prérequis

1. **Compte Cloudflare**: https://dash.cloudflare.com/sign-up
2. **Wrangler CLI installé**: `npm install -g wrangler`
3. **Authentification**: `wrangler login`

### 1. Créer les Bases de Données D1

```bash
# Base de données Dev
wrangler d1 create perfex-db-dev

# Base de données Staging
wrangler d1 create perfex-db-staging

# Base de données Production
wrangler d1 create perfex-db-prod
```

**Notez les database_id pour chaque environnement!**

### 2. Créer les KV Namespaces

```bash
# Sessions - Dev
wrangler kv:namespace create SESSIONS --preview

# Sessions - Staging
wrangler kv:namespace create SESSIONS --env staging

# Sessions - Production
wrangler kv:namespace create SESSIONS --env production

# Cache - Dev
wrangler kv:namespace create CACHE --preview

# Cache - Staging
wrangler kv:namespace create CACHE --env staging

# Cache - Production
wrangler kv:namespace create CACHE --env production
```

**Notez tous les namespace IDs!**

### 3. Configurer wrangler.toml

Créer `apps/workers/api/wrangler.toml`:

```toml
name = "perfex-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Development Environment
[env.dev]
name = "perfex-api-dev"

[[env.dev.d1_databases]]
binding = "DB"
database_name = "perfex-db-dev"
database_id = "YOUR_DEV_DB_ID"

[[env.dev.kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_DEV_SESSIONS_KV_ID"

[[env.dev.kv_namespaces]]
binding = "CACHE"
id = "YOUR_DEV_CACHE_KV_ID"

# Staging Environment
[env.staging]
name = "perfex-api-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "perfex-db-staging"
database_id = "YOUR_STAGING_DB_ID"

[[env.staging.kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_STAGING_SESSIONS_KV_ID"

[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "YOUR_STAGING_CACHE_KV_ID"

# Production Environment
[env.production]
name = "perfex-api"

[[env.production.d1_databases]]
binding = "DB"
database_name = "perfex-db-prod"
database_id = "YOUR_PROD_DB_ID"

[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_PROD_SESSIONS_KV_ID"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "YOUR_PROD_CACHE_KV_ID"
```

### 4. Configurer les Variables d'Environnement

```bash
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

**Générer des secrets sécurisés**: `openssl rand -base64 32`

---

## 🔧 Déploiement Dev

### 1. Créer les Scripts de Déploiement

Ajouter dans `apps/workers/api/package.json`:

```json
{
  "scripts": {
    "deploy:dev": "wrangler deploy --env dev",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production"
  }
}
```

### 2. Migrations Base de Données Dev

```bash
cd packages/database

# Appliquer les migrations Dev
wrangler d1 migrations apply perfex-db-dev --remote
```

### 3. Déployer l'API Dev

```bash
cd apps/workers/api

# Build et déployer
pnpm build
pnpm deploy:dev
```

**URL API Dev**: `https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev`

### 4. Déployer le Frontend Dev

```bash
cd apps/web

# Build avec l'URL Dev
VITE_API_URL=https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev/api/v1 \
VITE_ENVIRONMENT=development \
pnpm build

# Déployer sur Cloudflare Pages
wrangler pages deploy dist --project-name=perfex-web-dev
```

**URL Frontend Dev**: `https://perfex-web-dev.pages.dev`

---

## 🎯 Déploiement Staging

### 1. Migrations Base de Données Staging

```bash
cd packages/database

# Appliquer les migrations Staging
wrangler d1 migrations apply perfex-db-staging --remote
```

### 2. Déployer l'API Staging

```bash
cd apps/workers/api

# Build et déployer
pnpm build
pnpm deploy:staging
```

**URL API Staging**: `https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev`

### 3. Déployer le Frontend Staging

```bash
cd apps/web

# Build avec l'URL Staging
VITE_API_URL=https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev/api/v1 \
VITE_ENVIRONMENT=staging \
pnpm build

# Déployer sur Cloudflare Pages
wrangler pages deploy dist --project-name=perfex-web-staging
```

**URL Frontend Staging**: `https://perfex-web-staging.pages.dev`

---

## 🚀 Déploiement Production

### 1. Migrations Base de Données Production

```bash
cd packages/database

# Appliquer les migrations Production
wrangler d1 migrations apply perfex-db-prod --remote
```

### 2. Déployer l'API Production

```bash
cd apps/workers/api

# Build et déployer
pnpm build
pnpm deploy:production
```

**URL API Production**: `https://perfex-api.YOUR-SUBDOMAIN.workers.dev`

### 3. Déployer le Frontend Production

```bash
cd apps/web

# Build avec l'URL Production
VITE_API_URL=https://perfex-api.YOUR-SUBDOMAIN.workers.dev/api/v1 \
VITE_ENVIRONMENT=production \
pnpm build

# Déployer sur Cloudflare Pages
wrangler pages deploy dist --project-name=perfex-web
```

**URL Frontend Production**: `https://perfex-web.pages.dev`

---

## 🌐 URLs des Environnements

### Environnement Dev
- **API**: `https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev`
- **Frontend**: `https://perfex-web-dev.pages.dev`
- **Base de données**: D1 Dev
- **Branche Git**: `develop`

### Environnement Staging
- **API**: `https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev`
- **Frontend**: `https://perfex-web-staging.pages.dev`
- **Base de données**: D1 Staging
- **Branche Git**: `develop`

### Environnement Production
- **API**: `https://perfex-api.YOUR-SUBDOMAIN.workers.dev`
- **Frontend**: `https://perfex-web.pages.dev`
- **Base de données**: D1 Production
- **Branche Git**: `main`

---

## 🔄 Workflow de Déploiement

### Déploiement Dev (Automatique)
1. Pousser sur branche `develop`
2. CI/CD déploie automatiquement sur Dev
3. Tests automatiques

### Déploiement Staging (Automatique)
1. Pull request de `develop` vers `main`
2. Review du code
3. CI/CD déploie automatiquement sur Staging
4. Tests de smoke

### Déploiement Production (Manuel)
1. Merge vers `main`
2. CI/CD déploie automatiquement sur Production
3. Tag de version créé
4. Notification d'équipe

---

## 🔐 Configuration des Secrets GitHub

Pour que le CI/CD fonctionne, configurez ces secrets dans GitHub:

1. Aller sur: `https://github.com/YOUR_USERNAME/perfex-erp/settings/secrets/actions`

2. Ajouter les secrets:
   - `CLOUDFLARE_API_TOKEN`: Votre token Cloudflare
   - `CLOUDFLARE_ACCOUNT_ID`: Votre Account ID

**Comment obtenir le token**:
```bash
# Aller sur https://dash.cloudflare.com/profile/api-tokens
# Créer un token avec les permissions:
# - Workers Scripts: Edit
# - Account Settings: Read
# - D1: Edit
# - Pages: Edit
```

---

## 🎨 Domaines Personnalisés (Optionnel)

### Ajouter un Domaine Personnalisé

**Pour l'API**:
```bash
# Dans Cloudflare Dashboard > Workers
# perfex-api > Settings > Triggers > Custom Domains
# Ajouter: api.votredomaine.com
```

**Pour le Frontend**:
```bash
# Dans Cloudflare Dashboard > Pages
# perfex-web > Custom Domains
# Ajouter: app.votredomaine.com
```

### URLs avec Domaines Personnalisés

**Production**:
- API: `https://api.votredomaine.com`
- App: `https://app.votredomaine.com`

**Staging**:
- API: `https://staging-api.votredomaine.com`
- App: `https://staging.votredomaine.com`

**Dev**:
- API: `https://dev-api.votredomaine.com`
- App: `https://dev.votredomaine.com`

---

## 📊 Monitoring

### Cloudflare Dashboard

**Workers Analytics**:
- Requêtes par seconde
- Latence
- Erreurs
- Logs en temps réel

**Pages Analytics**:
- Visites
- Build times
- Cache hits

### Commandes Utiles

```bash
# Voir les logs en temps réel
wrangler tail perfex-api-dev
wrangler tail perfex-api-staging
wrangler tail perfex-api

# Vérifier le statut
wrangler deployments list --name perfex-api-dev

# Rollback si nécessaire
wrangler rollback --name perfex-api-dev
```

---

## 🧪 Tester les Déploiements

### Test API

```bash
# Dev
curl https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev/

# Staging
curl https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev/

# Production
curl https://perfex-api.YOUR-SUBDOMAIN.workers.dev/
```

### Test Frontend

Ouvrir dans le navigateur:
- Dev: `https://perfex-web-dev.pages.dev`
- Staging: `https://perfex-web-staging.pages.dev`
- Production: `https://perfex-web.pages.dev`

**Login de test** (après seed):
- Email: `admin@democompany.com`
- Password: `Admin123!`

---

## 🆘 Dépannage

### Erreur: "Database not found"

```bash
# Vérifier les bases de données
wrangler d1 list

# Vérifier les migrations
wrangler d1 migrations list perfex-db-dev --remote
```

### Erreur: "KV namespace not found"

```bash
# Lister les namespaces
wrangler kv:namespace list

# Vérifier la configuration dans wrangler.toml
```

### Erreur de Build

```bash
# Nettoyer et reconstruire
pnpm clean
pnpm install
pnpm build
```

### Rollback en Production

```bash
# Voir les déploiements
wrangler deployments list --name perfex-api

# Rollback vers une version précédente
wrangler rollback --name perfex-api --message "Rollback to previous version"
```

---

## ✅ Checklist de Déploiement

### Avant le Premier Déploiement

- [ ] Compte Cloudflare créé
- [ ] Wrangler CLI installé et authentifié
- [ ] Bases de données D1 créées (dev, staging, prod)
- [ ] KV namespaces créés (dev, staging, prod)
- [ ] wrangler.toml configuré avec les IDs
- [ ] Secrets configurés pour chaque environnement
- [ ] Repository GitHub créé
- [ ] Secrets GitHub configurés (CI/CD)

### Pour Chaque Déploiement

- [ ] Code testé localement
- [ ] Migrations testées
- [ ] Build réussi
- [ ] Variables d'environnement configurées
- [ ] Tests passés
- [ ] Documentation mise à jour

### Après le Déploiement

- [ ] API répond correctement
- [ ] Frontend accessible
- [ ] Login fonctionne
- [ ] Données affichées
- [ ] Pas d'erreurs dans les logs
- [ ] Performance acceptable

---

## 📞 Support

**Cloudflare**:
- Dashboard: https://dash.cloudflare.com
- Documentation: https://developers.cloudflare.com
- Community: https://community.cloudflare.com

**Perfex ERP**:
- Documentation: Voir les fichiers .md du projet
- Issues: GitHub Issues

---

## 🎉 Félicitations!

Une fois le déploiement terminé, vous aurez:
- ✅ 3 environnements complets (dev, staging, prod)
- ✅ CI/CD automatisé via GitHub Actions
- ✅ Base de données D1 pour chaque environnement
- ✅ URLs uniques pour chaque environnement
- ✅ Monitoring et analytics
- ✅ Capacité de rollback

**Votre ERP Perfex est maintenant déployé sur l'edge Cloudflare! 🚀**
