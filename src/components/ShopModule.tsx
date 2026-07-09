import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, getDoc, setDoc, updateDoc, increment, getDocs, where, writeBatch } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ShoppingCart, ReceiptText, UserPlus, Printer, Trash2, Search, MessageSquare, Percent, XCircle, History, FileDown, Settings } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { shopUtils } from '../lib/shopUtils';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '../lib/utils';

const localStorage = safeLocalStorage;

const UNIT_FACTORS: Record<string, number> = {
  'kg': 1,
  'gram': 0.001,
  'quintal': 100,
  'pcs': 1,
  'egg': 1,
  'set': 1
};

export default function ShopModule({ action, onActionComplete, profile }: { action?: string | null, onActionComplete?: () => void, profile?: any }) {
  const { t } = useTranslation();
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    if (action === 'new-sale') {
      setCart([]);
      setSelectedCustomer(null);
      setSearchPhone('');
      setTimeout(() => onActionComplete?.(), 0);
    }
  }, [action]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
  const [gstEnabled, setGstEnabled] = useState(true);
  const gstRate = 0.05; // 5% GST
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isNewCustOpen, setIsNewCustOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isEditCustOpen, setIsEditCustOpen] = useState(false);
  const [editCust, setEditCust] = useState({ name: '', phone: '', address: '' });
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);
  const [customerDialogTab, setCustomerDialogTab] = useState<'list' | 'create'>('list');
  const [dialogSearch, setDialogSearch] = useState('');
  const [paidInput, setPaidInput] = useState<string>('');
  const [isUdhaarMode, setIsUdhaarMode] = useState<boolean>(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'Cash' | 'UPI' | 'Net Banking' | 'Debit/Credit Card'>('Cash');
  
  const [itemInput, setItemInput] = useState({
    name: '',
    itemId: '',
    quantity: '' as any,
    price: '' as any,
    unit: 'kg'
  });
  const [printerSize, setPrinterSize] = useState<'standard' | '3inch' | '4inch'>(() => {
    return (localStorage.getItem('printerSize') as 'standard' | '3inch' | '4inch') || 'standard';
  });
  const [invPrefix, setInvPrefix] = useState<string>(() => localStorage.getItem('invPrefix') ?? 'INV');
  const [invSuffix, setInvSuffix] = useState<string>(() => localStorage.getItem('invSuffix') ?? '');
  const [invFY, setInvFY] = useState<string>(() => localStorage.getItem('invFY') ?? '2026-27');
  const [autoPrintOnSale, setAutoPrintOnSale] = useState<boolean>(() => localStorage.getItem('autoPrintOnSale') === 'true');

  const getTaxBreakdown = (sale: any) => {
    const cgst = (sale.gstAmount || 0) / 2;
    const sgst = (sale.gstAmount || 0) / 2;
    return { cgst, sgst, igst: 0 };
  };

  useEffect(() => {
    if (!profile) return;

    const qSales = query(collection(db, 'sales'), where('ownerId', '==', profile.uid), limit(10));
    const unsubSales = onSnapshot(qSales, (snap) => {
      const sortedSales = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setSales(sortedSales);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const qInv = query(collection(db, 'inventory'), where('ownerId', '==', profile.uid));
    const unsubInv = onSnapshot(qInv, (snap) => {
      setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));

    const qCust = query(collection(db, 'customers'), where('ownerId', '==', profile.uid));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'customers'));

    return () => { unsubSales(); unsubInv(); unsubCust(); };
  }, [profile]);

  useEffect(() => {
    if (selectedCustomer) {
      const updated = customers.find(c => c.id === selectedCustomer.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCustomer)) {
        setSelectedCustomer(updated);
      }
    }
  }, [customers, selectedCustomer]);

  const addToCart = () => {
    if (!itemInput.itemId || !itemInput.quantity || !itemInput.price) return;
    
    const qty = Number(itemInput.quantity);
    const price = Number(itemInput.price);
    
    const invItem = inventoryItems.find(i => i.id === itemInput.itemId);
    if (!invItem) return;

    const inputFactor = UNIT_FACTORS[itemInput.unit.toLowerCase()] || 1;
    const baseFactor = UNIT_FACTORS[invItem.unit.toLowerCase()] || 1;
    const baseQuantity = qty * (inputFactor / baseFactor);

    if (baseQuantity > invItem.quantity) {
      alert(t('insufficient_stock', { count: invItem.quantity, unit: invItem.unit }));
      return;
    }

    const total = Number((baseQuantity * price).toFixed(2));
    setCart([...cart, { 
      ...itemInput, 
      quantity: baseQuantity,
      displayQuantity: qty,
      displayUnit: itemInput.unit,
      price: price,
      total, 
      id: Date.now(), 
      originalItem: invItem 
    }]);
    setItemInput({ name: '', itemId: '', quantity: '' as any, price: '' as any, unit: 'kg' });
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = shopUtils.calculateDiscount(cartTotal, discount.type as any, discount.value);
  const taxableAmount = cartTotal - discountAmount;
  const gstAmount = gstEnabled ? taxableAmount * gstRate : 0;
  const finalTotal = taxableAmount + gstAmount;

  useEffect(() => {
    setPaidInput(finalTotal.toFixed(2));
  }, [finalTotal]);

  useEffect(() => {
    if (!selectedCustomer) {
      setPaidInput(finalTotal.toFixed(2));
    }
  }, [selectedCustomer, finalTotal]);

  const parsedPaid = parseFloat(paidInput);
  const currentPaid = isNaN(parsedPaid) ? finalTotal : parsedPaid;
  const currentDue = Math.max(0, finalTotal - currentPaid);

  const shareToWhatsApp = (sale: any) => {
    const itemsList = sale.items.map((i: any) => `${i.name} (${i.quantity}${i.unit})`).join(', ');
    const shopName = profile?.businessName || 'Farm Fresh Hub';
    const message = `*${shopName} Invoice*\n\nInvoice: ${sale.invoiceNo}\nCustomer: ${sale.customerName}\nItems: ${itemsList}\nTotal: ₹${sale.total}\n\nThank you for shopping with ${shopName}!`;
    const url = `https://wa.me/${sale.customerPhone || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSearchCustomer = async () => {
    const term = searchPhone.trim().toLowerCase();
    if (!term) {
      alert("Please enter a name or phone number to search.");
      return;
    }
    const found = customers.find(c => c.phone === term) ||
                  customers.find(c => c.phone.replace(/[^0-9]/g, '').includes(term)) ||
                  customers.find(c => c.name.toLowerCase().includes(term));
    if (found) {
      setSelectedCustomer(found);
      setSearchPhone('');
      alert(`Customer selected: ${found.name}`);
    } else {
      const isNum = /^\d+$/.test(term);
      setNewCust({
        name: isNum ? '' : searchPhone,
        phone: isNum ? searchPhone : '',
        address: ''
      });
      setIsNewCustOpen(true);
    }
  };

  const handleAddCustomer = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSavingCustomer) return;
    setIsSavingCustomer(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to register customers.");
        setIsSavingCustomer(false);
        return;
      }
      const ownerId = profile?.uid || auth.currentUser?.uid;
      if (!ownerId) {
        alert("Error: Admin/Owner ID not found. Please ensure you are logged in.");
        setIsSavingCustomer(false);
        return;
      }
      const trimmedName = newCust.name.trim();
      const trimmedPhone = newCust.phone.trim();
      const trimmedAddress = newCust.address.trim();

      if (!trimmedName || !trimmedPhone) {
        alert("Full name and phone number are required.");
        setIsSavingCustomer(false);
        return;
      }

      const freshCust = {
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        ownerId,
        creditBalance: 0,
        history: [],
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'customers'), freshCust);
      
      // Auto-create Ledger Account for newly added customer
      try {
        const ledgerName = `${trimmedName} (Customer A/C)`;
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
            initialBalance: 0,
            ownerId,
            customerId: docRef.id,
            createdAt: new Date().toISOString()
          });
        }
      } catch (ldrErr) {
        console.error("Failed to auto-create customer ledger:", ldrErr);
      }

      const savedCustomer = { id: docRef.id, ...freshCust };
      setSelectedCustomer(savedCustomer);
      setSearchPhone(trimmedPhone);
      setIsNewCustOpen(false);
      setNewCust({ name: '', phone: '', address: '' });
      alert(`Customer "${trimmedName}" registered and selected successfully!`);
    } catch (err: any) {
      alert("Error registering customer: " + (err?.message || err));
      handleFirestoreError(err, OperationType.CREATE, 'customers');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleUpdateCustomer = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedCustomer) return;
    if (isUpdatingCustomer) return;
    setIsUpdatingCustomer(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to update customer details.");
        setIsUpdatingCustomer(false);
        return;
      }
      const trimmedName = editCust.name.trim();
      const trimmedPhone = editCust.phone.trim();
      const trimmedAddress = editCust.address.trim();

      if (!trimmedName || !trimmedPhone) {
        alert("Full name and phone number are required.");
        setIsUpdatingCustomer(false);
        return;
      }

      const custRef = doc(db, 'customers', selectedCustomer.id);
      await setDoc(custRef, {
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress
      }, { merge: true });

      const updatedCustomer = {
        ...selectedCustomer,
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress
      };
      setSelectedCustomer(updatedCustomer);
      setIsEditCustOpen(false);
      alert("Customer details updated successfully!");
    } catch (err: any) {
      alert("Error updating customer: " + (err?.message || err));
      handleFirestoreError(err, OperationType.UPDATE, `customers/${selectedCustomer.id}`);
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const completeSale = async (paymentStatus: 'paid' | 'credit', forcePaid?: number, forceDue?: number) => {
    if (cart.length === 0) return;

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to complete sales.");
        return;
      }
      if (!profile) {
        alert("Please wait for profile to load.");
        return;
      }

      const ownerId = profile?.uid || 'unknown';

      const isForced = typeof forcePaid === 'number';
      const salePaidAmount = isForced ? forcePaid : currentPaid;
      const saleDueAmount = isForced ? forceDue : currentDue;
      const salePaymentStatus = isForced ? paymentStatus : (saleDueAmount > 0 ? 'credit' : 'paid');

      const prefixPart = invPrefix.trim() ? `${invPrefix.trim()}-` : '';
      const numPart = Date.now().toString().slice(-6);
      const suffixPart = invSuffix.trim() ? `-${invSuffix.trim()}` : '';
      const fyPart = invFY.trim() ? `/${invFY.trim()}` : '';
      const invoiceNo = `${prefixPart}${numPart}${suffixPart}${fyPart}`;
      const saleData: any = {
        invoiceNo,
        items: cart,
        cartTotal,
        taxableAmount,
        gstAmount,
        total: finalTotal,
        paymentStatus: salePaymentStatus,
        paidAmount: salePaidAmount,
        dueAmount: saleDueAmount,
        paymentMode: selectedPaymentMode,
        customerId: selectedCustomer?.id || 'guest',
        customerName: selectedCustomer?.name || 'Guest',
        customerPhone: selectedCustomer?.phone || '',
        customerAddress: selectedCustomer?.address || '',
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString()
      };
      const batch = writeBatch(db);

      // Create Sale Record
      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, saleData);
      
      // Update Customer Credit
      if (saleDueAmount > 0 && selectedCustomer) {
        const custRef = doc(db, 'customers', selectedCustomer.id);
        batch.update(custRef, {
          creditBalance: increment(saleDueAmount)
        });
      }

      // Update Inventory Stock
      cart.forEach(item => {
        const itemRef = doc(db, 'inventory', item.itemId);
        batch.update(itemRef, {
          quantity: increment(-item.quantity)
        });
      });

      await batch.commit();

      // Automatically post an accounting voucher for the sale
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

        const salesLedgerId = await fetchLedgerId('Poultry Sales A/C', 'Revenue');
        const paymentLedgerName = selectedPaymentMode === 'Cash' ? 'Cash A/C' : 'Bank A/C';
        const pmtLedgerId = await fetchLedgerId(paymentLedgerName, 'Asset');

        if (selectedCustomer) {
          const custLedgerId = await fetchLedgerId(`${selectedCustomer.name.trim()} (Customer A/C)`, 'Asset');
          
          // Generate sequence number for voucher
          const matchingVchCount = (await getDocs(query(collection(db, 'accounting_vouchers'), where('ownerId', '==', ownerId)))).size + 1;
          const autoVchNoSales = `JV-${1000 + matchingVchCount}`;
          
          await addDoc(collection(db, 'accounting_vouchers'), {
            voucherType: 'general',
            voucherNo: autoVchNoSales,
            date: format(new Date(), 'yyyy-MM-dd'),
            debitLedgerId: custLedgerId,
            creditLedgerId: salesLedgerId,
            amount: Number(finalTotal),
            narration: `Sales via invoice ${invoiceNo} to ${selectedCustomer.name}`,
            ownerId,
            createdAt: new Date().toISOString()
          });

          if (salePaidAmount > 0) {
            const autoVchNoPay = `RV-${1001 + matchingVchCount}`;
            await addDoc(collection(db, 'accounting_vouchers'), {
              voucherType: 'receipt',
              voucherNo: autoVchNoPay,
              date: format(new Date(), 'yyyy-MM-dd'),
              debitLedgerId: pmtLedgerId,
              creditLedgerId: custLedgerId,
              amount: Number(salePaidAmount),
              narration: `Payment received for invoice ${invoiceNo} via ${selectedPaymentMode}`,
              ownerId,
              createdAt: new Date().toISOString()
            });
          }
        } else {
          const matchingVchCount = (await getDocs(query(collection(db, 'accounting_vouchers'), where('ownerId', '==', ownerId)))).size + 1;
          const autoVchNo = `RV-${1000 + matchingVchCount}`;
          await addDoc(collection(db, 'accounting_vouchers'), {
            voucherType: 'receipt',
            voucherNo: autoVchNo,
            date: format(new Date(), 'yyyy-MM-dd'),
            debitLedgerId: pmtLedgerId,
            creditLedgerId: salesLedgerId,
            amount: Number(finalTotal),
            narration: `Cash sale via invoice ${invoiceNo} (${selectedPaymentMode})`,
            ownerId,
            createdAt: new Date().toISOString()
          });
        }
      } catch (vchErr) {
        console.error("Failed to automatically post accounting voucher for sale:", vchErr);
      }

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_sale',
        invoiceNo,
        amount: finalTotal,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
      console.log('PDF Generated');

      generatePDF({...saleData, total: finalTotal}, autoPrintOnSale ? 'print' : 'download');
      setCart([]);
      setSelectedCustomer(null);
      setSearchPhone('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales-transaction');
    }
  };

  const cancelSale = async (sale: any) => {
    if (!confirm('Are you sure you want to cancel this sale? This will revert stock and credit.')) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified.");
        return;
      }
      const batch = writeBatch(db);
      
      // Mark sale as cancelled
      const saleRef = doc(db, 'sales', sale.id);
      batch.update(saleRef, { status: 'cancelled', updatedAt: new Date().toISOString() });

      // Revert stock
      sale.items.forEach((item: any) => {
        const itemRef = doc(db, 'inventory', item.itemId);
        batch.update(itemRef, { quantity: increment(item.quantity) });
      });

      // Revert customer credit
      if (sale.customerId !== 'guest') {
        const dueToRevert = typeof sale.dueAmount === 'number' ? sale.dueAmount : (sale.paymentStatus === 'credit' ? sale.total : 0);
        if (dueToRevert > 0) {
          const custRef = doc(db, 'customers', sale.customerId);
          batch.update(custRef, { creditBalance: increment(-dueToRevert) });
        }
      }

      await batch.commit();

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'sale_cancelled',
        invoiceNo: sale.invoiceNo,
        amount: sale.total,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cancel-sale');
    }
  };
  const generatePDF = (sale: any, action: 'download' | 'print' = 'download') => {
    const isThermal = printerSize !== 'standard';
    const width = printerSize === '3inch' ? 80 : (printerSize === '4inch' ? 104 : 210);
    
    const bTerms = profile?.invoiceTerms || '1. Goods once sold will not be taken back.\n2. Subject to Dhanbad Jurisdiction.';
    
    // Dynamically calculate format size for thermal printer receipts to avoid cutting or long empty sheets
    let finalHeight = 250;
    if (isThermal) {
      const termsLines = bTerms ? bTerms.split('\n').length : 0;
      const termsEstHeight = termsLines > 0 ? 8 + termsLines * 4.5 : 0;
      const baseHeight = 160 + termsEstHeight; // baseline structure weight in mm with extra space for credits
      const itemsHeight = sale.items.length * 7;
      const taxHeight = sale.gstAmount > 0 ? 18 : 0;
      finalHeight = Math.max(165, Math.min(baseHeight + itemsHeight + taxHeight, 380));
    }

    const doc = new jsPDF({
      unit: 'mm',
      format: isThermal ? [width, finalHeight] : 'a4'
    }) as any;

    const { cgst, sgst } = getTaxBreakdown(sale);
    const centerX = width / 2;
    const margin = isThermal ? 5 : 20;
    const fontSizeBase = isThermal ? 9.5 : 10.5;

    const bName = (profile?.businessName || 'CHICKMART').toUpperCase();
    const bAddr = profile?.businessAddress || 'Digwadih, Dhanbad, Jharkhand, 828113';
    const bEmail = profile?.businessEmail || 'chiranjeev972@gmail.com';
    const bPhone = profile?.businessPhone || '9288517027';
    const bGst = profile?.businessGSTIN || '24AAAAA1111A1Z1';
    const bTemplate = profile?.activeInvoiceTemplate || 'classic';
    
    // Header styling based on selected template
    if (bTemplate === 'orange') {
      doc.setTextColor(234, 88, 12); // Brand Orange
      doc.setFont('helvetica', 'bold');
    } else if (bTemplate === 'premium') {
      doc.setTextColor(67, 56, 202); // Elegant Indigo
      doc.setFont('times', 'bold');
    } else if (bTemplate === 'thermal') {
      doc.setTextColor(0, 0, 0);
      doc.setFont('courier', 'bold');
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
    }

    doc.setFontSize(isThermal ? 15 : 20);
    doc.text(bName, centerX, level(15), { align: 'center' });
    
    // Details (Reset text colors for general info)
    doc.setTextColor(0, 0, 0); // Bold black for clear visibility
    if (bTemplate === 'thermal') {
      doc.setFont('courier', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.setFontSize(fontSizeBase);
    doc.text(bAddr, centerX, level(23), { align: 'center' });
    doc.text(bEmail, centerX, level(28), { align: 'center' });
    doc.text(`Contact: ${bPhone} | GSTIN: ${bGst}`, centerX, level(33), { align: 'center' });
    
    if (bTemplate === 'orange') {
      doc.setDrawColor(234, 88, 12);
    } else if (bTemplate === 'premium') {
      doc.setDrawColor(67, 56, 202);
    } else {
      doc.setDrawColor(80); // darker gray for crisp visibility
    }
    doc.setLineWidth(0.3); // thicker border line
    doc.line(margin, level(36), width - margin, level(36));
    
    if (bTemplate === 'thermal') {
      doc.setFont('courier', 'bold');
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bTemplate === 'premium' ? 67 : (bTemplate === 'orange' ? 234 : 0), bTemplate === 'premium' ? 56 : (bTemplate === 'orange' ? 88 : 0), bTemplate === 'premium' ? 202 : (bTemplate === 'orange' ? 12 : 0));
    }
    doc.setFontSize(isThermal ? 11 : 13);
    const invoiceHeader = (sale.gstAmount && sale.gstAmount > 0) ? 'TAX INVOICE' : 'INVOICE';
    doc.text(invoiceHeader, centerX, level(43), { align: 'center' });

    if (bTemplate === 'orange') {
      doc.setDrawColor(234, 88, 12);
    } else if (bTemplate === 'premium') {
      doc.setDrawColor(67, 56, 202);
    } else {
      doc.setDrawColor(80);
    }
    doc.setLineWidth(0.3);
    doc.line(margin, level(46), width - margin, level(46));

    // Bill Info
    doc.setTextColor(0, 0, 0);
    if (bTemplate === 'thermal') {
      doc.setFont('courier', 'bold'); // Make bill info bold
    } else {
      doc.setFont('helvetica', 'bold'); // Make bill info bold
    }
    doc.setFontSize(fontSizeBase);
    let billY = 54;
    doc.text(`Invoice No.: ${sale.invoiceNo}`, margin, level(billY));
    doc.text(`Bill Date: ${format(new Date(sale.timestamp), 'dd/MM/yyyy')}`, margin, level(billY + 6));
    doc.text(`Time: ${format(new Date(sale.timestamp), 'HH:mm')}`, width - margin, level(billY + 6), { align: 'right' });
    
    if (bTemplate === 'thermal') {
      doc.setFont('courier', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text('Name and Address :', margin, level(billY + 14));
    doc.text(`${sale.customerName}`, margin, level(billY + 19));
    
    let hasPhoneOrAddress = false;
    let customerDetail = "";
    if (sale.customerPhone) {
      customerDetail += sale.customerPhone;
      hasPhoneOrAddress = true;
    }
    if (sale.customerAddress) {
      customerDetail += (customerDetail ? ` | Address: ${sale.customerAddress}` : `Address: ${sale.customerAddress}`);
      hasPhoneOrAddress = true;
    }

    if (hasPhoneOrAddress) {
      doc.text(customerDetail, margin, level(billY + 24));
    }

    function level(val: number) { return val; }

    // Table
    const tableHeaders = isThermal 
      ? [['Item', 'Qty', 'Rate', 'Total']]
      : [['S.No', 'Product Name', 'Qty', 'Rate', 'Disc', 'Tax%', 'Total']];
      
    const tableData = sale.items.map((item: any, idx: number) => isThermal 
      ? [item.name, `${item.displayQuantity || item.quantity} ${item.displayUnit || item.unit}`, item.price.toFixed(2), item.total.toFixed(2)]
      : [idx + 1, item.name, `${item.displayQuantity || item.quantity} ${item.displayUnit || item.unit}`, item.price.toFixed(2), '0', sale.gstAmount > 0 ? '5%' : '0%', item.total.toFixed(2)]
    );

    doc.autoTable({
      startY: billY + (hasPhoneOrAddress ? 31 : 25),
      head: tableHeaders,
      body: tableData,
      theme: 'grid', // Grid theme for clear borders
      headStyles: { 
        fontStyle: 'bold', 
        lineWidth: 0.2, 
        lineColor: [0, 0, 0], 
        fontSize: fontSizeBase, 
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255]
      },
      bodyStyles: { 
        fontStyle: 'bold', // Bold text in table cells
        lineWidth: 0.2, 
        lineColor: [0, 0, 0], // Distinct solid lines
        fontSize: fontSizeBase - 0.5,
        textColor: [0, 0, 0]
      },
      columnStyles: isThermal ? {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: printerSize === '3inch' ? 18 : 24, halign: 'center' },
        2: { cellWidth: printerSize === '3inch' ? 18 : 24, halign: 'right' },
        3: { cellWidth: printerSize === '3inch' ? 20 : 26, halign: 'right' }
      } : {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    let currentY = doc.lastAutoTable.finalY + 6;
    
    // Summary
    doc.setFontSize(fontSizeBase);
    if (bTemplate === 'thermal') {
      doc.setFont('courier', 'bold');
    } else {
      doc.setFont('helvetica', 'bold');
    }
    doc.text(`Items: ${sale.items.length}`, margin, currentY);
    doc.text(`Qty: ${sale.items.reduce((s: number, i: any) => s + i.quantity, 0)}`, margin + (isThermal ? 24 : 45), currentY);
    doc.text(`${sale.total.toFixed(2)}`, width - margin, currentY, { align: 'right' });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 3, width - margin, currentY + 3);

    currentY = currentY + 10;
    doc.setFont(bTemplate === 'thermal' ? 'courier' : 'helvetica', 'bold'); // Make payment elements completely bold
    doc.text('Sub Total', margin, currentY);
    doc.text(`${sale.cartTotal.toFixed(2)}`, width - margin, currentY, { align: 'right' });
    
    doc.text('Item Discount', margin, currentY + 5);
    doc.text(`0.00`, width - margin, currentY + 5, { align: 'right' });

    doc.text('Round Off (+,-) :', margin, currentY + 10);
    doc.text(`0.00`, width - margin, currentY + 10, { align: 'right' });
    
    doc.setFont(bTemplate === 'thermal' ? 'courier' : 'helvetica', 'bold');
    doc.text('Bill Amount:', margin, currentY + 16);
    doc.text(`${sale.total.toFixed(2)}`, width - margin, currentY + 16, { align: 'right' });
    
    doc.setFont(bTemplate === 'thermal' ? 'courier' : 'helvetica', 'bold');
    doc.text('Payment :', margin, currentY + 22);
    const pdfPaid = typeof sale.paidAmount === 'number' ? sale.paidAmount : (sale.paymentStatus === 'credit' ? 0 : sale.total);
    const pdfDue = typeof sale.dueAmount === 'number' ? sale.dueAmount : (sale.paymentStatus === 'credit' ? sale.total : 0);
    doc.text(`${pdfPaid.toFixed(2)}`, width - margin, currentY + 22, { align: 'right' });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 25, width - margin, currentY + 25);

    const paymentModeLabel = sale.paymentMode || 'Cash';
    doc.setFont(bTemplate === 'thermal' ? 'courier' : 'helvetica', 'bold');
    if (pdfDue > 0) {
      doc.text(`Paid By ${paymentModeLabel} : ${pdfPaid.toFixed(2)}`, margin, currentY + 31);
      doc.text(`Credit (Udhaar) : ${pdfDue.toFixed(2)}`, margin, currentY + 36);
      doc.line(margin, currentY + 39, width - margin, currentY + 39);
      currentY = currentY + 39;
    } else {
      doc.text(`Paid By ${paymentModeLabel} : ${pdfPaid.toFixed(2)}`, margin, currentY + 31);
      doc.line(margin, currentY + 34, width - margin, currentY + 34);
      currentY = currentY + 34;
    }

    // Tax Table logic
    if (sale.gstAmount > 0) {
      const taxY = currentY + 6;
      const taxHeaders = [['Tax%', 'SGST', 'CGST', 'Total']];
      const taxRow = [['5%', sgst.toFixed(2), cgst.toFixed(2), sale.total.toFixed(2)]];
      
      doc.autoTable({
        startY: taxY,
        head: taxHeaders,
        body: taxRow,
        theme: 'grid',
        styles: { fontSize: fontSizeBase - 1.5, halign: 'center' },
        margin: { left: margin, right: margin }
      });
      currentY = doc.lastAutoTable.finalY + 3;
    }

    // Print Terms if any exist
    let termsHeight = 0;
    const lines = bTerms ? bTerms.split('\n') : [];
    if (bTerms && lines.length > 0) {
      termsHeight = 8 + (lines.length * 5); // "TERMS & CONDITIONS:" header and each line
    }

    let termsStartY = currentY + 8;
    let thankYouStartY = termsStartY + termsHeight + 8;
    let softwareStartY = thankYouStartY + 14;

    if (!isThermal) {
      // If A4 with plenty of space, push to absolute bottom (around 240-275mm)
      if (currentY + termsHeight + 40 < 260) {
        termsStartY = 240 - termsHeight;
        thankYouStartY = 255;
        softwareStartY = 268;
      }
    }

    // Draw Terms and Conditions
    if (bTerms && lines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isThermal ? fontSizeBase - 1 : fontSizeBase);
      doc.text('TERMS & CONDITIONS:', margin, termsStartY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isThermal ? fontSizeBase - 2 : fontSizeBase - 1);
      lines.forEach((line, index) => {
        doc.text(line, margin, termsStartY + 5 + (index * 4.5));
      });
    }

    // Draw Thank You
    doc.setFontSize(isThermal ? fontSizeBase + 1 : fontSizeBase + 2);
    doc.setFont('helvetica', 'bold');
    doc.text('THANK YOU FOR SHOPPING!', centerX, thankYouStartY, { align: 'center' });
    doc.text('VISIT AGAIN !', centerX, thankYouStartY + 5, { align: 'center' });

    // Draw Software Provider
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isThermal ? fontSizeBase - 2 : fontSizeBase - 1);
    doc.text('Software By: C Vidya Solutions', centerX, softwareStartY, { align: 'center' });

    if (action === 'print') {
      let isCrossOrBlocked = false;
      try {
        if (window.self !== window.top) {
          isCrossOrBlocked = true;
        }
      } catch (e) {
        isCrossOrBlocked = true;
      }

      if (isCrossOrBlocked) {
        // Safe download fallback when inside sandboxed iframes to avoid browser Security errors
        doc.save(`Invoice_${sale.invoiceNo}.pdf`);
      } else {
        try {
          doc.autoPrint();
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const printIframe = document.createElement('iframe');
          printIframe.id = 'pdf-print-iframe-' + Date.now();
          printIframe.style.position = 'fixed';
          printIframe.style.right = '0';
          printIframe.style.bottom = '0';
          printIframe.style.width = '0';
          printIframe.style.height = '0';
          printIframe.style.border = '0';
          document.body.appendChild(printIframe);
          printIframe.src = pdfUrl;
          printIframe.onload = () => {
            try {
              const iframeWin = printIframe.contentWindow;
              if (iframeWin) {
                iframeWin.focus();
                iframeWin.print();
              } else {
                doc.save(`Invoice_${sale.invoiceNo}.pdf`);
              }
            } catch (e) {
              // Silent fallback
              doc.save(`Invoice_${sale.invoiceNo}.pdf`);
            }
            setTimeout(() => {
              if (document.body.contains(printIframe)) {
                document.body.removeChild(printIframe);
              }
              URL.revokeObjectURL(pdfUrl);
            }, 6000);
          };
        } catch (err) {
          doc.save(`Invoice_${sale.invoiceNo}.pdf`);
        }
      }
    } else {
      doc.save(`Invoice_${sale.invoiceNo}.pdf`);
    }
  };

  const sendWhatsAppAlert = (sale: any) => {
    const text = `Bill Summary: ${profile?.businessName}\nInvoice: ${sale.invoiceNo}\nTotal: ₹${sale.total}\nThank you!`;
    const url = `https://wa.me/${sale.customerPhone || ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* POS Interface */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-[2rem] border-stone-200 shadow-sm">
          <CardHeader className="border-b border-stone-100">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="text-orange-600" />
              {t('pos')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Customer Selection */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <Input 
                  placeholder="Search Customer by Name/Phone..." 
                  className="pl-10 rounded-xl animate-none"
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                />
                
                {searchPhone.trim().length > 0 && !selectedCustomer && (
                  (() => {
                    const term = searchPhone.trim().toLowerCase();
                    const matches = customers.filter(c => 
                      (c.name || '').toLowerCase().includes(term) || 
                      (c.phone || '').includes(term)
                    ).slice(0, 5);
                    
                    if (matches.length > 0) {
                      return (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 divide-y divide-stone-100 max-h-60 overflow-y-auto">
                          {matches.map(cust => (
                            <div 
                              key={cust.id}
                              className="p-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center transition-colors text-stone-900"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setSearchPhone('');
                              }}
                            >
                              <div>
                                <p className="font-bold text-sm text-stone-900">{cust.name}</p>
                                <p className="text-xs text-stone-500">{cust.phone}</p>
                              </div>
                              {cust.address && (
                                <p className="text-[10px] text-stone-400 max-w-[120px] truncate">{cust.address}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
              <Button variant="outline" className="rounded-xl px-6" onClick={handleSearchCustomer}>{t('search') || 'Search'}</Button>
              <Dialog open={isNewCustOpen} onOpenChange={(val) => {
                setIsNewCustOpen(val);
                if (val) {
                  setCustomerDialogTab('list');
                  setDialogSearch('');
                }
              }}>
                <DialogTrigger
                  render={
                    <Button variant="outline" className="rounded-xl gap-2" onClick={() => {
                      setNewCust({ name: '', phone: '', address: '' });
                      setCustomerDialogTab('list');
                      setDialogSearch('');
                      setIsNewCustOpen(true);
                    }}>
                      <UserPlus size={18} />
                      Select / New Customer
                    </Button>
                  }
                />
                <DialogContent className="rounded-3xl max-w-md w-[95%]">
                  <DialogHeader>
                    <DialogTitle>Customer Selection</DialogTitle>
                  </DialogHeader>
                  
                  <div className="flex gap-2 border-b border-stone-100 pb-3 mb-2">
                    <Button 
                      type="button"
                      variant={customerDialogTab === 'list' ? 'default' : 'ghost'} 
                      className={`flex-1 rounded-xl h-10 ${customerDialogTab === 'list' ? 'bg-stone-900 text-white hover:bg-stone-800' : 'text-stone-600'}`}
                      onClick={() => setCustomerDialogTab('list')}
                    >
                      Customer List
                    </Button>
                    <Button 
                      type="button"
                      variant={customerDialogTab === 'create' ? 'default' : 'ghost'} 
                      className={`flex-1 rounded-xl h-10 ${customerDialogTab === 'create' ? 'bg-stone-900 text-white hover:bg-stone-800' : 'text-stone-600'}`}
                      onClick={() => setCustomerDialogTab('create')}
                    >
                      Register New
                    </Button>
                  </div>

                  {customerDialogTab === 'list' ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <Input 
                          placeholder="Quick search from records..."
                          value={dialogSearch}
                          onChange={e => setDialogSearch(e.target.value)}
                          className="pl-9 rounded-xl"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {customers.filter(c => 
                          (c.name || '').toLowerCase().includes(dialogSearch.toLowerCase()) ||
                          (c.phone || '').includes(dialogSearch)
                        ).map(cust => (
                          <div 
                            key={cust.id} 
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsNewCustOpen(false);
                            }}
                            className="p-3 bg-stone-50 hover:bg-orange-50 border border-stone-100 rounded-xl flex justify-between items-center transition-colors cursor-pointer text-stone-900"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-bold text-sm truncate text-stone-900">{cust.name}</p>
                              <p className="text-xs text-stone-500">{cust.phone}</p>
                              {cust.address && (
                                <p className="text-[10px] text-stone-400 truncate mt-0.5">{cust.address}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-1">
                              {cust.creditBalance > 0 && (
                                <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                                  ₹{cust.creditBalance.toLocaleString()} Due
                                </span>
                              )}
                              <span className="text-xs font-semibold text-orange-600 hover:underline">Select</span>
                            </div>
                          </div>
                        ))}
                        {customers.filter(c => 
                          (c.name || '').toLowerCase().includes(dialogSearch.toLowerCase()) ||
                          (c.phone || '').includes(dialogSearch)
                        ).length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-sm text-stone-400">No customers registered yet</p>
                            <Button 
                              variant="link" 
                              onClick={() => setCustomerDialogTab('create')} 
                              className="text-xs text-orange-600 mt-1"
                            >
                              Register a new customer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAddCustomer} className="space-y-4 pt-1">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input required value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input required value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} className="rounded-xl h-12" />
                      </div>
                      <Button 
                        type="submit" 
                        onClick={(e) => handleAddCustomer(e)}
                        disabled={isSavingCustomer}
                        className="w-full h-12 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 font-bold"
                      >
                        {isSavingCustomer ? "Saving..." : "Save & Select"}
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {selectedCustomer && (
              <div className="p-3 bg-orange-50 rounded-xl flex justify-between items-center border border-orange-100">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs font-bold text-orange-400 uppercase">Selected Customer</p>
                  <p className="font-bold text-orange-900 truncate">{selectedCustomer.name} ({selectedCustomer.phone})</p>
                  {selectedCustomer.address && (
                    <p className="text-[10px] text-stone-500 truncate">{selectedCustomer.address}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Dialog open={isEditCustOpen} onOpenChange={setIsEditCustOpen}>
                    <DialogTrigger
                      render={
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditCust({
                              name: selectedCustomer.name || '',
                              phone: selectedCustomer.phone || '',
                              address: selectedCustomer.address || ''
                            });
                            setIsEditCustOpen(true);
                          }} 
                          className="text-stone-600 hover:bg-orange-100 h-8 px-2 text-xs font-bold"
                        >
                          Edit
                        </Button>
                      }
                    />
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>Edit Customer Details</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleUpdateCustomer} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input required value={editCust.name} onChange={e => setEditCust({...editCust, name: e.target.value})} className="rounded-xl h-12" />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input required value={editCust.phone} onChange={e => setEditCust({...editCust, phone: e.target.value})} className="rounded-xl h-12" />
                        </div>
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input value={editCust.address} onChange={e => setEditCust({...editCust, address: e.target.value})} className="rounded-xl h-12" />
                        </div>
                        <Button 
                          type="submit" 
                          onClick={(e) => handleUpdateCustomer(e)}
                          disabled={isUpdatingCustomer}
                          className="w-full h-12 rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                        >
                          {isUpdatingCustomer ? "Updating..." : "Save Changes"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-orange-600 hover:bg-orange-100 h-8 px-2 text-xs font-bold">Change</Button>
                </div>
              </div>
            )}

            {/* Quick Select Buttons */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'bird', 'chicken', 'feed', 'other'].map(cat => (
                  <Button 
                    key={cat} 
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="xs"
                    className="rounded-full px-4 capitalize h-8"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {inventoryItems
                  .filter(item => selectedCategory === 'all' || item.type.toLowerCase().includes(selectedCategory))
                  .map(item => (
                <Button 
                  key={item.id} 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full px-4 h-9 bg-white border-stone-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all font-medium text-xs flex-shrink-0"
                  onClick={() => {
                    setItemInput({
                      ...itemInput,
                      itemId: item.id,
                      name: item.name,
                      unit: item.unit,
                      price: item.price || (item.type.includes('bird') ? 220 : 150)
                    });
                  }}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Item Input */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-2xl">
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('item')}</label>
                <select 
                  className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  value={itemInput.itemId}
                  onChange={e => {
                    const itm = inventoryItems.find(i => i.id === e.target.value);
                    if (itm) {
                      setItemInput({
                        ...itemInput, 
                        itemId: itm.id, 
                        name: itm.name,
                        unit: itm.unit,
                        price: itm.price || (itm.type?.includes('bird') ? 220 : 150)
                      });
                    } else {
                      setItemInput({
                        name: '',
                        itemId: '',
                        quantity: '',
                        price: '',
                        unit: 'kg'
                      });
                    }
                  }}
                >
                  <option value="">{t('select_product') || 'Select Product...'}</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
                {inventoryItems.length === 0 && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1">Hint: Add shop items in 'Inventory' first</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('quantity')}</label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder="0.000"
                    className="rounded-xl pr-20" 
                    value={itemInput.quantity} 
                    onChange={e => setItemInput({...itemInput, quantity: e.target.value})}
                  />
                  <select 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 rounded-lg border-none bg-stone-100 px-2 text-[10px] font-bold outline-none cursor-pointer"
                    value={itemInput.unit}
                    onChange={e => setItemInput({...itemInput, unit: e.target.value})}
                  >
                    <option value="kg">KG</option>
                    <option value="gram">GRAM</option>
                    <option value="quintal">QUINTAL</option>
                    <option value="pcs">PCS</option>
                    <option value="egg">EGG</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">{t('price')}</label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  className="rounded-xl" 
                  value={itemInput.price} 
                  onChange={e => setItemInput({...itemInput, price: e.target.value})}
                />
              </div>
              <div className="flex flex-col justify-end">
                {itemInput.itemId && itemInput.quantity && itemInput.price && (
                  <div className="text-[10px] font-bold text-orange-600 mb-1 ml-1">
                    Subtotal: ₹{(() => {
                      const qty = Number(itemInput.quantity);
                      const price = Number(itemInput.price);
                      const inputFactor = UNIT_FACTORS[itemInput.unit.toLowerCase()] || 1;
                      const invItem = inventoryItems.find(i => i.id === itemInput.itemId);
                      const baseFactor = invItem ? (UNIT_FACTORS[invItem.unit.toLowerCase()] || 1) : 1;
                      const baseQty = qty * (inputFactor / baseFactor);
                      return (baseQty * price).toFixed(2);
                    })()}
                  </div>
                )}
                <Button onClick={addToCart} disabled={!itemInput.itemId} className="w-full rounded-xl bg-orange-600 text-white hover:bg-orange-700 h-10">{t('add') || 'Add'}</Button>
              </div>
            </div>

            {/* Discount & GST Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest whitespace-nowrap">
                  <Printer size={16} />
                  Printer
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  {['standard', '3inch', '4inch'].map(size => (
                    <Button 
                      key={size}
                      variant={printerSize === size ? 'default' : 'outline'}
                      size="xs"
                      className="rounded-full px-3 capitalize h-8 text-[10px]"
                      onClick={() => {
                        setPrinterSize(size as any);
                        localStorage.setItem('printerSize', size);
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div 
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${gstEnabled ? 'bg-orange-600 border-orange-700 text-white shadow-lg shadow-orange-100' : 'bg-stone-900 border-stone-950 text-white shadow-lg shadow-stone-900/40'}`}
                onClick={() => setGstEnabled(!gstEnabled)}
              >
                <div className="flex items-center gap-3">
                  <ReceiptText size={20} className="text-white" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest leading-none">
                      {gstEnabled ? 'GST ACTIVE' : 'NON-GST ACTIVE'}
                    </p>
                    <p className={`text-[10px] mt-1 ${gstEnabled ? 'text-orange-100' : 'text-stone-400'}`}>
                      {gstEnabled ? 'GST Invoicing Ready (5%)' : 'Simple Invoicing (0% Tax)'}
                    </p>
                  </div>
                </div>
                <div className="w-10 h-6 rounded-full relative transition-colors bg-white/20">
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${gstEnabled ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </div>

            {/* Invoice Format Setup & Auto Print settings */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-widest">
                  <Settings size={15} className="text-stone-500 animate-none" />
                  Invoice Format & Printing Setup
                </div>
                <div className="text-[10px] text-stone-600 bg-stone-200/70 px-2.5 py-1 rounded-md font-mono font-bold">
                  Preview: {invPrefix ? invPrefix.trim() + '-' : ''}{Date.now().toString().slice(-6)}{invSuffix ? '-' + invSuffix.trim() : ''}{invFY ? '/' + invFY.trim() : ''}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider block">Prefix</Label>
                  <Input 
                    placeholder="INV" 
                    value={invPrefix} 
                    onChange={e => {
                      setInvPrefix(e.target.value);
                      localStorage.setItem('invPrefix', e.target.value);
                    }}
                    className="h-9 text-xs rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider block">Financial Year</Label>
                  <Input 
                    placeholder="2026-27" 
                    value={invFY} 
                    onChange={e => {
                      setInvFY(e.target.value);
                      localStorage.setItem('invFY', e.target.value);
                    }}
                    className="h-9 text-xs rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider block">Suffix</Label>
                  <Input 
                    placeholder="e.g. GST" 
                    value={invSuffix} 
                    onChange={e => {
                      setInvSuffix(e.target.value);
                      localStorage.setItem('invSuffix', e.target.value);
                    }}
                    className="h-9 text-xs rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-200/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-stone-800">Auto-Print on Checkout</span>
                  <p className="text-[10px] text-stone-400">Instantly trigger the receipt print dialog when completing a sale</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const newValue = !autoPrintOnSale;
                    setAutoPrintOnSale(newValue);
                    localStorage.setItem('autoPrintOnSale', String(newValue));
                  }}
                  className={`w-10 h-6 rounded-full relative transition-colors focus:outline-none ${autoPrintOnSale ? 'bg-orange-600' : 'bg-stone-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoPrintOnSale ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Cart Table */}
            <div className="border rounded-2xl overflow-hidden overflow-x-auto">
              <div className="min-w-[500px]">
                <Table>
                  <TableHeader className="bg-stone-50">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.displayQuantity || item.quantity} {item.displayUnit || item.unit}</TableCell>
                        <TableCell>₹{item.price}</TableCell>
                        <TableCell className="font-bold">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="text-stone-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cart.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-stone-400">Cart is empty</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Sidebar */}
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-stone-200 shadow-sm bg-stone-900 text-white">
          <CardHeader>
            <CardTitle className="text-stone-400 text-sm font-bold uppercase tracking-widest">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">Taxable Amount</span>
                <span>₹{taxableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">GST (5%)</span>
                <span>₹{gstAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-stone-800">
              <span className="text-stone-400">Grand Total</span>
              <span className="text-4xl font-bold">₹{finalTotal.toLocaleString()}</span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-3 border-t border-stone-800/60">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Cash', label: 'Cash' },
                  { id: 'UPI', label: 'UPI' },
                  { id: 'Net Banking', label: 'Net Banking' },
                  { id: 'Debit/Credit Card', label: 'Debit/Credit Card' }
                ].map((mode) => (
                  <Button
                    key={mode.id}
                    type="button"
                    variant={selectedPaymentMode === mode.id ? 'default' : 'outline'}
                    className={`h-9 text-xs rounded-xl font-bold transition-all border ${
                      selectedPaymentMode === mode.id 
                        ? 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700' 
                        : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800'
                    }`}
                    onClick={() => setSelectedPaymentMode(mode.id as any)}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>

            {selectedCustomer && (
              <div className="space-y-3 pt-3 border-t border-stone-800/60">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Paid Amount (₹)</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="bg-stone-800 border-stone-700 text-white rounded-xl h-10 w-full font-bold focus:ring-orange-500 focus:border-orange-500 placeholder-stone-600 font-mono"
                    value={paidInput}
                    onChange={e => setPaidInput(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-stone-400">Due Amount (Credit)</span>
                  <span className={`font-mono font-bold text-lg ${currentDue > 0 ? 'text-red-400' : 'text-stone-400'}`}>
                    ₹{currentDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-3 pt-6 border-t border-stone-800">
              <Button 
                onClick={() => completeSale(currentDue > 0 ? 'credit' : 'paid')} 
                className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg"
              >
                {t('complete_sale')}
              </Button>
              <Button 
                onClick={() => completeSale('credit', 0, finalTotal)} 
                className="w-full h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-stone-950 font-bold text-lg border-none hover:text-stone-900 disabled:opacity-50 disabled:bg-stone-800 disabled:text-stone-500"
                disabled={!selectedCustomer}
              >
                {t('udhaar') || 'Udhaar (Credit)'}
              </Button>
            </div>
            {!selectedCustomer && (
              <p className="text-[10px] text-center text-stone-500 italic">Select a customer to enable Udhaar tracking</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-50 border-b border-stone-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History size={16} />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-stone-100">
            {sales.map((sale) => (
              <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-stone-50 transition-colors">
                <div>
                  <p className="font-bold text-sm">{sale.invoiceNo}</p>
                  <p className="text-[10px] text-stone-400 uppercase">{sale.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-green-600">₹{sale.total}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-stone-400 hover:text-stone-900 ml-1"
                    title="Direct Print Invoice (Standard / 3inch / 4inch)"
                    onClick={() => generatePDF(sale, 'print')}
                  >
                    <Printer size={12} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-stone-400 hover:text-stone-900 ml-1"
                    title="Download Invoice PDF"
                    onClick={() => generatePDF(sale, 'download')}
                  >
                    <FileDown size={12} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-stone-300 hover:text-green-600 ml-1"
                    onClick={() => window.open(shopUtils.generateWhatsAppMessage(sale), '_blank')}
                  >
                    <MessageSquare size={12} />
                  </Button>
                  {sale.status !== 'cancelled' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-stone-300 hover:text-red-600 ml-1"
                      onClick={() => cancelSale(sale)}
                    >
                      <XCircle size={12} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {sales.map((sale) => sale.status === 'cancelled' && (
               <div key={sale.id + 'rev'} className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
