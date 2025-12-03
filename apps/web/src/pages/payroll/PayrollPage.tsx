/**
 * Payroll Page
 * Manage payroll periods, payslips, and compensation
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  Calendar,
  Users,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Calculator,
  Euro,
  TrendingUp,
  Building2,
} from 'lucide-react';

interface PayrollPeriod {
  id: string;
  name: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  paymentDate: string | null;
  status: 'draft' | 'processing' | 'validated' | 'paid' | 'closed';
  totalGross: number | null;
  totalNet: number | null;
  totalEmployerCharges: number | null;
  employeeCount: number | null;
  createdAt: string;
}

interface Payslip {
  id: string;
  employeeName: string;
  employeePosition: string | null;
  departmentName: string | null;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  employerContributions: number;
  status: 'draft' | 'calculated' | 'validated' | 'paid' | 'cancelled';
  createdAt: string;
}

interface PayrollStats {
  periodsProcessed: number;
  totalPeriods: number;
  totalGross: number;
  totalNet: number;
  totalEmployerCharges: number;
  totalCost: number;
  pendingDeclarations: number;
  year: number;
}

const API_URL = import.meta.env.VITE_API_URL;

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function PayrollPage() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [showNewPeriodForm, setShowNewPeriodForm] = useState(false);

  const token = localStorage.getItem('accessToken');

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['payroll-stats', selectedYear],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/payroll/stats?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.data as PayrollStats;
    },
  });

  // Fetch periods
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['payroll-periods', selectedYear],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/payroll/periods?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch periods');
      const data = await response.json();
      return data.data as PayrollPeriod[];
    },
  });

  // Fetch payslips for selected period
  const { data: payslips, isLoading: payslipsLoading } = useQuery({
    queryKey: ['payroll-payslips', selectedPeriod?.id],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const response = await fetch(`${API_URL}/payroll/periods/${selectedPeriod.id}/payslips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch payslips');
      const data = await response.json();
      return data.data as Payslip[];
    },
    enabled: !!selectedPeriod,
  });

  // Create period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: { year: number; month: number }) => {
      const startDate = new Date(data.year, data.month - 1, 1);
      const endDate = new Date(data.year, data.month, 0);

      const response = await fetch(`${API_URL}/payroll/periods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: data.year,
          month: data.month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to create period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setShowNewPeriodForm(false);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: typeof Clock }> = {
      draft: { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
      processing: { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      validated: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle2 },
      paid: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
      closed: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle2 },
    };
    return styles[status] || styles.draft;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paie</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion de la paie et des bulletins de salaire
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewPeriodForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle période
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Périodes traitées</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.periodsProcessed || 0} / {stats?.totalPeriods || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Euro className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Masse salariale brute</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalGross || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Charges patronales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalEmployerCharges || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Coût total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.totalCost || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Periods List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Périodes de paie {selectedYear}
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {periodsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : periods && periods.length > 0 ? (
              periods.map((period) => {
                const statusInfo = getStatusBadge(period.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selectedPeriod?.id === period.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {period.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {period.employeeCount || 0} employés
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {period.status === 'draft' && 'Brouillon'}
                          {period.status === 'processing' && 'En cours'}
                          {period.status === 'validated' && 'Validé'}
                          {period.status === 'paid' && 'Payé'}
                          {period.status === 'closed' && 'Clôturé'}
                        </span>
                        {period.totalNet && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                            {formatCurrency(period.totalNet)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>Aucune période de paie</p>
                <p className="text-sm">Créez une nouvelle période pour commencer</p>
              </div>
            )}
          </div>
        </div>

        {/* Payslips or Empty State */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
          {selectedPeriod ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Bulletins de paie - {selectedPeriod.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Du {new Date(selectedPeriod.startDate).toLocaleDateString('fr-FR')} au{' '}
                      {new Date(selectedPeriod.endDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculer tout
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Download className="h-4 w-4 mr-2" />
                      Exporter
                    </button>
                  </div>
                </div>
              </div>

              {/* Payslips Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Employé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Brut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Cotisations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {payslipsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </td>
                      </tr>
                    ) : payslips && payslips.length > 0 ? (
                      payslips.map((payslip) => (
                        <tr key={payslip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {payslip.employeeName}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {payslip.employeePosition || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">
                            {formatCurrency(payslip.grossSalary)}
                          </td>
                          <td className="px-6 py-4 text-red-600">
                            -{formatCurrency(payslip.totalDeductions)}
                          </td>
                          <td className="px-6 py-4 font-medium text-green-600">
                            {formatCurrency(payslip.netSalary)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(payslip.status).bg}`}>
                              {payslip.status === 'draft' && 'Brouillon'}
                              {payslip.status === 'calculated' && 'Calculé'}
                              {payslip.status === 'validated' && 'Validé'}
                              {payslip.status === 'paid' && 'Payé'}
                              {payslip.status === 'cancelled' && 'Annulé'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                                <Eye className="h-4 w-4 text-gray-500" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                                <Download className="h-4 w-4 text-gray-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p>Aucun bulletin de paie</p>
                          <p className="text-sm">Calculez les bulletins pour cette période</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Period Summary */}
              {selectedPeriod.totalGross && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Brut</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(selectedPeriod.totalGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Net</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(selectedPeriod.totalNet)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Charges patronales</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(selectedPeriod.totalEmployerCharges)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coût total</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency((selectedPeriod.totalGross || 0) + (selectedPeriod.totalEmployerCharges || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <Banknote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Sélectionnez une période
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Choisissez une période de paie dans la liste pour voir les bulletins
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Period Modal */}
      {showNewPeriodForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Nouvelle période de paie
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createPeriodMutation.mutate({
                  year: parseInt(formData.get('year') as string),
                  month: parseInt(formData.get('month') as string),
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Année
                  </label>
                  <select
                    name="year"
                    defaultValue={selectedYear}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mois
                  </label>
                  <select
                    name="month"
                    defaultValue={new Date().getMonth() + 1}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {MONTH_NAMES.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPeriodForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createPeriodMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createPeriodMutation.isPending ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
