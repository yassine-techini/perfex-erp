#!/bin/bash

# Script de Déploiement Complet Perfex ERP
# Ce script déploie tous les environnements (dev, staging, production)

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement Perfex ERP"
echo "========================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que wrangler est installé
if ! command -v wrangler &> /dev/null; then
    error "Wrangler CLI n'est pas installé"
    echo "Installer avec: npm install -g wrangler"
    exit 1
fi

# Vérifier l'authentification
info "Vérification de l'authentification Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    error "Non authentifié avec Cloudflare"
    echo "Exécuter: wrangler login"
    exit 1
fi

info "Authentifié avec Cloudflare ✓"
echo ""

# Menu de sélection
echo "Quel environnement voulez-vous déployer?"
echo "1) Dev"
echo "2) Staging"
echo "3) Production"
echo "4) Tous les environnements"
echo ""
read -p "Choisir (1-4): " choice

deploy_dev() {
    info "=== Déploiement DEV ==="

    # Migrations DB
    info "Application des migrations dev..."
    cd packages/database
    wrangler d1 migrations apply perfex-db-dev --remote || warn "Migrations déjà appliquées"
    cd ../..

    # Déploiement API
    info "Déploiement de l'API dev..."
    cd apps/workers/api
    pnpm build
    pnpm deploy:dev
    cd ../../..

    # Déploiement Frontend
    info "Déploiement du frontend dev..."
    cd apps/web
    VITE_API_URL=https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev/api/v1 \
    VITE_ENVIRONMENT=development \
    pnpm build
    wrangler pages deploy dist --project-name=perfex-web-dev
    cd ../..

    echo ""
    info "✅ Déploiement DEV terminé!"
    echo "API: https://perfex-api-dev.YOUR-SUBDOMAIN.workers.dev"
    echo "App: https://perfex-web-dev.pages.dev"
}

deploy_staging() {
    info "=== Déploiement STAGING ==="

    # Migrations DB
    info "Application des migrations staging..."
    cd packages/database
    wrangler d1 migrations apply perfex-db-staging --remote || warn "Migrations déjà appliquées"
    cd ../..

    # Déploiement API
    info "Déploiement de l'API staging..."
    cd apps/workers/api
    pnpm build
    pnpm deploy:staging
    cd ../../..

    # Déploiement Frontend
    info "Déploiement du frontend staging..."
    cd apps/web
    VITE_API_URL=https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev/api/v1 \
    VITE_ENVIRONMENT=staging \
    pnpm build
    wrangler pages deploy dist --project-name=perfex-web-staging
    cd ../..

    echo ""
    info "✅ Déploiement STAGING terminé!"
    echo "API: https://perfex-api-staging.YOUR-SUBDOMAIN.workers.dev"
    echo "App: https://perfex-web-staging.pages.dev"
}

deploy_production() {
    warn "⚠️  ATTENTION: Vous allez déployer en PRODUCTION"
    read -p "Êtes-vous sûr? (oui/non): " confirm

    if [ "$confirm" != "oui" ]; then
        error "Déploiement annulé"
        exit 1
    fi

    info "=== Déploiement PRODUCTION ==="

    # Migrations DB
    info "Application des migrations production..."
    cd packages/database
    wrangler d1 migrations apply perfex-db-prod --remote || warn "Migrations déjà appliquées"
    cd ../..

    # Déploiement API
    info "Déploiement de l'API production..."
    cd apps/workers/api
    pnpm build
    pnpm deploy:production
    cd ../../..

    # Déploiement Frontend
    info "Déploiement du frontend production..."
    cd apps/web
    VITE_API_URL=https://perfex-api.YOUR-SUBDOMAIN.workers.dev/api/v1 \
    VITE_ENVIRONMENT=production \
    pnpm build
    wrangler pages deploy dist --project-name=perfex-web
    cd ../..

    echo ""
    info "✅ Déploiement PRODUCTION terminé!"
    echo "API: https://perfex-api.YOUR-SUBDOMAIN.workers.dev"
    echo "App: https://perfex-web.pages.dev"
}

# Exécuter le déploiement selon le choix
case $choice in
    1)
        deploy_dev
        ;;
    2)
        deploy_staging
        ;;
    3)
        deploy_production
        ;;
    4)
        deploy_dev
        echo ""
        deploy_staging
        echo ""
        deploy_production
        ;;
    *)
        error "Choix invalide"
        exit 1
        ;;
esac

echo ""
echo "========================================="
info "🎉 Déploiement terminé avec succès!"
echo "========================================="
