import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Layers, 
  Download, 
  RefreshCw, 
  ArrowUpRight, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

const COLORS = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await api.reports.getFinancial();
      setData(res);
    } catch (error: any) {
      toast.error('Failed to load financial reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(val || 0);
  };

  const handleExportCSV = () => {
    if (!data || !data.cyclesTrend) return;
    
    // Prepare cycle header & records
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Cycle ID,Period Title,Start Date,End Date,Status,Total Gross Pay,Total Deductions,Total Net Pay\n";
    
    data.cyclesTrend.forEach((c: any) => {
      csvContent += `${c.id},"${c.name}",${c.startDate},${c.endDate},${c.status},${c.totalGross},${c.totalDeductions},${c.totalNet}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SLSU_Financial_Payroll_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Financial dataset CSV exported');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin" />
        <p className="text-neutral-500 text-sm">Generating real-time financial report metrics...</p>
      </div>
    );
  }

  // Prepared chart inputs
  const monthlyExpenseData = data?.cyclesTrend?.map((c: any) => ({
    name: c.name.length > 20 ? c.name.substring(0, 18) + '...' : c.name,
    Gross: Number(c.totalGross || 0),
    Deductions: Number(c.totalDeductions || 0),
    Net: Number(c.totalNet || 0)
  })) || [];

  const deductionData = data?.deductionsBreakdown ? Object.entries(data.deductionsBreakdown).map(([key, value]) => ({
    name: key,
    value: Number(value || 0)
  })).sort((a, b) => b.value - a.value) : [];

  const categoryData = data?.categoryDistribution?.map((cat: any) => ({
    name: cat.category || 'Unknown',
    Gross: Number(cat.gross || 0),
    Net: Number(cat.net || 0),
    Employees: cat.count || 0
  })) || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Financial Reports & Analytics</h1>
          <p className="text-neutral-500">Audit compliance, tax tracking, payroll computations, and overall financial metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchReportData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload Data
          </Button>
          <Button onClick={handleExportCSV} variant="default" size="sm" className="bg-neutral-900 border-neutral-900 hover:bg-neutral-800 gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export Ledger
          </Button>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900 font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <Badge className="bg-neutral-100 text-neutral-800 text-[10px] uppercase font-bold border-0">Ledger Summary</Badge>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Payroll Expenditure</p>
            <h3 className="text-2xl font-bold text-neutral-900">{formatCurrency(data?.summary?.totalGross)}</h3>
            <p className="text-xs text-neutral-500 mt-2">Cumulative gross wages processed</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold">
                <Percent className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-red-600 font-bold bg-red-100/50 px-2 py-0.5 rounded-full">
                {data?.summary?.totalGross ? ((data.summary.totalDeductions / data.summary.totalGross) * 100).toFixed(1) + '%' : '0%'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Tax & Statutory Deductions</p>
            <h3 className="text-2xl font-bold text-neutral-900">{formatCurrency(data?.summary?.totalDeductions)}</h3>
            <p className="text-xs text-neutral-500 mt-2">Withheld income taxes & benefits</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.5 rounded-full">
                {data?.summary?.totalGross ? ((data.summary.totalNet / data.summary.totalGross) * 100).toFixed(1) + '%' : '0%'}
              </span>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Released Net Wages</p>
            <h3 className="text-2xl font-bold text-neutral-900">{formatCurrency(data?.summary?.totalNet)}</h3>
            <p className="text-xs text-neutral-500 mt-2">Total cash liability disbursed</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-900 font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <Badge className="bg-neutral-100 text-neutral-800 text-[10px] uppercase font-bold border-0">Batches</Badge>
            </div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Batches Audited</p>
            <h3 className="text-2xl font-bold text-neutral-900">{data?.summary?.totalBatches}</h3>
            <p className="text-xs text-neutral-500 mt-2">Batches completed or disbursed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <Card className="lg:col-span-2 rounded-2xl border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Wages & Expense Expense trends
            </CardTitle>
            <CardDescription>Review total gross salary, total deduction deductions, and net cash reserves disbursed per cycle</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyExpenseData.length === 0 ? (
              <p className="text-center py-20 text-neutral-400">No payroll data processed yet.</p>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} stroke="#888888" tickLine={false} />
                    <YAxis fontSize={11} stroke="#888888" tickLine={false} tickFormatter={(val) => `₱${val / 1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [formatCurrency(val), '']} 
                      contentStyle={{ fontFamily: 'Inter, sans-serif', borderRadius: '8px' }}
                    />
                    <Legend iconSize={10} verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Gross" fill="#171717" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Net" fill="#737373" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Deductions" fill="#d4d4d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deductions Pie Chart for compliance */}
        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tax & Statutory Matrix</CardTitle>
            <CardDescription>Breakdown and distribution of statutory deductions and taxes withheld</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {deductionData.length === 0 ? (
              <p className="text-center py-20 text-neutral-400">No tax or deductions processed.</p>
            ) : (
              <>
                <div className="h-[200px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deductionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deductionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatCurrency(val), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Total Withheld</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {formatCurrency(deductionData.reduce((acc, curr) => acc + curr.value, 0))}
                    </p>
                  </div>
                </div>

                <div className="w-full mt-4 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {deductionData.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs py-1 border-b border-neutral-50">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 md:w-3 h-2 md:h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-neutral-700">{entry.name}</span>
                      </div>
                      <span className="font-bold text-neutral-900">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category distribution */}
        <Card className="rounded-2xl border-neutral-100 shadow-sm col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Wages by Employment Class</CardTitle>
            <CardDescription>Earnings distribution and personnel count separated by employment category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryData.length === 0 ? (
              <p className="text-center py-2 text-neutral-400 text-sm">No category distribution data.</p>
            ) : (
              categoryData.map((cat: any) => {
                const total = cat.Gross || 1;
                const pct = ((cat.Net / total) * 100).toFixed(0);
                return (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-neutral-900">{cat.name}</span>
                        <span className="ml-2 text-xs text-neutral-400 font-mono">({cat.Employees} pax)</span>
                      </div>
                      <span className="font-semibold text-neutral-900">{formatCurrency(cat.Gross)}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-neutral-900 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(10, (cat.Gross / (data?.summary?.totalGross || 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-400">
                      <span>{pct}% paid out as net wages</span>
                      <span>Deductions: {formatCurrency(cat.Gross - cat.Net)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Ledger table */}
        <Card className="lg:col-span-2 rounded-2xl border-neutral-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Processed Payroll Batches</CardTitle>
            <CardDescription>Auditable ledger showing past budgets, tax reserves, and net values.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Period Title</th>
                    <th className="py-3 px-4">Date Bounds</th>
                    <th className="py-3 px-4 text-right">Gross Pay</th>
                    <th className="py-3 px-4 text-right">Statutory Deductions</th>
                    <th className="py-3 px-4 text-right">Net released</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {data?.cyclesTrend?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-800">{c.name}</td>
                      <td className="py-3 px-4 text-xs text-neutral-500 font-mono">{c.startDate} to {c.endDate}</td>
                      <td className="py-3 px-4 text-right text-xs font-semibold">{formatCurrency(c.totalGross || 0)}</td>
                      <td className="py-3 px-4 text-right text-xs text-red-600 font-semibold">{formatCurrency(c.totalDeductions || 0)}</td>
                      <td className="py-3 px-4 text-right text-xs text-emerald-600 font-bold">{formatCurrency(c.totalNet || 0)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`text-[10px] font-bold uppercase tracking-wider select-none ${
                          c.status === 'disbursed' ? 'bg-emerald-100 text-emerald-800 border-0' :
                          c.status === 'approved' ? 'bg-indigo-100 text-indigo-800 border-0' :
                          c.status === 'rejected' ? 'bg-red-100 text-red-800 border-0' :
                          c.status === 'completed' ? 'bg-blue-100 text-blue-800 border-0' :
                          'bg-amber-100 text-amber-800 border-0'
                        }`}>
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.cyclesTrend || data.cyclesTrend.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">No batch list available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
