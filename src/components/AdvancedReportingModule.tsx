import React, { useState, useEffect } from 'react';
import { reportingService } from '../services/reportingService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Download, Filter, FileText, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function AdvancedReportingModule({ profile }: { profile?: any }) {
  const [report, setReport] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    async function fetchData() {
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());
      
      const [pl, top] = await Promise.all([
        reportingService.getProfitLoss(profile.uid, startDate, endDate),
        reportingService.getTopProducts(profile.uid, 5)
      ]);
      
      setReport(pl);
      setTopProducts(top);
      setLoading(false);
    }
    fetchData();
  }, [profile]);

  const COLORS = ['#ea580c', '#18181b', '#16a34a', '#2563eb', '#9333ea'];

  const exportReport = () => {
    reportingService.exportToCSV([report], `Monthly_Financial_Summary_${format(new Date(), 'MMM_yyyy')}`);
  };

  if (loading) return <div>Calculating reports...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-stone-200">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <FileText className="text-orange-600" size={24} />
            Advanced Financial Reports
          </h2>
          <p className="text-stone-500 text-sm mt-1">Detailed P&L and sales performance analysis</p>
        </div>
        <Button onClick={exportReport} variant="outline" className="rounded-xl gap-2 border-stone-200">
          <Download size={18} /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-stone-200 shadow-sm bg-stone-900 text-white overflow-hidden">
          <CardContent className="p-8">
            <TrendingUp size={32} className="text-orange-500 mb-4" />
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Monthly Revenue</p>
            <h3 className="text-4xl font-black mt-2">₹{report.revenue.toLocaleString()}</h3>
            <p className="text-stone-500 text-xs mt-4">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
          <CardContent className="p-8">
            <TrendingDown size={32} className="text-red-500 mb-4" />
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Monthly Expenses</p>
            <h3 className="text-4xl font-black text-stone-900 mt-2">₹{report.expenses.toLocaleString()}</h3>
            <div className="w-full bg-stone-100 h-1.5 rounded-full mt-6">
              <div 
                className="bg-red-500 h-full rounded-full" 
                style={{ width: `${(report.expenses/report.revenue)*100}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-stone-200 shadow-sm overflow-hidden border-b-8 border-b-orange-600">
          <CardContent className="p-8">
            <TrendingUp size={32} className="text-green-500 mb-4" />
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Net Profit</p>
            <h3 className="text-4xl font-black text-stone-900 mt-2">₹{report.profit.toLocaleString()}</h3>
            <p className="text-green-600 text-xs font-bold mt-4">{report.margin.toFixed(1)}% Profit Margin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Top Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{ fill: '#f8f8f7' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-stone-200 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sales Volume Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col sm:flex-row items-center justify-center gap-6 px-6">
            <div className="relative w-[180px] h-[180px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={topProducts.length > 1 ? 5 : 0}
                    dataKey="quantity"
                    stroke="none"
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Total Qty</span>
                <span className="text-xl font-black text-stone-900 leading-none mt-1">
                  {topProducts.reduce((sum, p) => sum + (p.quantity || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 w-full animate-fadeIn">
              <div className="max-h-[180px] overflow-y-auto pr-1 space-y-2.5">
                {topProducts.map((prod, idx) => {
                  const total = topProducts.reduce((sum, p) => sum + (p.quantity || 0), 0) || 1;
                  const pct = (((prod.quantity || 0) / total) * 100).toFixed(0);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs transition-transform hover:translate-x-1 duration-150">
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                        />
                        <span className="font-extrabold text-stone-700 truncate">{prod.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-stone-500 font-bold ml-2">
                        <span>{prod.quantity} units</span>
                        <span className="text-[10px] text-stone-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {topProducts.length === 0 && (
                  <div className="text-center py-10 text-stone-400 text-xs italic">
                    No sales data found.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
