import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, where, getDocs } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, Phone, MapPin, CreditCard, Plus, Search, ArrowLeft, History } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

export default function CustomerModule({ action, onActionComplete, profile }: { action?: string | null, onActionComplete?: () => void, profile?: any }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedHistoryCust, setSelectedHistoryCust] = useState<any>(null);
  const [customerSales, setCustomerSales] = useState<any[]>([]);

  useEffect(() => {
    if (action === 'add-cust') {
      setIsAddOpen(true);
      onActionComplete?.();
    }
  }, [action]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    creditBalance: 0
  });

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleCustId, setSettleCustId] = useState('');
  const [settleCustName, setSettleCustName] = useState('');
  const [settleDuesAmount, setSettleDuesAmount] = useState(0);
  const [settlePayValue, setSettlePayValue] = useState('');
  const [settlePaymentMode, setSettlePaymentMode] = useState<'Cash' | 'UPI' | 'Net Banking' | 'Debit/Credit Card'>('Cash');

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'customers'), where('ownerId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const sortedCustomers = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(sortedCustomers);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));
    return () => unsub();
  }, [profile]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to register customers.");
        return;
      }
      const ownerId = profile?.uid || auth.currentUser?.uid || 'unknown';
      const custDocRef = await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        ownerId,
        history: [],
        createdAt: new Date().toISOString()
      });

      // Auto-create Ledger Account for newly added customer
      try {
        const ledgerName = `${newCustomer.name.trim()} (Customer A/C)`;
        const qLdr = query(
          collection(db, 'ledger_accounts'),
          where('ownerId', '==', ownerId),
          where('name', '==', ledgerName)
        );
        const ldrSnap = await getDocs(qLdr);
        if (ldrSnap.empty) {
          await addDoc(collection(db, 'ledger_accounts'), {
            name: ledgerName,
            type: 'Asset',
            initialBalance: Number(newCustomer.creditBalance) || 0,
            ownerId,
            customerId: custDocRef.id,
            createdAt: new Date().toISOString()
          });
        }
      } catch (ldrErr) {
        console.error("Failed to auto-create customer ledger:", ldrErr);
      }

      setIsAddOpen(false);
      setNewCustomer({ name: '', phone: '', address: '', creditBalance: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    }
  };

  const fetchCustomerHistory = async (customer: any) => {
    try {
      if (!profile) return;
      const q = query(
        collection(db, 'sales'), 
        where('ownerId', '==', profile.uid)
      );
      const snap = await getDocs(q);
      const allSales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = allSales.filter((s: any) => s.customerId === customer.id);
      const sortedDocs = filtered.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setCustomerSales(sortedDocs);
      setSelectedHistoryCust(customer);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'sales');
    }
  };
  const handleSettleDues = async (customerId: string, currentBalance: number) => {
    const cust = customers.find(c => c.id === customerId);
    setSettleCustId(customerId);
    setSettleCustName(cust?.name || 'Unknown');
    setSettleDuesAmount(currentBalance);
    setSettlePayValue(currentBalance.toString());
    setSettlePaymentMode('Cash');
    setSettleModalOpen(true);
  };

  const submitSettleDues = async (e: React.FormEvent) => {
    e.preventDefault();
    const payment = Number(settlePayValue);
    if (!payment || isNaN(payment) || payment <= 0) {
      alert("Please enter a valid positive payment amount.");
      return;
    }

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified.");
        return;
      }
      const ownerId = profile?.uid || auth.currentUser?.uid || 'unknown';
      const custRef = doc(db, 'customers', settleCustId);
      
      // 1. Update the Customer credit balance
      await updateDoc(custRef, {
        creditBalance: increment(-payment)
      });

      const actualCustName = settleCustName || customers.find(c => c.id === settleCustId)?.name || 'Unknown';

      // 2. Add payment record to sales collection (fully matching previous logic)
      await addDoc(collection(db, 'sales'), {
        invoiceNo: `PYMT-${Date.now().toString().slice(-6)}`,
        items: [{ name: 'Credit Payment', total: payment, quantity: 1, unit: 'pcs' }],
        total: payment,
        paymentStatus: 'paid',
        paymentMode: settlePaymentMode,
        customerId: settleCustId,
        customerName: actualCustName,
        ownerId,
        timestamp: new Date().toISOString(),
        type: 'payment',
        userId: ownerId
      });

      // 3. Post double entry accounting journal/receipt voucher!
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

        const custLedgerId = await fetchLedgerId(`${actualCustName.trim()} (Customer A/C)`, 'Asset');
        const paymentLedgerName = settlePaymentMode === 'Cash' ? 'Cash A/C' : 'Bank A/C';
        const pmtLedgerId = await fetchLedgerId(paymentLedgerName, 'Asset');

        // Fetch voucher count for unique RV sequence
        const matchingVchCount = (await getDocs(query(collection(db, 'accounting_vouchers'), where('ownerId', '==', ownerId)))).size + 1;
        const autoVchNo = `RV-${1000 + matchingVchCount}`;

        await addDoc(collection(db, 'accounting_vouchers'), {
          voucherType: 'receipt',
          voucherNo: autoVchNo,
          date: format(new Date(), 'yyyy-MM-dd'),
          debitLedgerId: pmtLedgerId,
          creditLedgerId: custLedgerId,
          amount: payment,
          narration: `Dues settled by ${actualCustName} via ${settlePaymentMode}`,
          ownerId,
          createdAt: new Date().toISOString()
        });
      } catch (ldrErr) {
        console.error("Failed to automatically post accounting voucher for customer settlement:", ldrErr);
      }

      setSettleModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${settleCustId}`);
    }
  };

  const currentCustWithUpdates = selectedHistoryCust
    ? (customers.find(c => c.id === selectedHistoryCust.id) || selectedHistoryCust)
    : null;

  if (currentCustWithUpdates) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedHistoryCust(null)} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h3 className="text-xl font-bold">{currentCustWithUpdates.name}'s History</h3>
            <p className="text-sm text-stone-500">{currentCustWithUpdates.phone}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[2rem] bg-orange-50 border-orange-100">
            <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Total Sales</p>
            <p className="text-2xl font-black text-orange-900 mt-1">{customerSales.length}</p>
          </Card>
          <Card className="p-6 rounded-[2rem] bg-green-50 border-green-100">
            <p className="text-[10px] font-black uppercase text-green-400 tracking-widest">Revenue Generated</p>
            <p className="text-2xl font-black text-green-900 mt-1">₹{customerSales.reduce((sum, s) => sum + (s.total || 0), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-6 rounded-[2rem] bg-red-50 border-red-100">
            <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Current Dues</p>
            <p className="text-2xl font-black text-red-900 mt-1">₹{currentCustWithUpdates.creditBalance.toLocaleString()}</p>
          </Card>
        </div>

        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-stone-50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="text-stone-500">{format(new Date(sale.timestamp), 'MMM dd, p')}</TableCell>
                  <TableCell className="font-mono text-xs">{sale.invoiceNo}</TableCell>
                  <TableCell>
                    <p className="text-xs text-stone-600 truncate max-w-[200px]">
                      {sale.items.map((i: any) => `${i.name} x ${i.quantity}`).join(', ')}
                    </p>
                  </TableCell>
                  <TableCell className="font-bold text-stone-900">₹{sale.total}</TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentStatus === 'paid' ? 'outline' : 'destructive'} className="rounded-full">
                      {sale.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {customerSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-stone-400 italic">No transactions found for this customer.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Users className="text-orange-600" />
          Customer Database
        </h3>
        <Button onClick={() => setIsAddOpen(true)} className="rounded-xl bg-stone-900 text-white">
          <Plus size={18} className="mr-2" />
          Add Customer
        </Button>
      </div>

      <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Udhaar Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((cust) => (
              <TableRow key={cust.id}>
                <TableCell className="font-bold">{cust.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-stone-500">
                    <Phone size={14} />
                    {cust.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-stone-500 max-w-[200px] truncate">
                    <MapPin size={14} />
                    {cust.address}
                  </div>
                </TableCell>
                <TableCell>
                  {cust.creditBalance > 0 ? (
                    <Badge className="bg-red-100 text-red-700 font-bold">
                      ₹{cust.creditBalance.toLocaleString()}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-stone-400">No Dues</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-stone-600 font-bold rounded-lg border-stone-200"
                    onClick={() => handleSettleDues(cust.id, cust.creditBalance)}
                    disabled={cust.creditBalance === 0}
                  >
                    Settle Dues
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-orange-600 font-bold"
                    onClick={() => fetchCustomerHistory(cust)}
                  >
                    View History
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Register New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Full Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newCustomer.name} 
                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Phone Number</label>
                  <Input 
                    required 
                    type="tel"
                    className="h-12 rounded-2xl" 
                    value={newCustomer.phone} 
                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Address</label>
                  <Input 
                    className="h-12 rounded-2xl" 
                    value={newCustomer.address} 
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Register</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {settleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-stone-900">Settle Customer Dues</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitSettleDues} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Customer Name</label>
                  <p className="text-lg font-bold text-stone-800">{settleCustName}</p>
                </div>

                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs text-red-600 font-bold block">Current Outstanding</span>
                    <span className="text-2xl font-black text-red-800">₹{settleDuesAmount.toLocaleString()}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-red-700 hover:bg-red-100 font-bold rounded-lg"
                    onClick={() => setSettlePayValue(settleDuesAmount.toString())}
                  >
                    Pay Full
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Settle Payment Amount (₹)</label>
                  <Input 
                    required 
                    type="number"
                    step="any"
                    min="0.01"
                    className="h-12 rounded-2xl border-stone-200 text-lg font-bold tracking-wide" 
                    value={settlePayValue} 
                    onChange={e => setSettlePayValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Cash', label: 'Cash' },
                      { id: 'UPI', label: 'UPI/Online' },
                      { id: 'Net Banking', label: 'Net Banking' },
                      { id: 'Debit/Credit Card', label: 'Card' }
                    ].map((mode) => (
                      <Button
                        key={mode.id}
                        type="button"
                        variant={settlePaymentMode === mode.id ? 'default' : 'outline'}
                        className={`h-10 text-xs rounded-xl font-bold transition-all border ${
                          settlePaymentMode === mode.id 
                            ? 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700' 
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                        onClick={() => setSettlePaymentMode(mode.id as any)}
                      >
                        {mode.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setSettleModalOpen(false)} className="flex-1 rounded-2xl h-12 font-bold text-stone-600">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12 font-bold hover:bg-stone-800">Confirm Payment</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
