/**
 * FAQ Page
 * Frequently Asked Questions organized by category
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle,
  DollarSign,
  Users,
  Package,
  Shield,
  Settings,
  Sparkles,
} from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  faqs: FAQ[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'general',
    title: 'Questions Générales',
    icon: HelpCircle,
    faqs: [
      {
        question: 'Qu\'est-ce que Perfex ERP ?',
        answer: 'Perfex ERP est une solution de gestion d\'entreprise complète qui intègre la comptabilité, le CRM, la gestion des stocks, les ressources humaines, et des fonctionnalités d\'intelligence artificielle. Elle est conçue pour les PME industrielles et de services.',
      },
      {
        question: 'Quels navigateurs sont supportés ?',
        answer: 'Perfex ERP fonctionne sur tous les navigateurs modernes : Chrome, Firefox, Safari, et Edge (dernières versions). Nous recommandons Chrome ou Firefox pour une expérience optimale.',
      },
      {
        question: 'L\'application est-elle disponible sur mobile ?',
        answer: 'Oui, Perfex ERP est une application web responsive qui s\'adapte automatiquement aux écrans mobiles et tablettes. Vous pouvez accéder à toutes les fonctionnalités depuis votre smartphone.',
      },
      {
        question: 'Mes données sont-elles sécurisées ?',
        answer: 'Absolument. Vos données sont chiffrées en transit (HTTPS) et au repos. Nous utilisons l\'infrastructure Cloudflare pour garantir la sécurité, la disponibilité et la conformité RGPD.',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Comptabilité',
    icon: DollarSign,
    faqs: [
      {
        question: 'Comment créer une facture ?',
        answer: 'Allez dans Finance > Factures, cliquez sur "Nouvelle Facture", sélectionnez le client, ajoutez les lignes de produits/services, puis enregistrez. Vous pouvez ensuite envoyer la facture par email ou la télécharger en PDF.',
      },
      {
        question: 'Comment enregistrer un paiement ?',
        answer: 'Dans Finance > Paiements, cliquez sur "Nouveau Paiement", sélectionnez la facture concernée, entrez le montant et la méthode de paiement. Le système mettra automatiquement à jour le statut de la facture.',
      },
      {
        question: 'Comment générer un rapport financier ?',
        answer: 'Accédez à Finance > Rapports, choisissez le type de rapport (bilan, compte de résultat, etc.), sélectionnez la période, puis cliquez sur "Générer". Vous pouvez exporter en PDF ou Excel.',
      },
      {
        question: 'Le plan comptable est-il personnalisable ?',
        answer: 'Oui, vous pouvez personnaliser le plan comptable dans Finance > Comptes. Vous pouvez ajouter, modifier ou désactiver des comptes selon les besoins de votre entreprise.',
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Ventes',
    icon: Users,
    faqs: [
      {
        question: 'Comment importer mes contacts existants ?',
        answer: 'Dans CRM > Contacts, utilisez le bouton "Importer". Téléchargez le modèle Excel, remplissez-le avec vos données, puis uploadez le fichier. Le système validera les données avant import.',
      },
      {
        question: 'Comment créer une opportunité commerciale ?',
        answer: 'Allez dans CRM > Opportunités, cliquez sur "Nouvelle Opportunité", associez-la à une entreprise/contact, définissez le montant estimé, l\'étape du pipeline et la date de clôture prévue.',
      },
      {
        question: 'Comment fonctionne le pipeline de ventes ?',
        answer: 'Le pipeline visualise vos opportunités par étape (Prospect, Qualification, Proposition, Négociation, Gagnée/Perdue). Glissez-déposez les cartes pour changer d\'étape ou cliquez pour modifier.',
      },
      {
        question: 'Puis-je suivre les interactions avec un client ?',
        answer: 'Oui, chaque fiche client affiche l\'historique complet : emails, appels, réunions, devis et factures. Vous pouvez ajouter des notes et programmer des rappels.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventaire',
    icon: Package,
    faqs: [
      {
        question: 'Comment ajouter un nouveau produit ?',
        answer: 'Dans Inventaire > Produits, cliquez sur "Nouveau Produit". Renseignez les informations (nom, SKU, prix, catégorie), définissez les seuils de stock minimum, et ajoutez des photos si nécessaire.',
      },
      {
        question: 'Comment gérer les mouvements de stock ?',
        answer: 'Les mouvements sont automatiques lors des ventes et achats. Pour des ajustements manuels, allez dans Inventaire > Mouvements et créez une entrée ou sortie de stock.',
      },
      {
        question: 'Comment être alerté des ruptures de stock ?',
        answer: 'Définissez un seuil minimum sur chaque produit. Vous recevrez une notification automatique quand le stock passe en dessous de ce seuil. Consultez aussi le tableau de bord Inventaire.',
      },
      {
        question: 'Puis-je gérer plusieurs entrepôts ?',
        answer: 'Oui, Perfex supporte la gestion multi-entrepôts. Configurez vos emplacements dans Inventaire > Entrepôts et suivez les stocks par localisation.',
      },
    ],
  },
  {
    id: 'audit',
    title: 'Smart Audit (IA)',
    icon: Shield,
    faqs: [
      {
        question: 'Qu\'est-ce que l\'évaluation dynamique des risques ?',
        answer: 'C\'est un module IA (EF1) qui analyse vos données de production, fournisseurs et processus pour identifier les risques qualité. Il génère un score de risque et peut créer automatiquement des tâches d\'audit.',
      },
      {
        question: 'Comment fonctionne le Copilote de Conformité ?',
        answer: 'Le Copilote (EF2) est un assistant IA spécialisé dans les normes ISO 9001, OSHA et vos procédures internes. Posez vos questions en langage naturel et obtenez des réponses basées sur votre base de connaissances.',
      },
      {
        question: 'Qu\'est-ce que l\'Étude de Communalité ?',
        answer: 'Ce module (EF3) utilise le framework ReAct pour analyser les patterns dans vos données de production, identifier les variantes et proposer des améliorations fournisseurs.',
      },
      {
        question: 'Les recommandations IA sont-elles fiables ?',
        answer: 'L\'IA fournit des recommandations basées sur vos données et les bonnes pratiques. Chaque suggestion inclut un niveau de confiance et doit être validée par un humain avant application.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Paramètres & Administration',
    icon: Settings,
    faqs: [
      {
        question: 'Comment ajouter un nouvel utilisateur ?',
        answer: 'Dans Paramètres > Utilisateurs, cliquez sur "Inviter". Entrez l\'email, sélectionnez un rôle prédéfini ou créez-en un personnalisé. L\'utilisateur recevra un email avec son lien d\'activation.',
      },
      {
        question: 'Comment créer un rôle personnalisé ?',
        answer: 'Allez dans Paramètres > Rôles, cliquez sur "Nouveau Rôle", nommez-le et cochez les permissions souhaitées pour chaque module. Vous pouvez dupliquer un rôle existant comme base.',
      },
      {
        question: 'Comment configurer les notifications ?',
        answer: 'Chaque utilisateur peut configurer ses préférences dans son Profil > Notifications. L\'administrateur peut définir les notifications par défaut dans Paramètres > Notifications.',
      },
      {
        question: 'Comment sauvegarder mes données ?',
        answer: 'Les données sont sauvegardées automatiquement par Cloudflare. Pour exporter, utilisez les fonctions d\'export disponibles dans chaque module ou contactez le support pour une sauvegarde complète.',
      },
    ],
  },
  {
    id: 'ai',
    title: 'Intelligence Artificielle',
    icon: Sparkles,
    faqs: [
      {
        question: 'Quelles fonctionnalités IA sont disponibles ?',
        answer: 'Perfex intègre plusieurs fonctionnalités IA : Assistant conversationnel, Recherche intelligente, Analyse de documents, Évaluation des risques, Copilote de conformité, et Étude de communalité.',
      },
      {
        question: 'L\'IA a-t-elle accès à mes données ?',
        answer: 'L\'IA n\'accède qu\'aux données de votre organisation, jamais à celles d\'autres clients. Vos données ne sont pas utilisées pour entraîner des modèles externes.',
      },
      {
        question: 'Comment améliorer les réponses de l\'IA ?',
        answer: 'Plus vous enrichissez votre base de connaissances et vos données, plus l\'IA sera pertinente. Utilisez le feedback (pouce haut/bas) pour améliorer les réponses futures.',
      },
      {
        question: 'L\'IA peut-elle modifier mes données automatiquement ?',
        answer: 'Non, l\'IA suggère des actions mais ne modifie jamais vos données sans votre validation explicite. Toutes les propositions nécessitent une approbation humaine.',
      },
    ],
  },
];

export function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (category) =>
        category.faqs.length > 0 &&
        (!selectedCategory || category.id === selectedCategory)
    );

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
          Questions Fréquentes
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Trouvez rapidement des réponses aux questions les plus courantes.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une question..."
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            !selectedCategory
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          Tout
        </button>
        {faqCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <category.icon className="h-4 w-4 mr-2" />
            {category.title}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-6">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <category.icon className="h-5 w-5 text-blue-600 mr-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {category.title}
              </h2>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                {category.faqs.length} questions
              </span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {category.faqs.map((faq, idx) => {
                const itemId = `${category.id}-${idx}`;
                const isExpanded = expandedItems.includes(itemId);

                return (
                  <div key={idx}>
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <span className="font-medium text-gray-900 dark:text-white pr-4">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <HelpCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Aucun résultat trouvé
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Essayez avec d'autres mots-clés ou{' '}
              <Link to="/help" className="text-blue-600 hover:text-blue-700">
                contactez le support
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      {/* Still need help? */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
          Vous n'avez pas trouvé votre réponse ?
        </h3>
        <p className="mt-2 text-blue-700 dark:text-blue-300">
          Notre équipe est là pour vous aider.
        </p>
        <a
          href="mailto:support@perfex.io"
          className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Contacter le Support
        </a>
      </div>
    </div>
  );
}
