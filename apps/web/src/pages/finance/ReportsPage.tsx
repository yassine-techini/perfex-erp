/**
 * Reports Page
 * Financial reports viewer
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage, type ApiResponse } from '@/lib/api';
import type { TrialBalanceEntry } from '@perfex/shared';
import { format } from 'date-fns';

type ReportType = 'trial-balance' | 'balance-sheet' | 'income-statement';

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('trial-balance');
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch report data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['report', reportType, startDate, endDate],
    queryFn: async () => {
      if (reportType === 'balance-sheet') {
        const response = await api.post<ApiResponse<{
          assets: TrialBalanceEntry[];
          liabilities: TrialBalanceEntry[];
          equity: TrialBalanceEntry[];
          totalAssets: number;
          totalLiabilities: number;
          totalEquity: number;
        }>>('/reports/balance-sheet', { asOfDate: endDate });
        return { type: 'balance-sheet', data: response.data.data };
      } else if (reportType === 'income-statement') {
        const response = await api.post<ApiResponse<{
          revenue: TrialBalanceEntry[];
          expenses: TrialBalanceEntry[];
          totalRevenue: number;
          totalExpenses: number;
          netIncome: number;
        }>>('/reports/income-statement', { startDate, endDate });
        return { type: 'income-statement', data: response.data.data };
      } else {
        const response = await api.post<ApiResponse<TrialBalanceEntry[]>>(
          '/reports/trial-balance',
          { startDate, endDate }
        );
        return { type: 'trial-balance', data: response.data.data };
      }
    },
  });

  const reportTypes = [
    { value: 'trial-balance', label: 'Trial Balance' },
    { value: 'balance-sheet', label: 'Balance Sheet' },
    { value: 'income-statement', label: 'Income Statement' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">
          View and analyze your financial data
        </p>
      </div>

      {/* Report Selection */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Generate Report
          </button>
          <button className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Export PDF
          </button>
          <button className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Generating report...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-destructive">Error: {getErrorMessage(error)}</p>
          </div>
        ) : data ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">
                {reportTypes.find(r => r.value === reportType)?.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {reportType === 'balance-sheet'
                  ? `As of ${format(new Date(endDate), 'MMMM dd, yyyy')}`
                  : `From ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`
                }
              </p>
            </div>

            {/* Trial Balance */}
            {data.type === 'trial-balance' && Array.isArray(data.data) && (
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Account</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Debit</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Credit</th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((entry) => (
                    <tr key={entry.accountCode}>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-mono font-medium">{entry.accountCode}</div>
                        <div className="text-muted-foreground">{entry.accountName}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono">
                        {entry.debit > 0 ? `€${entry.debit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono">
                        {entry.credit > 0 ? `€${entry.credit.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono font-medium">
                        €{entry.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Balance Sheet */}
            {data.type === 'balance-sheet' && typeof data.data === 'object' && 'assets' in data.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Assets</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      {data.data.assets.map((entry) => (
                        <tr key={entry.accountCode}>
                          <td className="px-4 py-2 text-sm">
                            {entry.accountCode} - {entry.accountName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            €{entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/50">
                        <td className="px-4 py-2 text-sm">Total Assets</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">
                          €{data.data.totalAssets.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Liabilities</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      {data.data.liabilities.map((entry) => (
                        <tr key={entry.accountCode}>
                          <td className="px-4 py-2 text-sm">
                            {entry.accountCode} - {entry.accountName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            €{entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/50">
                        <td className="px-4 py-2 text-sm">Total Liabilities</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">
                          €{data.data.totalLiabilities.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Equity</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      {data.data.equity.map((entry) => (
                        <tr key={entry.accountCode}>
                          <td className="px-4 py-2 text-sm">
                            {entry.accountCode} - {entry.accountName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            €{entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/50">
                        <td className="px-4 py-2 text-sm">Total Equity</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">
                          €{data.data.totalEquity.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Income Statement */}
            {data.type === 'income-statement' && typeof data.data === 'object' && 'revenue' in data.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      {data.data.revenue.map((entry) => (
                        <tr key={entry.accountCode}>
                          <td className="px-4 py-2 text-sm">
                            {entry.accountCode} - {entry.accountName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            €{entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/50">
                        <td className="px-4 py-2 text-sm">Total Revenue</td>
                        <td className="px-4 py-2 text-sm text-right font-mono text-green-600">
                          €{data.data.totalRevenue.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Expenses</h3>
                  <table className="w-full">
                    <tbody className="divide-y">
                      {data.data.expenses.map((entry) => (
                        <tr key={entry.accountCode}>
                          <td className="px-4 py-2 text-sm">
                            {entry.accountCode} - {entry.accountName}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            €{entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-muted/50">
                        <td className="px-4 py-2 text-sm">Total Expenses</td>
                        <td className="px-4 py-2 text-sm text-right font-mono text-red-600">
                          €{data.data.totalExpenses.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border-t-2 pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Net Income</span>
                    <span className={data.data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                      €{data.data.netIncome.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
