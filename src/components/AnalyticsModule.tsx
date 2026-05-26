import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { shopUtils } from '../lib/shopUtils';
import { Lightbulb, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function AnalyticsModule({ onNavigate, action, onActionComplete, profile }: { 
  onNavigate?: (tab: string) => void,
  action?: string | null,
  onActionComplete?: () => void,
  profile?: any
}) {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [mortalityData, setMortalityData] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    if (action === 'reports') {
      onNavigate?.('advanced_reports');
      onActionComplete?.();
    }
  }, [action]);

  useEffect(() => {
    if (!profile) return;

    // Real Data Integration for Sales & Mortality
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('ownerId', '==', profile.uid)), (snap) => {
      const dailySales: Record<string, number> = {};
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = format(subDays(new Date(), 6 - i), 'MMM dd');
        dailySales[date] = 0;
        return date;
      });

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp) {
          const date = format(new Date(data.timestamp), 'MMM dd');
          if (dailySales.hasOwnProperty(date)) {
            dailySales[date] += (data.total || 0);
          }
        }
      });
      setSalesData(last7Days.map(date => ({ date, sales: dailySales[date] })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const unsubLogs = onSnapshot(query(collection(db, 'farmlogs'), where('ownerId', '==', profile.uid)), (snap) => {
      const dailyMortality: Record<string, number> = {};
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = format(subDays(new Date(), 6 - i), 'MMM dd');
        dailyMortality[date] = 0;
        return date;
      });

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'mortality' && data.timestamp) {
          const date = format(new Date(data.timestamp), 'MMM dd');
          if (dailyMortality.hasOwnProperty(date)) {
            dailyMortality[date] += (data.count || 0);
          }
        }
      });
      setMortalityData(last7Days.map(date => ({ date, mortality: dailyMortality[date] })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'farmlogs'));

    // Real Data Integration for Expenses
    const unsubExp = onSnapshot(query(collection(db, 'expenses'), where('ownerId', '==', profile.uid)), (snap) => {
      const cats: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        cats[data.category] = (cats[data.category] || 0) + (data.amount || 0);
      });
      setExpenseData(Object.entries(cats).map(([name, value]) => ({ name, value })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'expenses'));

    const unsubInv = onSnapshot(query(collection(db, 'inventory'), where('ownerId', '==', profile.uid)), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));
    const unsubBatches = onSnapshot(query(collection(db, 'batches'), where('ownerId', '==', profile.uid)), (snap) => {
      setBatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'batches'));

    return () => { unsubSales(); unsubLogs(); unsubExp(); unsubInv(); unsubBatches(); };
  }, [profile]);

  const pricingInsights = inventory
    .filter(item => item.lowStockThreshold)
    .map(item => ({
      name: item.name,
      current: item.price,
      suggested: shopUtils.getSmartPricingSuggestion(item.price, item.quantity, item.lowStockThreshold),
      stock: item.quantity
    }))
    .filter(insight => insight.current !== insight.suggested);

  const COLORS = ['#ea580c', '#18181b', '#16a34a', '#2563eb', '#9333ea'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card 
        className="rounded-[3xl] border-stone-200 shadow-sm overflow-hidden cursor-pointer hover:border-orange-200 transition-colors group"
        onClick={() => onNavigate?.('shop')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400 italic font-serif flex justify-between items-center">
            Sales Trend (Last 7 Days)
            <TrendingUp size={14} className="group-hover:text-orange-500 transition-colors" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 600}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 600}} />
              <Tooltip 
                cursor={{ fill: '#f8f8f7' }}
                contentStyle={{ borderRadius: '1rem', border: '1px solid #f5f5f4', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', fontSize: '12px' }}
              />
              <Bar dataKey="sales" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card 
        className="rounded-[3xl] border-stone-200 shadow-sm overflow-hidden relative cursor-pointer hover:border-orange-200 transition-colors group"
        onClick={() => onNavigate?.('accounts')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400 italic font-serif flex justify-between items-center">
            Operational Expenses
            <AlertTriangle size={14} className="group-hover:text-orange-500 transition-colors" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] pt-2 flex flex-col sm:flex-row items-center justify-center gap-6 px-6">
          <div className="relative w-[180px] h-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={expenseData.length > 1 ? 6 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Total Cost</span>
              <span className="text-xl font-black text-stone-900 leading-none mt-1">
                ₹{expenseData.reduce((sum, e) => sum + e.value, 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="max-h-[180px] overflow-y-auto pr-1 space-y-2.5">
              {expenseData.map((exp, idx) => {
                const total = expenseData.reduce((sum, e) => sum + e.value, 0) || 1;
                const pct = ((exp.value / total) * 100).toFixed(0);
                return (
                  <div key={idx} className="flex items-center justify-between text-xs transition-transform hover:translate-x-1 duration-155">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                      />
                      <span className="font-extrabold text-stone-700 truncate">{exp.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-stone-500 font-bold ml-2">
                      <span>₹{exp.value.toLocaleString()}</span>
                      <span className="text-[10px] text-stone-400">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
              {expenseData.length === 0 && (
                <div className="text-center py-10 text-stone-400 text-xs italic">
                  No expense records found.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="rounded-[3xl] border-stone-200 shadow-sm overflow-hidden lg:col-span-2 cursor-pointer hover:border-orange-200 transition-colors group"
        onClick={() => onNavigate?.('farm')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400 italic font-serif flex justify-between items-center">
            Mortality Rate Analysis
            <Activity size={14} className="group-hover:text-orange-500 transition-colors" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mortalityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 600}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a8a29e', fontWeight: 600}} />
              <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Line 
                type="monotone" 
                dataKey="mortality" 
                stroke="#18181b" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#ea580c', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Batch Comparison & Insights */}
      <Card className="rounded-[3xl] border-stone-200 shadow-sm overflow-hidden lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Lightbulb className="text-orange-600" size={18} />
            Smart Pricing & Inventory Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Pricing Suggestions</p>
              {pricingInsights.length > 0 ? (
                <div className="space-y-3">
                  {pricingInsights.map((insight, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:bg-orange-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('inventory');
                      }}
                    >
                      <div>
                        <p className="text-sm font-bold text-stone-900">{insight.name}</p>
                        <p className="text-[10px] text-stone-400">Stock: {insight.stock} units</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500 line-through">₹{insight.current}</p>
                        <p className="text-sm font-bold text-orange-600">₹{insight.suggested.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <p className="text-xs text-stone-400">All prices aligned with stock levels.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Active Batch Health</p>
              <div className="space-y-3">
                {batches.filter(b => b.status === 'active').map((batch, i) => {
                  const mRate = (batch.mortalityCount / batch.initialQuantity) * 100;
                  return (
                    <div 
                      key={i} 
                      className="p-3 bg-white rounded-2xl border border-stone-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate?.('farm');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${mRate > 5 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                        <div>
                          <p className="text-sm font-bold text-stone-900">{batch.batchId}</p>
                          <p className="text-[10px] text-stone-400">{batch.currentQuantity} Birds remaining</p>
                        </div>
                      </div>
                      <Badge variant={mRate > 5 ? 'destructive' : 'outline'} className="rounded-full text-[10px]">
                        {mRate.toFixed(1)}% Mortality
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
