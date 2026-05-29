import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Wallet, TrendingUp, TrendingDown, Download, Plus, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function AccountsModule({ action, onActionComplete, profile }: { action?: string | null, onActionComplete?: () => void, profile?: any }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  useEffect(() => {
    if (action === 'add-expense') {
      setIsAddExpenseOpen(true);
      onActionComplete?.();
    }
  }, [action]);
  const [newExpense, setNewExpense] = useState({
    category: 'Feed',
    amount: 0,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!profile) return;

    const unsubExp = onSnapshot(query(collection(db, 'expenses'), where('ownerId', '==', profile.uid)), (snap) => {
      const sortedExpenses = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(sortedExpenses);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'expenses'));
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('ownerId', '==', profile.uid)), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));
    return () => { unsubExp(); unsubSales(); };
  }, [profile]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to record expenses.");
        return;
      }
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        ownerId: profile?.uid || 'unknown',
        createdAt: new Date().toISOString()
      });
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_expense',
        category: newExpense.category,
        amount: newExpense.amount,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
      setIsAddExpenseOpen(false);
      setNewExpense({ category: 'Feed', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
  };

  const totalIncome = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ChickMart - Financial Report', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Period: ${format(new Date(), 'MMMM yyyy')}`, 20, 35);
    
    const summaryData = [
      ['Total Income', `₹${totalIncome.toLocaleString()}`],
      ['Total Expenses', `₹${totalExpense.toLocaleString()}`],
      ['Net Profit', `₹${netProfit.toLocaleString()}`],
    ];

    (doc as any).autoTable({
      startY: 45,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillStyle: [234, 88, 12] }
    });

    const expenseData = expenses.map(e => [format(new Date(e.date), 'MMM dd'), e.description, e.category, `₹${e.amount}`]);
    
    doc.text('Detailed Expenses', 20, (doc as any).lastAutoTable.finalY + 15);
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: expenseData
    });

    doc.save(`Financial_Report_${format(new Date(), 'MMM_yyyy')}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount'];
    const rows = expenses.map(e => [e.date, e.description, e.category, e.amount]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Expenses_${format(new Date(), 'MMM_yyyy')}.csv`;
    link.click();
  };

  const categoryBreakdown = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] bg-green-600 text-white border-none shadow-lg shadow-green-100 p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-green-200">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp size={24} />
              ₹{totalIncome.toLocaleString()}
            </div>
            <p className="text-xs text-green-200 mt-1">Cummulative Sales</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] bg-amber-600 text-white border-none shadow-lg shadow-amber-100 p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-200">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              <TrendingDown size={24} />
              ₹{totalExpense.toLocaleString()}
            </div>
            <p className="text-xs text-amber-200 mt-1">Operational Costs</p>
          </CardContent>
        </Card>
        <Card className="rounded-[2rem] bg-stone-900 text-white border-none shadow-lg shadow-stone-200 p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{netProfit.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded ${netProfit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{((netProfit / (totalIncome || 1)) * 100).toFixed(1)}% Margin
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="bg-stone-50 border-b border-stone-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet size={20} className="text-orange-600" />
              Transaction History
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={exportToCSV} className="rounded-xl text-stone-400 hover:text-stone-900">
                <FileText size={16} />
              </Button>
              <Button size="sm" variant="outline" onClick={downloadReport} className="rounded-xl border-stone-200">
                <Download size={16} className="mr-1" />
                Report
              </Button>
              <Button size="sm" onClick={() => setIsAddExpenseOpen(true)} className="rounded-xl bg-stone-900 text-white">
                <Plus size={16} className="mr-1" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 15).map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-stone-500">{format(new Date(exp.date), 'MMM dd')}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{exp.description || 'No description'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full px-3">{exp.category}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-red-600 text-right">₹{exp.amount}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-stone-400">No expenses recorded yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="rounded-[2rem] border-stone-200 shadow-sm p-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-stone-400">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryBreakdown).map(([cat, amt]) => (
              <div key={cat} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{cat}</span>
                  <span className="font-bold">₹{amt.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${((amt as number) / (totalExpense || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(categoryBreakdown).length === 0 && (
              <p className="text-center py-8 text-stone-400 text-sm italic">No expense data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Category</label>
                  <select 
                    className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                  >
                    <option>Feed</option>
                    <option>Medicine / Vaccine</option>
                    <option>Labor / Wages</option>
                    <option>Farm Repairs</option>
                    <option>Electricity / Utility</option>
                    <option>Transport</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Amount (₹)</label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-2xl" 
                    value={newExpense.amount || ''} 
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Description</label>
                  <Input 
                    className="h-12 rounded-2xl" 
                    value={newExpense.description} 
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddExpenseOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Save Expense</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
