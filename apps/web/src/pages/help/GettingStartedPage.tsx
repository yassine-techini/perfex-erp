/**
 * Getting Started Page
 * Step-by-step guide for new users
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  ArrowRight,
  Building2,
  Users,
  FileText,
  Settings,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: typeof Building2;
  details: string[];
  link?: { href: string; label: string };
  videoId?: string;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Configurer votre Organisation',
    description: 'Paramétrez les informations de base de votre entreprise',
    icon: Building2,
    details: [
      'Accédez aux Paramètres > Organisation',
      'Renseignez le nom, adresse et coordonnées',
      'Uploadez votre logo',
      'Configurez la devise et le fuseau horaire',
      'Définissez l\'exercice fiscal',
    ],
    link: { href: '/settings/organization', label: 'Configurer l\'organisation' },
  },
  {
    id: 2,
    title: 'Inviter votre Équipe',
    description: 'Ajoutez les membres de votre équipe et définissez leurs rôles',
    icon: Users,
    details: [
      'Accédez à Paramètres > Utilisateurs',
      'Cliquez sur "Inviter un utilisateur"',
      'Entrez l\'email et sélectionnez un rôle',
      'Le nouvel utilisateur recevra un email d\'invitation',
      'Configurez les permissions si nécessaire',
    ],
    link: { href: '/settings/users', label: 'Gérer les utilisateurs' },
  },
  {
    id: 3,
    title: 'Créer votre Premier Client',
    description: 'Ajoutez vos clients et contacts dans le CRM',
    icon: FileText,
    details: [
      'Allez dans CRM > Entreprises',
      'Cliquez sur "Nouvelle Entreprise"',
      'Remplissez les informations (nom, secteur, etc.)',
      'Ajoutez des contacts associés',
      'Notez les opportunités commerciales',
    ],
    link: { href: '/crm/companies/new', label: 'Créer un client' },
  },
  {
    id: 4,
    title: 'Configurer la Comptabilité',
    description: 'Paramétrez votre plan comptable et comptes bancaires',
    icon: Settings,
    details: [
      'Accédez à Finance > Comptes',
      'Vérifiez le plan comptable par défaut',
      'Ajoutez vos comptes bancaires',
      'Configurez les modes de paiement',
      'Définissez les taxes applicables',
    ],
    link: { href: '/finance/accounts', label: 'Configurer la comptabilité' },
  },
  {
    id: 5,
    title: 'Configurer les Permissions',
    description: 'Définissez qui peut accéder à quoi dans votre organisation',
    icon: Shield,
    details: [
      'Allez dans Paramètres > Rôles',
      'Créez des rôles personnalisés si besoin',
      'Attribuez les permissions par module',
      'Assignez les rôles aux utilisateurs',
      'Testez les accès avec différents comptes',
    ],
    link: { href: '/settings/roles', label: 'Gérer les rôles' },
  },
  {
    id: 6,
    title: 'Découvrir l\'Assistant IA',
    description: 'Apprenez à utiliser les fonctionnalités IA de Perfex',
    icon: Sparkles,
    details: [
      'L\'Assistant IA est accessible depuis le menu principal',
      'Posez des questions en langage naturel',
      'Demandez des analyses de données',
      'Utilisez le copilote de conformité pour les audits',
      'Générez des rapports automatiquement',
    ],
    link: { href: '/ai', label: 'Essayer l\'Assistant IA' },
  },
];

export function GettingStartedPage() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  const toggleStep = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const markComplete = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(completedSteps.filter((id) => id !== stepId));
    } else {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const progress = (completedSteps.length / steps.length) * 100;

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
          Guide de Démarrage
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Suivez ces étapes pour configurer Perfex ERP et commencer à travailler efficacement.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progression
          </span>
          <span className="text-sm font-medium text-blue-600">
            {completedSteps.length} / {steps.length} étapes
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Félicitations ! Vous avez terminé la configuration initiale.
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isExpanded = expandedStep === step.id;

          return (
            <div
              key={step.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-all ${
                isCompleted ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {/* Step Header */}
              <div
                className="flex items-center p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => toggleStep(step.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markComplete(step.id);
                  }}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : 'border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </button>
                <div className="ml-4 flex-1">
                  <h3
                    className={`font-medium ${
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
                <step.icon className="h-6 w-6 text-gray-400 mr-4" />
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Step Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Comment faire :
                    </h4>
                    <ol className="space-y-2">
                      {step.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="flex items-start text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center mr-3">
                            {idx + 1}
                          </span>
                          {detail}
                        </li>
                      ))}
                    </ol>

                    <div className="mt-4 flex items-center gap-3">
                      {step.link && (
                        <Link
                          to={step.link.href}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          {step.link.label}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      )}
                      {step.videoId && (
                        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200">
                          <Play className="h-4 w-4 mr-2" />
                          Voir le tutoriel
                        </button>
                      )}
                      <button
                        onClick={() => markComplete(step.id)}
                        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                          isCompleted
                            ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                            : 'text-green-600 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {isCompleted ? 'Marquer comme non fait' : 'Marquer comme fait'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
          Et après ?
        </h3>
        <p className="mt-2 text-blue-700 dark:text-blue-300">
          Une fois ces étapes terminées, explorez les guides détaillés de chaque module
          pour maîtriser toutes les fonctionnalités de Perfex.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            to="/help/modules"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
          >
            Voir les guides des modules
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
          <Link
            to="/help/faq"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Consulter la FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}
