/**
 * Help Center Page
 * Main documentation hub with search and quick access
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  BookOpen,
  HelpCircle,
  PlayCircle,
  FileText,
  Users,
  DollarSign,
  Package,
  Briefcase,
  Shield,
  BarChart3,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: typeof BookOpen;
  color: string;
}

interface ModuleGuide {
  title: string;
  description: string;
  href: string;
  icon: typeof DollarSign;
  articles: number;
}

const quickLinks: QuickLink[] = [
  {
    title: 'Guide de Démarrage',
    description: 'Premiers pas avec Perfex ERP',
    href: '/help/getting-started',
    icon: BookOpen,
    color: 'bg-blue-500',
  },
  {
    title: 'FAQ',
    description: 'Questions fréquemment posées',
    href: '/help/faq',
    icon: HelpCircle,
    color: 'bg-green-500',
  },
  {
    title: 'Tutoriels Vidéo',
    description: 'Apprenez visuellement',
    href: '/help/videos',
    icon: PlayCircle,
    color: 'bg-purple-500',
  },
  {
    title: 'Guides des Modules',
    description: 'Documentation détaillée',
    href: '/help/modules',
    icon: FileText,
    color: 'bg-orange-500',
  },
];

const moduleGuides: ModuleGuide[] = [
  {
    title: 'Finance & Comptabilité',
    description: 'Factures, paiements, comptes et rapports financiers',
    href: '/help/modules/finance',
    icon: DollarSign,
    articles: 12,
  },
  {
    title: 'CRM & Ventes',
    description: 'Gestion des clients, contacts et opportunités',
    href: '/help/modules/crm',
    icon: Users,
    articles: 8,
  },
  {
    title: 'Inventaire',
    description: 'Stocks, produits et mouvements',
    href: '/help/modules/inventory',
    icon: Package,
    articles: 10,
  },
  {
    title: 'Ressources Humaines',
    description: 'Employés, congés et paie',
    href: '/help/modules/hr',
    icon: Briefcase,
    articles: 7,
  },
  {
    title: 'Smart Audit',
    description: 'Audit qualité assisté par IA',
    href: '/help/modules/audit',
    icon: Shield,
    articles: 6,
  },
  {
    title: 'Rapports & Analytics',
    description: 'Tableaux de bord et analyses',
    href: '/help/modules/reports',
    icon: BarChart3,
    articles: 5,
  },
];

const popularArticles = [
  { title: 'Comment créer ma première facture ?', href: '/help/articles/create-invoice' },
  { title: 'Configurer les rôles et permissions', href: '/help/articles/roles-permissions' },
  { title: 'Importer des données depuis Excel', href: '/help/articles/import-data' },
  { title: 'Paramétrer les notifications', href: '/help/articles/notifications' },
  { title: 'Utiliser le copilote IA', href: '/help/articles/ai-copilot' },
  { title: 'Générer un rapport financier', href: '/help/articles/financial-reports' },
];

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = popularArticles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Centre d'Aide Perfex ERP
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Trouvez des réponses, apprenez les fonctionnalités et maîtrisez Perfex
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans la documentation..."
            className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-lg ${link.color}`}>
              <link.icon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium text-gray-900 dark:text-white">{link.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Module Guides */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Guides par Module
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Documentation détaillée pour chaque fonctionnalité
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {moduleGuides.map((guide) => (
            <Link
              key={guide.href}
              to={guide.href}
              className="flex items-start p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <guide.icon className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{guide.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {guide.description}
                </p>
                <p className="text-xs text-blue-600 mt-2">{guide.articles} articles</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Articles Populaires
            </h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {(searchQuery ? filteredArticles : popularArticles).map((article) => (
              <li key={article.href}>
                <Link
                  to={article.href}
                  className="flex items-center px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">{article.title}</span>
                </Link>
              </li>
            ))}
            {searchQuery && filteredArticles.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                Aucun article trouvé pour "{searchQuery}"
              </li>
            )}
          </ul>
        </div>

        {/* AI Assistant Card */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-start">
            <div className="p-3 bg-white/20 rounded-lg">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold">Assistant IA</h2>
              <p className="mt-2 text-purple-100">
                Besoin d'aide personnalisée ? Notre assistant IA peut répondre à vos questions
                en temps réel et vous guider dans l'utilisation de Perfex.
              </p>
              <Link
                to="/ai"
                className="inline-flex items-center mt-4 px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50"
              >
                Discuter avec l'IA
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Vous n'avez pas trouvé ce que vous cherchez ?
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Notre équipe de support est disponible pour vous aider.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <a
            href="mailto:support@perfex.io"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
          >
            Contacter le Support
          </a>
          <Link
            to="/help/faq"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
          >
            Voir la FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
