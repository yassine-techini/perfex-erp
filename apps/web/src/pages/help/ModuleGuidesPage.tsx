/**
 * Module Guides Page
 * Detailed documentation for each ERP module
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Package,
  Briefcase,
  Shield,
  BarChart3,
  FileText,
  ArrowRight,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  description: string;
  readTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface ModuleDoc {
  id: string;
  title: string;
  description: string;
  icon: typeof DollarSign;
  color: string;
  articles: Article[];
}

const moduleDocs: ModuleDoc[] = [
  {
    id: 'finance',
    title: 'Finance & Comptabilité',
    description: 'Gérez la comptabilité, les factures, les paiements et les rapports financiers.',
    icon: DollarSign,
    color: 'bg-green-500',
    articles: [
      { id: 'chart-of-accounts', title: 'Comprendre le Plan Comptable', description: 'Structure et personnalisation du plan comptable', readTime: 5, difficulty: 'beginner' },
      { id: 'create-invoice', title: 'Créer et Envoyer une Facture', description: 'Guide complet de création de factures', readTime: 4, difficulty: 'beginner' },
      { id: 'record-payment', title: 'Enregistrer un Paiement', description: 'Réconcilier les paiements avec les factures', readTime: 3, difficulty: 'beginner' },
      { id: 'bank-reconciliation', title: 'Rapprochement Bancaire', description: 'Synchroniser vos comptes avec la banque', readTime: 6, difficulty: 'intermediate' },
      { id: 'journal-entries', title: 'Écritures de Journal', description: 'Créer des écritures manuelles', readTime: 5, difficulty: 'intermediate' },
      { id: 'financial-reports', title: 'Rapports Financiers', description: 'Bilan, Compte de résultat, Flux de trésorerie', readTime: 8, difficulty: 'intermediate' },
      { id: 'tax-management', title: 'Gestion de la TVA', description: 'Configuration et déclarations TVA', readTime: 7, difficulty: 'advanced' },
      { id: 'multi-currency', title: 'Gestion Multi-devises', description: 'Opérations en devises étrangères', readTime: 6, difficulty: 'advanced' },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Ventes',
    description: 'Gérez vos clients, contacts, opportunités et pipeline de ventes.',
    icon: Users,
    color: 'bg-blue-500',
    articles: [
      { id: 'add-company', title: 'Ajouter une Entreprise', description: 'Créer une fiche client complète', readTime: 3, difficulty: 'beginner' },
      { id: 'manage-contacts', title: 'Gérer les Contacts', description: 'Ajouter et organiser les contacts', readTime: 4, difficulty: 'beginner' },
      { id: 'pipeline-overview', title: 'Vue Pipeline', description: 'Visualiser et gérer le pipeline de ventes', readTime: 5, difficulty: 'beginner' },
      { id: 'create-opportunity', title: 'Créer une Opportunité', description: 'Suivre une affaire potentielle', readTime: 4, difficulty: 'beginner' },
      { id: 'import-contacts', title: 'Importer des Contacts', description: 'Import depuis Excel/CSV', readTime: 5, difficulty: 'intermediate' },
      { id: 'activity-tracking', title: 'Suivi des Activités', description: 'Historique des interactions', readTime: 4, difficulty: 'intermediate' },
      { id: 'sales-automation', title: 'Automatisations CRM', description: 'Workflows et règles automatiques', readTime: 7, difficulty: 'advanced' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventaire',
    description: 'Gérez vos stocks, produits, entrepôts et mouvements.',
    icon: Package,
    color: 'bg-orange-500',
    articles: [
      { id: 'add-product', title: 'Ajouter un Produit', description: 'Créer une fiche produit', readTime: 4, difficulty: 'beginner' },
      { id: 'manage-categories', title: 'Organiser les Catégories', description: 'Structurer votre catalogue', readTime: 3, difficulty: 'beginner' },
      { id: 'stock-levels', title: 'Niveaux de Stock', description: 'Seuils et alertes', readTime: 4, difficulty: 'beginner' },
      { id: 'stock-movements', title: 'Mouvements de Stock', description: 'Entrées, sorties, transferts', readTime: 5, difficulty: 'intermediate' },
      { id: 'warehouse-management', title: 'Gestion Multi-entrepôts', description: 'Configurer plusieurs emplacements', readTime: 6, difficulty: 'intermediate' },
      { id: 'inventory-valuation', title: 'Valorisation du Stock', description: 'FIFO, LIFO, coût moyen', readTime: 7, difficulty: 'advanced' },
      { id: 'batch-tracking', title: 'Traçabilité des Lots', description: 'Suivi par numéro de lot', readTime: 6, difficulty: 'advanced' },
    ],
  },
  {
    id: 'hr',
    title: 'Ressources Humaines',
    description: 'Gérez les employés, congés, présences et paie.',
    icon: Briefcase,
    color: 'bg-purple-500',
    articles: [
      { id: 'add-employee', title: 'Ajouter un Employé', description: 'Créer un dossier employé', readTime: 4, difficulty: 'beginner' },
      { id: 'org-chart', title: 'Organigramme', description: 'Visualiser la structure', readTime: 3, difficulty: 'beginner' },
      { id: 'leave-management', title: 'Gestion des Congés', description: 'Demandes et validations', readTime: 5, difficulty: 'beginner' },
      { id: 'attendance', title: 'Suivi des Présences', description: 'Pointage et heures travaillées', readTime: 4, difficulty: 'intermediate' },
      { id: 'payroll-setup', title: 'Configuration Paie', description: 'Paramétrer le module paie', readTime: 8, difficulty: 'advanced' },
      { id: 'performance-reviews', title: 'Évaluations', description: 'Entretiens et objectifs', readTime: 5, difficulty: 'intermediate' },
    ],
  },
  {
    id: 'audit',
    title: 'Smart Audit',
    description: 'Système d\'audit qualité assisté par intelligence artificielle.',
    icon: Shield,
    color: 'bg-red-500',
    articles: [
      { id: 'audit-overview', title: 'Introduction au Smart Audit', description: 'Présentation des 3 modules IA', readTime: 6, difficulty: 'beginner' },
      { id: 'create-audit-task', title: 'Créer une Tâche d\'Audit', description: 'Tâches manuelles et automatiques', readTime: 4, difficulty: 'beginner' },
      { id: 'risk-assessment', title: 'Évaluation des Risques (EF1)', description: 'Analyse IA des risques qualité', readTime: 7, difficulty: 'intermediate' },
      { id: 'compliance-copilot', title: 'Copilote de Conformité (EF2)', description: 'Assistant IA pour ISO/OSHA', readTime: 6, difficulty: 'intermediate' },
      { id: 'commonality-study', title: 'Étude de Communalité (EF3)', description: 'Analyse des patterns', readTime: 8, difficulty: 'advanced' },
      { id: 'audit-scheduling', title: 'Planification des Audits', description: 'Audits récurrents automatiques', readTime: 5, difficulty: 'intermediate' },
    ],
  },
  {
    id: 'reports',
    title: 'Rapports & Analytics',
    description: 'Tableaux de bord, rapports et analyses pour piloter votre entreprise.',
    icon: BarChart3,
    color: 'bg-cyan-500',
    articles: [
      { id: 'dashboard-overview', title: 'Comprendre le Dashboard', description: 'Navigation et widgets', readTime: 4, difficulty: 'beginner' },
      { id: 'standard-reports', title: 'Rapports Standard', description: 'Rapports pré-configurés', readTime: 5, difficulty: 'beginner' },
      { id: 'custom-reports', title: 'Rapports Personnalisés', description: 'Créer vos propres rapports', readTime: 7, difficulty: 'intermediate' },
      { id: 'export-data', title: 'Exporter les Données', description: 'PDF, Excel, CSV', readTime: 3, difficulty: 'beginner' },
      { id: 'kpi-setup', title: 'Configurer les KPIs', description: 'Indicateurs de performance', readTime: 6, difficulty: 'intermediate' },
    ],
  },
];

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const difficultyLabels = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

export function ModuleGuidesPage() {
  const { moduleId } = useParams<{ moduleId?: string }>();
  const [selectedModule, setSelectedModule] = useState<ModuleDoc | null>(
    moduleId ? moduleDocs.find((m) => m.id === moduleId) || null : null
  );

  if (selectedModule) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/help" className="hover:text-blue-600">
            Centre d'Aide
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link to="/help/modules" className="hover:text-blue-600">
            Guides des Modules
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-gray-900 dark:text-white">{selectedModule.title}</span>
        </div>

        {/* Module Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className={`p-4 rounded-lg ${selectedModule.color}`}>
              <selectedModule.icon className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedModule.title}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                {selectedModule.description}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedModule.articles.length} articles disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {selectedModule.articles.map((article) => (
            <Link
              key={article.id}
              to={`/help/articles/${article.id}`}
              className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {article.description}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`px-2 py-1 text-xs font-medium rounded ${difficultyColors[article.difficulty]}`}>
                  {difficultyLabels[article.difficulty]}
                </span>
                <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4 mr-1" />
                  {article.readTime} min
                </span>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        {/* Back Button */}
        <button
          onClick={() => setSelectedModule(null)}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          &larr; Voir tous les modules
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/help"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          &larr; Retour au Centre d'Aide
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          Guides des Modules
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Documentation détaillée pour chaque fonctionnalité de Perfex ERP.
        </p>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {moduleDocs.map((module) => (
          <button
            key={module.id}
            onClick={() => setSelectedModule(module)}
            className="text-left bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start">
              <div className={`p-3 rounded-lg ${module.color}`}>
                <module.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {module.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {module.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-blue-600">
                    {module.articles.length} articles
                  </span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Statistiques de la Documentation
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {moduleDocs.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Modules</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {moduleDocs.reduce((acc, m) => acc + m.articles.length, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Articles</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {moduleDocs.reduce((acc, m) => acc + m.articles.reduce((a, art) => a + art.readTime, 0), 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Min. de lecture</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {moduleDocs.reduce((acc, m) => acc + m.articles.filter(a => a.difficulty === 'beginner').length, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pour débutants</p>
          </div>
        </div>
      </div>
    </div>
  );
}
