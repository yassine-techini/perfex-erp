/**
 * Traceability Page
 * Manage lots, HACCP, and food safety tracking
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScanLine,
  Package,
  AlertTriangle,
  Thermometer,
  ClipboardCheck,
  Search,
  Plus,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Edit,
  Eye,
} from 'lucide-react';

interface Lot {
  id: string;
  lotNumber: string;
  inventoryItemId: string | null;
  type: 'raw_material' | 'semi_finished' | 'finished_product';
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  productionDate: string | null;
  receptionDate: string | null;
  expiryDate: string | null;
  status: 'available' | 'reserved' | 'quarantine' | 'expired' | 'consumed' | 'recalled';
  qualityStatus: 'pending' | 'approved' | 'rejected' | 'conditional';
  warehouseId: string | null;
  location: string | null;
  supplierLotNumber: string | null;
  notes: string | null;
  createdAt: string;
}

interface HaccpControlPoint {
  id: string;
  code: string;
  name: string;
  type: 'ccp' | 'oprp' | 'prp';
  hazardType: 'biological' | 'chemical' | 'physical' | 'allergen';
  controlMeasure: string;
  criticalLimit: string | null;
  monitoringFrequency: string | null;
  active: boolean;
}

interface Stats {
  totalLots: number;
  availableLots: number;
  quarantineLots: number;
  expiredLots: number;
  expiringWithin7Days: number;
}

interface HaccpStats {
  totalControlPoints: number;
  activeControlPoints: number;
  recordsLast30Days: number;
  deviationsLast30Days: number;
  complianceRate: number;
  activeRecalls: number;
}

const API_URL = import.meta.env.VITE_API_URL;

export function TraceabilityPage() {
  const [activeTab, setActiveTab] = useState<'lots' | 'haccp' | 'temperature' | 'cleaning'>('lots');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showLotForm, setShowLotForm] = useState(false);
  const [showCpForm, setShowCpForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void showLotForm; void showCpForm; // Suppress unused warnings - forms to be implemented

  const token = localStorage.getItem('accessToken');

  // Fetch lot stats
  const { data: lotStats } = useQuery({
    queryKey: ['lot-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/traceability/lots/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.data as Stats;
    },
  });

  // Fetch HACCP stats
  const { data: haccpStats } = useQuery({
    queryKey: ['haccp-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/traceability/haccp/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch HACCP stats');
      const data = await response.json();
      return data.data as HaccpStats;
    },
  });

  // Fetch lots
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['lots', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/traceability/lots?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch lots');
      const data = await response.json();
      return data.data as Lot[];
    },
    enabled: activeTab === 'lots',
  });

  // Fetch expiring lots
  const { data: expiringLots } = useQuery({
    queryKey: ['expiring-lots'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/traceability/lots/expiring?days=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch expiring lots');
      const data = await response.json();
      return data.data as Lot[];
    },
  });

  // Fetch control points
  const { data: controlPoints } = useQuery({
    queryKey: ['control-points'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/traceability/haccp/control-points`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch control points');
      const data = await response.json();
      return data.data as HaccpControlPoint[];
    },
    enabled: activeTab === 'haccp',
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      quarantine: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      consumed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      recalled: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300',
    };
    return styles[status] || styles.available;
  };

  const getQualityBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      conditional: 'bg-orange-100 text-orange-800',
    };
    return styles[status] || styles.pending;
  };

  const getCpTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      ccp: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400' },
      oprp: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-400' },
      prp: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400' },
    };
    return styles[type] || styles.prp;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Traçabilité & HACCP
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestion des lots, points de contrôle et conformité alimentaire
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Lots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lotStats?.totalLots || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponibles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lotStats?.availableLots || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">En quarantaine</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lotStats?.quarantineLots || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Expirent &lt;7j</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lotStats?.expiringWithin7Days || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Conformité</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {haccpStats?.complianceRate?.toFixed(1) || 100}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringLots && expiringLots.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="ml-3">
              <h3 className="font-medium text-orange-800 dark:text-orange-200">
                Lots expirant bientôt
              </h3>
              <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                {expiringLots.length} lot(s) expirent dans les 7 prochains jours.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringLots.slice(0, 5).map((lot) => (
                  <span
                    key={lot.id}
                    className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100 rounded text-sm"
                  >
                    {lot.lotNumber} - DLC: {formatDate(lot.expiryDate)}
                  </span>
                ))}
                {expiringLots.length > 5 && (
                  <span className="text-sm text-orange-600">+{expiringLots.length - 5} autres</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'lots', label: 'Lots', icon: Package },
            { id: 'haccp', label: 'Points de contrôle HACCP', icon: ClipboardCheck },
            { id: 'temperature', label: 'Relevés température', icon: Thermometer },
            { id: 'cleaning', label: 'Nettoyage', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Lots Tab */}
      {activeTab === 'lots' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un lot..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Tous les statuts</option>
                <option value="available">Disponible</option>
                <option value="reserved">Réservé</option>
                <option value="quarantine">Quarantaine</option>
                <option value="expired">Expiré</option>
                <option value="consumed">Consommé</option>
              </select>
              <button
                onClick={() => setShowLotForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau Lot
              </button>
            </div>
          </div>

          {/* Lots Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    N° Lot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    DLC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Qualité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lotsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : lots && lots.length > 0 ? (
                  lots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <ScanLine className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {lot.lotNumber}
                          </span>
                        </div>
                        {lot.supplierLotNumber && (
                          <div className="text-xs text-gray-500 mt-1">
                            Fournisseur: {lot.supplierLotNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {lot.type === 'raw_material' && 'Matière première'}
                        {lot.type === 'semi_finished' && 'Semi-fini'}
                        {lot.type === 'finished_product' && 'Produit fini'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-white">
                          {lot.currentQuantity} / {lot.initialQuantity} {lot.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={isExpiringSoon(lot.expiryDate) ? 'text-orange-600 font-medium' : 'text-gray-900 dark:text-white'}>
                          {formatDate(lot.expiryDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lot.status)}`}>
                          {lot.status === 'available' && 'Disponible'}
                          {lot.status === 'reserved' && 'Réservé'}
                          {lot.status === 'quarantine' && 'Quarantaine'}
                          {lot.status === 'expired' && 'Expiré'}
                          {lot.status === 'consumed' && 'Consommé'}
                          {lot.status === 'recalled' && 'Rappelé'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadge(lot.qualityStatus)}`}>
                          {lot.qualityStatus === 'pending' && 'En attente'}
                          {lot.qualityStatus === 'approved' && 'Approuvé'}
                          {lot.qualityStatus === 'rejected' && 'Rejeté'}
                          {lot.qualityStatus === 'conditional' && 'Conditionnel'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                            <Edit className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucun lot trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HACCP Tab */}
      {activeTab === 'haccp' && (
        <div className="space-y-4">
          {/* HACCP Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Points de contrôle actifs</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {haccpStats?.activeControlPoints || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Relevés (30 jours)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {haccpStats?.recordsLast30Days || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Écarts (30 jours)</div>
              <div className="text-2xl font-bold text-red-600">
                {haccpStats?.deviationsLast30Days || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Rappels actifs</div>
              <div className="text-2xl font-bold text-orange-600">
                {haccpStats?.activeRecalls || 0}
              </div>
            </div>
          </div>

          {/* Control Points */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Points de contrôle
              </h3>
              <button
                onClick={() => setShowCpForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ajouter un point
              </button>
            </div>

            {controlPoints && controlPoints.length > 0 ? (
              <div className="space-y-4">
                {controlPoints.map((cp) => {
                  const typeBadge = getCpTypeBadge(cp.type);
                  return (
                    <div
                      key={cp.id}
                      className={`p-4 rounded-lg border-2 ${
                        cp.type === 'ccp' ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg ${typeBadge.bg}`}>
                            <ClipboardCheck className={`h-5 w-5 ${typeBadge.text}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-medium text-gray-900 dark:text-white">
                                {cp.code}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge.bg} ${typeBadge.text}`}>
                                {cp.type.toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-white mt-1">
                              {cp.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {cp.controlMeasure}
                            </p>
                            {cp.criticalLimit && (
                              <p className="text-sm text-red-600 font-medium mt-2">
                                Limite critique: {cp.criticalLimit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {cp.active ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>Aucun point de contrôle défini</p>
                <p className="text-sm">Ajoutez des CCP, OPRP ou PRP pour votre plan HACCP</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temperature Tab */}
      {activeTab === 'temperature' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Relevés de température
            </h3>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Nouveau relevé
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <Thermometer className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>Aucun relevé de température</p>
            <p className="text-sm">Enregistrez les températures de vos équipements frigorifiques</p>
          </div>
        </div>
      )}

      {/* Cleaning Tab */}
      {activeTab === 'cleaning' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Plan de nettoyage
            </h3>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Nouveau nettoyage
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>Aucun enregistrement de nettoyage</p>
            <p className="text-sm">Enregistrez les opérations de nettoyage et désinfection</p>
          </div>
        </div>
      )}
    </div>
  );
}
