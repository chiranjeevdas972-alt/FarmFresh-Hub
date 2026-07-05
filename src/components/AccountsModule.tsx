import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, where, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Plus, 
  FileText, 
  BookOpen, 
  Receipt, 
  Trash2, 
  ArrowUpDown, 
  Calendar, 
  HelpCircle,
  Search,
  CheckCircle2,
  RefreshCcw,
  Landmark,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export default function AccountsModule({ action, onActionComplete, profile }: { action?: string | null, onActionComplete?: () => void, profile?: any }) {
  // Original states
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Feed',
    amount: 0,
    description: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // Unique Inner tab system
  const [innerTab, setInnerTab] = useState<'overview' | 'ledgers' | 'vouchers' | 'reports'>('overview');

  // Ledger Accounting States
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  
  // Create Ledger Form States
  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [newLdrName, setNewLdrName] = useState('');
  const [newLdrType, setNewLdrType] = useState<'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'>('Expense');
  const [newLdrOpeningBalance, setNewLdrOpeningBalance] = useState<number>(0);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Voucher Creation Form States
  const [vchType, setVchType] = useState<'payment' | 'receipt' | 'contra' | 'general'>('payment');
  const [vchDate, setVchDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [vchDebitLdr, setVchDebitLdr] = useState<string>('');
  const [vchCreditLdr, setVchCreditLdr] = useState<string>('');
  const [vchAmount, setVchAmount] = useState<number>(0);
  const [vchNarration, setVchNarration] = useState<string>('');

  // Ledger Report Filter States
  const [selectedReportLdrId, setSelectedReportLdrId] = useState<string>('');

  // Action hook
  useEffect(() => {
    if (action === 'add-expense') {
      setInnerTab('overview');
      setIsAddExpenseOpen(true);
      onActionComplete?.();
    }
  }, [action]);

  // Subscription and Auto-initialization
  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to existing expenses
    const unsubExp = onSnapshot(query(collection(db, 'expenses'), where('ownerId', '==', profile.uid)), (snap) => {
      const sortedExpenses = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(sortedExpenses);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'expenses'));

    // Listen to sales
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('ownerId', '==', profile.uid)), (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    // Listen to ledgers
    const unsubLedgers = onSnapshot(query(collection(db, 'ledger_accounts'), where('ownerId', '==', profile.uid)), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLedgers(list);
      
      // Auto-populate default ledgers if empty
      if (snap.empty) {
        const defaultLedgers = [
          { name: 'Cash A/C', type: 'Asset' as const, initialBalance: 50000 },
          { name: 'Bank A/C', type: 'Asset' as const, initialBalance: 150000 },
          { name: 'Capital A/C', type: 'Equity' as const, initialBalance: 200000 },
          { name: 'Poultry Sales A/C', type: 'Revenue' as const, initialBalance: 0 },
          { name: 'Feed Purchases A/C', type: 'Expense' as const, initialBalance: 0 },
          { name: 'Medicines & Vaccines A/C', type: 'Expense' as const, initialBalance: 0 },
          { name: 'Other Farm Expenses A/C', type: 'Expense' as const, initialBalance: 0 }
        ];
        
        defaultLedgers.forEach(async (ld) => {
          try {
            await addDoc(collection(db, 'ledger_accounts'), {
              ...ld,
              ownerId: profile.uid,
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            console.error("Error creating default ledger:", err);
          }
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'ledger_accounts'));

    // Listen to vouchers
    const unsubVouchers = onSnapshot(query(collection(db, 'accounting_vouchers'), where('ownerId', '==', profile.uid)), (snap) => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setVouchers(sorted);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'accounting_vouchers'));

    return () => { 
      unsubExp(); 
      unsubSales(); 
      unsubLedgers();
      unsubVouchers();
    };
  }, [profile]);

  // Original Expense action
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to record expenses.");
        return;
      }
      const ownerId = profile?.uid || 'unknown';
      await addDoc(collection(db, 'expenses'), {
        ...newExpense,
        ownerId,
        createdAt: new Date().toISOString()
      });

      // Auto-create ledger and post double entry voucher for this expense
      try {
        const fetchLedgerId = async (name: string, type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense', initBal = 0) => {
          const q = query(collection(db, 'ledger_accounts'), where('ownerId', '==', ownerId), where('name', '==', name));
          const snap = await getDocs(q);
          if (!snap.empty) return snap.docs[0].id;
          const ref = await addDoc(collection(db, 'ledger_accounts'), {
            name, type, initialBalance: initBal, ownerId, createdAt: new Date().toISOString()
          });
          return ref.id;
        };

        const getMappedLedgerNameAndType = (cat: string) => {
          switch (cat) {
            case 'Feed':
              return { name: 'Feed Purchases A/C', type: 'Expense' as const };
            case 'Medicine / Vaccine':
            case 'Medicine':
              return { name: 'Medicines & Vaccines A/C', type: 'Expense' as const };
            case 'Labor / Wages':
              return { name: 'Labor & Wages A/C', type: 'Expense' as const };
            case 'Farm Repairs':
              return { name: 'Farm Repairs A/C', type: 'Expense' as const };
            case 'Electricity / Utility':
              return { name: 'Electricity & Utilities A/C', type: 'Expense' as const };
            case 'Transport':
              return { name: 'Transport Expenses A/C', type: 'Expense' as const };
            default:
              return { name: 'Other Farm Expenses A/C', type: 'Expense' as const };
          }
        };

        const { name: expLdrName, type: expLdrType } = getMappedLedgerNameAndType(newExpense.category);
        const expLedgerId = await fetchLedgerId(expLdrName, expLdrType);
        const cashLedgerId = await fetchLedgerId('Cash A/C', 'Asset', 50000);

        // Fetch count to auto-generate voucher number
        const matchingCount = vouchers.filter(v => v.voucherType === 'payment').length + 1;
        const autoVchNo = `PV-${String(1000 + matchingCount).substring(1)}`;

        await addDoc(collection(db, 'accounting_vouchers'), {
          voucherType: 'payment',
          voucherNo: autoVchNo,
          date: newExpense.date || format(new Date(), 'yyyy-MM-dd'),
          debitLedgerId: expLedgerId,
          creditLedgerId: cashLedgerId,
          amount: Number(newExpense.amount),
          narration: newExpense.description || `${newExpense.category} Expense logged`,
          ownerId,
          createdAt: new Date().toISOString()
        });
      } catch (ldrErr) {
        console.error("Failed to auto-create expense ledger or post voucher:", ldrErr);
      }

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_expense',
        category: newExpense.category,
        amount: newExpense.amount,
        ownerId,
        timestamp: new Date().toISOString(),
        userId: ownerId,
        userName: profile?.displayName || 'System'
      });
      setIsAddExpenseOpen(false);
      setNewExpense({ category: 'Feed', amount: 0, description: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'expenses');
    }
  };

  // Original financial aggregations
  const totalIncome = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const downloadReport = () => {
    const doc = new jsPDF();
    const bName = profile?.businessName || 'Farm Fresh Hub';
    doc.setFontSize(20);
    doc.text(`${bName} - Financial Report`, 105, 20, { align: 'center' });
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
      headStyles: { fillColor: [234, 88, 12] }
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

  // LEDGER ACCOUNTING LOGIC & UTILITIES
  const calculateLedgerBalanceDetails = (ledgerId: string) => {
    const ldr = ledgers.find(l => l.id === ledgerId);
    if (!ldr) return { initial: 0, balance: 0, drTotal: 0, crTotal: 0 };
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    vouchers.forEach(v => {
      if (v.debitLedgerId === ledgerId) {
        totalDebit += (Number(v.amount) || 0);
      }
      if (v.creditLedgerId === ledgerId) {
        totalCredit += (Number(v.amount) || 0);
      }
    });

    const initial = Number(ldr.initialBalance) || 0;
    let balance = initial;
    
    if (ldr.type === 'Asset' || ldr.type === 'Expense') {
      balance = initial + totalDebit - totalCredit;
    } else {
      balance = initial + totalCredit - totalDebit;
    }

    return { initial, balance, drTotal: totalDebit, crTotal: totalCredit };
  };

  const getLedgerBalance = (ledgerId: string) => {
    return calculateLedgerBalanceDetails(ledgerId).balance;
  };

  // POST NEW LEDGER
  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLdrName.trim()) return;

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Please verify your email to create ledger accounts.");
        return;
      }

      await addDoc(collection(db, 'ledger_accounts'), {
        name: newLdrName,
        type: newLdrType,
        initialBalance: Number(newLdrOpeningBalance) || 0,
        ownerId: profile?.uid || 'unknown',
        createdAt: new Date().toISOString()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_ledger',
        name: newLdrName,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.displayName || 'System'
      });

      setIsAddLedgerOpen(false);
      setNewLdrName('');
      setNewLdrOpeningBalance(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ledger_accounts');
    }
  };

  // DELETE CUSTOM LEDGER
  const handleDeleteLedger = async (id: string, name: string) => {
    const isProtected = ['Cash A/C', 'Bank A/C', 'Capital A/C', 'Poultry Sales A/C', 'Feed Purchases A/C', 'Medicines & Vaccines A/C', 'Other Farm Expenses A/C'].includes(name);
    if (isProtected) {
      alert("This is a system default ledger and cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ledger: "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'ledger_accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'ledger_accounts');
    }
  };

  // POST NEW VOUCHER
  const handlePostVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vchDebitLdr || !vchCreditLdr) {
      alert("Please select both Debit and Credit Ledger Accounts.");
      return;
    }
    if (vchDebitLdr === vchCreditLdr) {
      alert("Debit and Credit Ledger Accounts cannot be identical.");
      return;
    }
    if (vchAmount <= 0) {
      alert("Voucher amount must be positive.");
      return;
    }

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Please verify your email to post vouchers.");
        return;
      }

      // Generate Voucher Number
      const matchingCount = vouchers.filter(v => v.voucherType === vchType).length + 1;
      const vchPrefix = vchType === 'payment' ? 'PV' : vchType === 'receipt' ? 'RV' : vchType === 'contra' ? 'CV' : 'JV';
      const autoVchNo = `${vchPrefix}-${String(1000 + matchingCount).substring(1)}`;

      await addDoc(collection(db, 'accounting_vouchers'), {
        voucherType: vchType,
        voucherNo: autoVchNo,
        date: vchDate,
        debitLedgerId: vchDebitLdr,
        creditLedgerId: vchCreditLdr,
        amount: Number(vchAmount),
        narration: vchNarration,
        ownerId: profile?.uid || 'unknown',
        createdAt: new Date().toISOString()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_voucher',
        voucherType: vchType,
        voucherNo: autoVchNo,
        amount: Number(vchAmount),
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.displayName || 'System'
      });

      // Reset form fields
      setVchAmount(0);
      setVchNarration('');
      alert(`Voucher ${autoVchNo} posted successfully!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'accounting_vouchers');
    }
  };

  // GENERATE CHRONOLOGICAL TRANSACTION STATEMENT FOR SELECTED LEDGER
  const getLedgerStatementData = (ledgerId: string) => {
    const ldr = ledgers.find(l => l.id === ledgerId);
    if (!ldr) return { postings: [], summary: { initial: 0, drTotal: 0, crTotal: 0, balance: 0 } };

    const initial = Number(ldr.initialBalance) || 0;
    const sortedVouchers = [...vouchers]
      .filter(v => v.debitLedgerId === ledgerId || v.creditLedgerId === ledgerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBal = initial;
    let drTotalSum = 0;
    let crTotalSum = 0;

    const postings = sortedVouchers.map(v => {
      const isDebit = v.debitLedgerId === ledgerId;
      const otherLedgerId = isDebit ? v.creditLedgerId : v.debitLedgerId;
      const otherLdr = ledgers.find(l => l.id === otherLedgerId);
      const particularsName = otherLdr ? otherLdr.name : 'Unknown Account';
      const particularsText = isDebit ? `To ${particularsName}` : `By ${particularsName}`;
      
      const vAmt = Number(v.amount) || 0;
      let drAmount = 0;
      let crAmount = 0;

      if (isDebit) {
        drAmount = vAmt;
        drTotalSum += vAmt;
        if (ldr.type === 'Asset' || ldr.type === 'Expense') {
          runningBal += vAmt;
        } else {
          runningBal -= vAmt;
        }
      } else {
        crAmount = vAmt;
        crTotalSum += vAmt;
        if (ldr.type === 'Asset' || ldr.type === 'Expense') {
          runningBal -= vAmt;
        } else {
          runningBal += vAmt;
        }
      }

      return {
        id: v.id,
        date: v.date,
        voucherNo: v.voucherNo,
        voucherType: v.voucherType,
        particulars: particularsText,
        narration: v.narration || '',
        debit: drAmount,
        credit: crAmount,
        runningBalance: runningBal
      };
    });

    return {
      postings,
      summary: {
        initial,
        drTotal: drTotalSum,
        crTotal: crTotalSum,
        balance: runningBal
      }
    };
  };

  // DOWNLOAD LEDGER REPORT PDF
  const downloadLedgerReportPDF = (ledgerId: string) => {
    const ldr = ledgers.find(l => l.id === ledgerId);
    if (!ldr) return;

    const { postings, summary } = getLedgerStatementData(ledgerId);
    const bName = profile?.businessName || 'Farm Fresh Hub';

    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text(bName.toUpperCase(), 105, 18, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(`GENERAL LEDGER STATEMENT: ${ldr.name.toUpperCase()}`, 105, 26, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`Account Type: ${ldr.type}  |  Generated On: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 105, 33, { align: 'center' });

    // Summary Box grid
    pdf.rect(14, 38, 182, 22);
    pdf.setFont("helvetica", "bold");
    pdf.text("Opening Balance: ", 20, 44);
    pdf.text("Total Debits (Dr): ", 20, 52);
    pdf.text(`₹${summary.initial.toLocaleString()}`, 65, 44);
    pdf.text(`₹${summary.drTotal.toLocaleString()}`, 65, 52);

    pdf.text("Total Credits (Cr): ", 110, 44);
    pdf.text("Closing/Net Balance: ", 110, 52);
    pdf.text(`₹${summary.crTotal.toLocaleString()}`, 155, 44);
    pdf.text(`₹${summary.balance.toLocaleString()}`, 155, 52);

    const tableRows = postings.map(p => [
      format(new Date(p.date), 'dd MMM yyyy'),
      p.voucherNo.toUpperCase(),
      p.particulars,
      p.narration || '-',
      p.debit > 0 ? `₹${p.debit.toLocaleString()}` : '-',
      p.credit > 0 ? `₹${p.credit.toLocaleString()}` : '-',
      `₹${p.runningBalance.toLocaleString()}`
    ]);

    (pdf as any).autoTable({
      startY: 66,
      head: [['Date', 'Voucher No', 'Particulars', 'Narration', 'Debits (Dr)', 'Credits (Cr)', 'Running Balance']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [41, 37, 36], halign: 'left' },
      styles: { fontSize: 8.5 }
    });

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text("End of Ledger Report. System generated by Farm Fresh Hub Secure Accounting Module Core V3.", 105, (pdf as any).lastAutoTable.finalY + 15, { align: 'center' });

    pdf.save(`Ledger_Report_${ldr.name.replace(/\s+/g, '_')}_${format(new Date(), 'dd_MMM_yyyy')}.pdf`);
  };

  const generateVoucherPDF = (v: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const bName = profile?.businessName || 'Farm Fresh Hub';
    const debitLdr = ledgers.find(l => l.id === v.debitLedgerId)?.name || 'Unknown Account';
    const creditLdr = ledgers.find(l => l.id === v.creditLedgerId)?.name || 'Unknown Account';
    
    // Outer border
    doc.setDrawColor(230, 224, 215);
    doc.setLineWidth(0.5);
    doc.rect(4, 4, 140, 202);

    // Decorative colors & header block background
    doc.setFillColor(234, 88, 12); // Orange theme
    doc.rect(4, 4, 140, 22, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(bName.toUpperCase(), 74, 11, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('AUTOMATED LEDGER BOOKKEEPING RECEIPT', 74, 16, { align: 'center' });
    
    // Voucher Type Title
    doc.setTextColor(34, 34, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const vTypeName = v.voucherType === 'payment' ? 'PAYMENT VOUCHER' 
                    : v.voucherType === 'receipt' ? 'RECEIPT VOUCHER' 
                    : v.voucherType === 'contra' ? 'CONTRA VOUCHER' 
                    : 'JOURNAL VOUCHER';
    doc.text(vTypeName, 74, 36, { align: 'center' });

    // Details Grid box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.rect(8, 42, 132, 22, 'F');
    doc.rect(8, 42, 132, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('VOUCHER NUMBER', 12, 48);
    doc.text('DATE OF TRANSACTION', 74, 48);
    doc.text('STATUS', 114, 48);

    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(v.voucherNo.toUpperCase(), 12, 53);
    doc.text(format(new Date(v.date), 'dd MMMM yyyy'), 74, 53);
    doc.setTextColor(22, 101, 52); // helper green success status
    doc.text('POSTED & VERIFIED', 114, 53);

    // Double Entry Table
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(245, 245, 245);
    doc.rect(8, 70, 132, 44);
    doc.line(8, 80, 140, 80); // section title line
    doc.line(74, 70, 74, 114); // vertical middle partition line

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('DEBIT ACCOUNT (DR)', 12, 76);
    doc.text('CREDIT ACCOUNT (CR)', 78, 76);

    // Dynamic Account Ledger values
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(debitLdr, 12, 88, { maxWidth: 58 });
    doc.text(creditLdr, 78, 88, { maxWidth: 58 });

    // Account Type info subtitled
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    const debitLdrType = ledgers.find(l => l.id === v.debitLedgerId)?.type || 'Expense';
    const creditLdrType = ledgers.find(l => l.id === v.creditLedgerId)?.type || 'Asset';
    doc.text(`Group Type: ${debitLdrType}`, 12, 94);
    doc.text(`Group Type: ${creditLdrType}`, 78, 94);

    // Ledger balance note at booking time
    doc.text(`Verified Book Balance Checked`, 12, 108);
    doc.text(`Verified Book Balance Checked`, 78, 108);

    // Narration Description Box
    doc.setDrawColor(220, 220, 220);
    doc.rect(8, 120, 132, 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('NARRATION / REMARKS', 12, 126);

    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(v.narration || 'No description provided.', 12, 132, { maxWidth: 124 });

    // Total Amount highlight panel
    doc.setFillColor(254, 243, 199); // light orange amber panel
    doc.rect(8, 148, 132, 14, 'F');
    doc.rect(8, 148, 132, 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 83, 9); // amber text
    doc.text(`LEDGER POSTING VALUE: INR ₹ ${(Number(v.amount) || 0).toLocaleString()}/-`, 12, 157);

    // Signature areas
    doc.line(12, 185, 52, 185);
    doc.line(96, 185, 136, 185);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('PREPARED BY (ACCOUNTANT)', 15, 190);
    doc.text('AUTHORIZED SIGNATURE', 101, 190);

    return doc;
  };

  const downloadVoucherPDF = (v: any) => {
    const docObj = generateVoucherPDF(v);
    docObj.save(`Voucher_${v.voucherNo.toUpperCase()}.pdf`);
  };

  const printVoucher = (v: any) => {
    const docObj = generateVoucherPDF(v);
    const url = docObj.output('bloburl');
    window.open(url, '_blank');
  };

  // Filter dynamic accounts based on search
  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
    l.type.toLowerCase().includes(ledgerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Farm Accounting & Ledgers Suite</h1>
          <p className="text-xs text-stone-500 font-medium mt-1">Double-Entry Financial Management & Interactive Voucher Bookkeeping</p>
        </div>
        
        {/* Dynamic Nav Tabs within Accounts */}
        <div className="flex flex-wrap gap-1 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
          <button
            onClick={() => setInnerTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              innerTab === 'overview'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Wallet size={14} />
            Overview
          </button>
          
          <button
            onClick={() => setInnerTab('ledgers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              innerTab === 'ledgers'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <BookOpen size={14} />
            Ledger Accounts
          </button>

          <button
            onClick={() => setInnerTab('vouchers')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              innerTab === 'vouchers'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Receipt size={14} />
            Voucher Entry
          </button>

          <button
            onClick={() => setInnerTab('reports')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-wider ${
              innerTab === 'reports'
                ? 'bg-stone-900 text-white shadow-md'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <FileText size={14} />
            Ledger Reports
          </button>
        </div>
      </div>

      {/* RENDER INNER MODULE CONTENT */}
      
      {/* 1. OVERVIEW (Standard Existing Module UI) */}
      {innerTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
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
                <p className="text-xs text-green-200 mt-1">Cumulative Sales</p>
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
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-stone-600 flex items-center gap-2">
                  <Wallet size={16} className="text-orange-600" />
                  Expense Transaction History
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
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-stone-400">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-stone-700">{cat}</span>
                      <span className="font-bold text-stone-900">₹{amt.toLocaleString()}</span>
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
        </div>
      )}

      {/* 2. LEDGER ACCOUNTS CARD */}
      {innerTab === 'ledgers' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Info Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-950 text-sm uppercase tracking-wider">Bookkeeping Chart of Accounts</h3>
              <p className="text-stone-600 text-xs mt-1 leading-relaxed">
                Configure your ledgers including Assets, Expense accounts, capital groups, and Revenue accounts.
                Opening balances are computed with continuous postings of dynamic Cash and Bank vouchers to produce real-time, consolidated general ledger ledger reports.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <Input
                placeholder="Search ledger by name..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <Button
              onClick={() => setIsAddLedgerOpen(true)}
              className="w-full sm:w-auto bg-stone-900 text-white rounded-xl h-11 px-5"
            >
              <Plus size={16} className="mr-2" />
              Add Ledger Account
            </Button>
          </div>

          {/* Ledger Accounts Table */}
          <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ledger Account Name</TableHead>
                  <TableHead>Group Classification</TableHead>
                  <TableHead className="text-right">Opening Balance (₹)</TableHead>
                  <TableHead className="text-right">Current Ledger Balance (₹)</TableHead>
                  <TableHead className="text-right">Operation Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedgers.map((l) => {
                  const details = calculateLedgerBalanceDetails(l.id);
                  const isProtected = ['Cash A/C', 'Bank A/C', 'Capital A/C', 'Poultry Sales A/C', 'Feed Purchases A/C', 'Medicines & Vaccines A/C', 'Other Farm Expenses A/C'].includes(l.name);
                  
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-semibold text-stone-900">{l.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full uppercase tracking-wider text-[10px] px-2.5 py-0.5">
                          {l.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-stone-500">
                        ₹{(Number(l.initialBalance) || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-stone-950">
                        ₹{details.balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isProtected ? (
                          <span className="text-[10px] text-stone-400 font-bold uppercase select-none tracking-widest bg-stone-100 px-2 py-1 rounded">System Default</span>
                        ) : (
                          <Button
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDeleteLedger(l.id, l.name)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLedgers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-stone-400 italic">No ledger accounts meet the target criteria</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 3. VOUCHER ENTRY FORM CARD */}
      {innerTab === 'vouchers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          {/* Form left */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <div className="bg-stone-900 text-white p-5">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Receipt size={18} />
                  Posting Journal Voucher
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">Dual Entry Balance Sheet Ledger Postings</p>
              </div>

              {/* Voucher Sub-Type switcher */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-stone-50 border-b border-stone-100">
                {(['payment', 'receipt', 'contra', 'general'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setVchType(t);
                      setVchDebitLdr('');
                      setVchCreditLdr('');
                    }}
                    className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      vchType === t
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {t === 'general' ? 'journal' : t}
                  </button>
                ))}
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Helpful Hints based on dynamic type */}
                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-100 text-[11px] text-stone-500 leading-relaxed">
                  {vchType === 'payment' && "Payment Voucher (PV): Record expenses, purchases or payments. Debit any Ledger Account and Credit cash or bank accounts."}
                  {vchType === 'receipt' && "Receipt Voucher (RV): Record incoming cash, bank deposits, capital contributions, or bird sales. Debit cash/bank and Credit your income/sales account."}
                  {vchType === 'contra' && "Contra Voucher (CV): Record physical cash deposits or withdrawals between Bank A/C and Cash A/C. Strictly debits and credits Cash / Bank Accounts."}
                  {vchType === 'general' && "Journal Voucher (JV): Record credit purchases, adjustments, asset depreciation, or other non-cash double-entry transaction allocations."}
                </div>

                <form onSubmit={handlePostVoucher} className="space-y-4">
                  {/* Voucher Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Transaction Date</label>
                    <Input
                      type="date"
                      required
                      value={vchDate}
                      onChange={e => setVchDate(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Debit Ledger Account */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Debit (Dr) Account / Received To</label>
                    <select
                      required
                      value={vchDebitLdr}
                      onChange={e => setVchDebitLdr(e.target.value)}
                      className="w-full h-11 border border-stone-200 bg-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-orange-50"
                    >
                      <option value="">-- Choose Debit Account --</option>
                      {ledgers
                        .filter(l => {
                          if (vchType === 'receipt') return l.type === 'Asset'; // Receipts must debit cash/bank
                          if (vchType === 'contra') return l.name === 'Bank A/C' || l.name === 'Cash A/C'; // Contra debit
                          return true;
                        })
                        .map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.type}) • Bal: ₹{getLedgerBalance(l.id).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Credit Ledger Account */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Credit (Cr) Account / Paid From</label>
                    <select
                      required
                      value={vchCreditLdr}
                      onChange={e => setVchCreditLdr(e.target.value)}
                      className="w-full h-11 border border-stone-200 bg-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-orange-50"
                    >
                      <option value="">-- Choose Credit Account --</option>
                      {ledgers
                        .filter(l => {
                          if (vchType === 'payment') return l.name === 'Bank A/C' || l.name === 'Cash A/C'; // Payment credits cash/bank
                          if (vchType === 'contra') return l.name === 'Bank A/C' || l.name === 'Cash A/C'; // Contra credit
                          return true;
                        })
                        .map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.type}) • Bal: ₹{getLedgerBalance(l.id).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Voucher Amount (₹)</label>
                    <Input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 1500"
                      value={vchAmount || ''}
                      onChange={e => setVchAmount(Number(e.target.value))}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Narration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Narration / Transaction Note</label>
                    <Input
                      required
                      placeholder="e.g. Purchased vaccine batch 243 for broiler chicks"
                      value={vchNarration}
                      onChange={e => setVchNarration(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-100"
                  >
                    Post Ledger Entry
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers list right */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden p-2">
              <CardHeader className="border-b border-stone-50 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-stone-600">Journal Audit Logs</CardTitle>
                </div>
                <Badge variant="outline" className="rounded-full">{vouchers.length} Total Postings</Badge>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher No</TableHead>
                      <TableHead>Debit (Dr)</TableHead>
                      <TableHead>Credit (Cr)</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((v) => {
                      const debitLdr = ledgers.find(l => l.id === v.debitLedgerId)?.name || 'Unknown Db';
                      const creditLdr = ledgers.find(l => l.id === v.creditLedgerId)?.name || 'Unknown Cr';
                      return (
                        <TableRow key={v.id} className="text-xs">
                          <TableCell className="font-bold text-stone-900 uppercase">
                            <div>{v.voucherNo}</div>
                            <div className="text-[9px] text-stone-400 font-normal">{v.date}</div>
                          </TableCell>
                          <TableCell className="font-medium text-emerald-700">{debitLdr}</TableCell>
                          <TableCell className="font-medium text-amber-700">{creditLdr}</TableCell>
                          <TableCell className="text-right font-black text-stone-900">
                            <div>₹{(Number(v.amount) || 0).toLocaleString()}</div>
                            <div className="text-[9px] text-stone-400 font-normal truncate max-w-[150px]" title={v.narration}>{v.narration || '-'}</div>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap space-x-1">
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 rounded-lg text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="Download PDF"
                              onClick={() => downloadVoucherPDF(v)}
                            >
                              <Download size={14} />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 rounded-lg text-stone-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              title="Print Voucher"
                              onClick={() => printVoucher(v)}
                            >
                              <Printer size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {vouchers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-stone-400 italic">No bookkeeping vouchers posted yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 4. LEDGER REPORTS CARD */}
      {innerTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filter Bar Card */}
          <Card className="rounded-[2.5rem] border-stone-200 shadow-sm p-6 bg-stone-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Target Ledger Account Selection</label>
                <select
                  value={selectedReportLdrId}
                  onChange={e => setSelectedReportLdrId(e.target.value)}
                  className="w-full h-12 border border-stone-200 bg-white rounded-xl px-3 text-sm focus:ring-2 focus:ring-orange-50 font-semibold"
                >
                  <option value="">-- Choose Account to inspect --</option>
                  {ledgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Button
                  disabled={!selectedReportLdrId}
                  onClick={() => downloadLedgerReportPDF(selectedReportLdrId)}
                  className="w-full h-12 bg-stone-950 text-white rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                >
                  <Download size={16} />
                  Download Ledger PDF Report
                </Button>
              </div>
            </div>
          </Card>

          {/* Report Viewer Pane */}
          {selectedReportLdrId ? (
            (() => {
              const selectedLdr = ledgers.find(l => l.id === selectedReportLdrId);
              const { postings, summary } = getLedgerStatementData(selectedReportLdrId);
              
              return (
                <div className="space-y-6">
                  {/* Ledger Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-stone-200 rounded-3xl p-5">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">Initial Opening</p>
                      <h4 className="text-xl font-extrabold text-stone-950 text-center mt-1">₹{summary.initial.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-3xl p-5">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Total Debits</p>
                      <h4 className="text-xl font-extrabold text-emerald-600 text-center mt-1">₹{summary.drTotal.toLocaleString()}</h4>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-3xl p-5">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest text-center">Total Credits</p>
                      <h4 className="text-xl font-extrabold text-amber-600 text-center mt-1">₹{summary.crTotal.toLocaleString()}</h4>
                    </div>
                    <div className="bg-stone-950 text-white rounded-3xl p-5 shadow-lg shadow-stone-200">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">Net Balance</p>
                      <h4 className="text-xl font-extrabold text-center mt-1">₹{summary.balance.toLocaleString()}</h4>
                    </div>
                  </div>

                  {/* Transaction Postings list */}
                  <Card className="rounded-[2.5rem] border-stone-200 shadow-sm overflow-hidden p-2">
                    <div className="p-4 border-b border-stone-50 bg-stone-50/50">
                      <h3 className="font-extrabold text-stone-950 text-xs uppercase tracking-wider">
                        Posting Entries: {selectedLdr?.name}
                      </h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Voucher No</TableHead>
                          <TableHead>Particulars</TableHead>
                          <TableHead>Narration</TableHead>
                          <TableHead className="text-right">Debit (Dr) (₹)</TableHead>
                          <TableHead className="text-right">Credit (Cr) (₹)</TableHead>
                          <TableHead className="text-right font-bold">Debit Balance (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="bg-stone-50">
                          <TableCell colSpan={4} className="font-semibold text-stone-500">Opening Balance Brought Forward</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold text-stone-900">₹{summary.initial.toLocaleString()}</TableCell>
                        </TableRow>
                        
                        {postings.map((p, index) => (
                          <TableRow key={p.id || index} className="text-xs">
                            <TableCell className="text-stone-500">{format(new Date(p.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-semibold text-stone-800 uppercase">{p.voucherNo}</TableCell>
                            <TableCell className="font-medium text-stone-950">{p.particulars}</TableCell>
                            <TableCell className="text-stone-500 italic max-w-[150px] truncate" title={p.narration}>{p.narration || '-'}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-bold">
                              {p.debit > 0 ? `₹${p.debit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-amber-600 font-bold">
                              {p.credit > 0 ? `₹${p.credit.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-stone-950">
                              ₹{p.runningBalance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}

                        {postings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-stone-400 italic">No transactions recorded for this ledger in Selected period.</TableCell>
                          </TableRow>
                        )}
                        
                        <TableRow className="bg-stone-100 font-bold">
                          <TableCell colSpan={4} className="uppercase text-stone-700">Consolidated Period Totals</TableCell>
                          <TableCell className="text-right text-emerald-700">₹{summary.drTotal.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-amber-700">₹{summary.crTotal.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-stone-950">₹{summary.balance.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              );
            })()
          ) : (
            <div className="bg-white border border-stone-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
              <FileText size={48} className="text-stone-300 mb-4" />
              <h4 className="font-bold text-stone-900 text-sm">No Ledger Selected</h4>
              <p className="text-stone-400 text-xs mt-1 max-w-sm">Please select a bookkeeping account from the list above to render transactional ledgers and download PDF statements.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW LEDGER DIAGRAM/DIALOG */}
      {isAddLedgerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2.5rem] shadow-2xl bg-white border border-stone-100 overflow-hidden">
            <div className="bg-stone-900 text-white p-6">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Plus size={18} />
                Create New Ledger Account
              </h3>
            </div>
            <CardContent className="p-6">
              <form onSubmit={handleCreateLedger} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Ledger Name</label>
                  <Input 
                    required 
                    placeholder="e.g. Chiranjeev Feed Suppliers" 
                    value={newLdrName}
                    onChange={e => setNewLdrName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Account Classification Group</label>
                  <select 
                    className="w-full h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-50 font-medium"
                    value={newLdrType}
                    onChange={e => setNewLdrType(e.target.value as any)}
                  >
                    <option value="Asset">Asset (Cash, Bank, Property)</option>
                    <option value="Liability">Liability (Loans, Accounts Payable)</option>
                    <option value="Equity">Equity (Capital, Personal Investment)</option>
                    <option value="Revenue">Revenue (Poultry Sales, Direct Income)</option>
                    <option value="Expense">Expense (Feed, medicine, transport, utility)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Initial Opening Balance (₹)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 0" 
                    value={newLdrOpeningBalance || ''}
                    onChange={e => setNewLdrOpeningBalance(Number(e.target.value))}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddLedgerOpen(false)} className="flex-1 rounded-xl h-11 text-stone-500">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white hover:bg-stone-800 rounded-xl h-11 font-bold">Create Account</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ORIGINAL MODAL: Add Expense (fully preserved) */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl bg-white">
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
