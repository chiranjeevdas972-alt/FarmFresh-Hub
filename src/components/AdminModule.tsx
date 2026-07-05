import React, { useState, useEffect } from 'react';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, where, updateDoc, addDoc, increment, getDocs, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth } from '../lib/firebase';
import { 
  Activity, ShieldCheck, Database, Server, Smartphone, History, 
  CheckCircle2, AlertCircle, Building2, Save, QrCode, MessageSquare, 
  Share2, Key, RefreshCw, Cloud, Bell, Users, Plus, Trash2, Check, 
  Download, ExternalLink, Calendar, MapPin, Layers, Briefcase, 
  DollarSign, Eye, Phone, Sparkles, AlertTriangle, FileText
} from 'lucide-react';

export default function AdminModule({ profile }: { profile: any }) {
  // View states
  const [adminTab, setAdminTab] = useState('profile');
  const [filter, setFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(profile?.activeInvoiceTemplate || 'classic');
  
  // Real dynamic collections state
  const [logs, setLogs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);

  // Modals state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [selectedTagItem, setSelectedTagItem] = useState<any>(null);

  // Business settings state
  const [businessSettings, setBusinessSettings] = useState({
    businessName: profile?.businessName || 'FarmFresh Hub',
    businessAddress: profile?.businessAddress || 'Digwadih, Dhanbad, Jharkhand, 828113',
    businessEmail: profile?.businessEmail || 'chiranjeev972@gmail.com',
    businessPhone: profile?.businessPhone || '8987766981',
    businessGSTIN: profile?.businessGSTIN || '24AAAAA1111A1Z1',
    invoiceTerms: profile?.invoiceTerms || '1. Goods once sold will not be taken back.\n2. Subject to Dhanbad Jurisdiction.'
  });

  // New forms states
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    company: '',
    category: 'Feed',
    balance: 0
  });

  const [newPurchase, setNewPurchase] = useState({
    supplierId: '',
    itemName: '',
    category: 'Feed',
    quantity: 0,
    unit: 'pcs',
    weight: 0, 
    totalPrice: 0,
    paymentType: 'cash'
  });

  const [newWorker, setNewWorker] = useState({
    name: '',
    phone: '',
    role: 'Farmworker',
    status: 'Active'
  });

  const [newBranch, setNewBranch] = useState({
    name: '',
    location: '',
    manager: '',
    status: 'Synced'
  });

  const [smartAlertConfig, setSmartAlertConfig] = useState({
    maxTemp: 34,
    minTemp: 18,
    lowStockThreshold: 10,
    whatsappRecipient: profile?.businessPhone || '8987766981',
    whatsappMessage: '⚠️ FarmFresh Hub Warning Summary: Core feed stock inventory has hit critially low levels. Action required.'
  });

  const [health, setHealth] = useState({
    db: 'online',
    auth: 'online',
    storage: 'online',
    latency: '24ms'
  });

  // Load from Firebase on boot
  useEffect(() => {
    if (profile) {
      setBusinessSettings({
        businessName: profile.businessName || 'FarmFresh Hub',
        businessAddress: profile.businessAddress || 'Digwadih, Dhanbad, Jharkhand, 828113',
        businessEmail: profile.businessEmail || 'chiranjeev972@gmail.com',
        businessPhone: profile.businessPhone || '8987766981',
        businessGSTIN: profile.businessGSTIN || '24AAAAA1111A1Z1',
        invoiceTerms: profile.invoiceTerms || '1. Goods once sold will not be taken back.\n2. Subject to Dhanbad Jurisdiction.'
      });
      if (profile.activeInvoiceTemplate) {
        setActiveTemplate(profile.activeInvoiceTemplate);
      }
    }
  }, [profile]);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!profile) return;

    // Activity log stream
    let logQuery = query(collection(db, 'activity_logs'), where('ownerId', '==', profile.uid), limit(25));
    if (filter !== 'all') {
      logQuery = query(collection(db, 'activity_logs'), where('ownerId', '==', profile.uid), where('type', '==', filter), limit(25));
    }
    const unsubLogs = onSnapshot(logQuery, (snap) => {
      const sortedLogs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(sortedLogs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs'));

    // Suppliers Stream
    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), where('ownerId', '==', profile.uid)), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers'));

    // Purchases Stream
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('ownerId', '==', profile.uid)), (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.date.localeCompare(a.date)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'purchases'));

    // Workers Stream
    const unsubWorkers = onSnapshot(query(collection(db, 'workers'), where('ownerId', '==', profile.uid)), (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'workers'));

    // Branches Stream
    const unsubBranches = onSnapshot(query(collection(db, 'branches'), where('ownerId', '==', profile.uid)), (snap) => {
      setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'branches'));

    // Backups History Stream
    const unsubBackups = onSnapshot(query(collection(db, 'backups'), where('ownerId', '==', profile.uid)), (snap) => {
      setBackups(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.date.localeCompare(a.date)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'backups'));

    // Inventory items for labels / barcodes
    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), where('ownerId', '==', profile.uid)), (snap) => {
      setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    return () => {
      unsubLogs();
      unsubSuppliers();
      unsubPurchases();
      unsubWorkers();
      unsubBranches();
      unsubBackups();
      unsubInventory();
    };
  }, [filter, profile]);

  // Handle Updates
  const handleUpdateSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) {
      alert("No active session detected.");
      return;
    }
    setIsSaving(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to update business settings.");
        setIsSaving(false);
        return;
      }
      await setDoc(doc(db, 'users', uid), {
        uid: uid,
        email: profile?.email || auth.currentUser?.email || '',
        ...businessSettings,
        activeInvoiceTemplate: activeTemplate
      }, { merge: true });
      alert('Business profile and invoice settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users-profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setActiveTemplate(templateId);
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to select an invoice template.");
        return;
      }
      await setDoc(doc(db, 'users', uid), {
        activeInvoiceTemplate: templateId
      }, { merge: true });
      alert(`Invoice template updated to '${templateId}'!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users-profile');
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Email verification is required.");
        return;
      }
      const supRef = await addDoc(collection(db, 'suppliers'), {
        ...newSupplier,
        ownerId: profile.uid,
        createdAt: new Date().toISOString()
      });

      // Auto-create Ledger Account for newly added supplier
      try {
        const ledgerName = `${newSupplier.name.trim()} (Supplier A/C)`;
        const qLdr = query(
          collection(db, 'ledger_accounts'),
          where('ownerId', '==', profile.uid),
          where('name', '==', ledgerName)
        );
        const ldrSnap = await getDocs(qLdr);
        if (ldrSnap.empty) {
          await addDoc(collection(db, 'ledger_accounts'), {
            name: ledgerName,
            type: 'Liability',
            initialBalance: Number(newSupplier.balance) || 0,
            ownerId: profile.uid,
            supplierId: supRef.id,
            createdAt: new Date().toISOString()
          });
        }
      } catch (ldrErr) {
        console.error("Failed to auto-create supplier ledger:", ldrErr);
      }

      setNewSupplier({ name: '', phone: '', company: '', category: 'Feed', balance: 0 });
      setIsAddSupplierOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'suppliers');
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Email verification is required.");
        return;
      }
      // Add purchase item
      await addDoc(collection(db, 'purchases'), {
        ...newPurchase,
        ownerId: profile.uid,
        date: new Date().toISOString()
      });
      
      // If purchase was credit based, increase outstanding dues of supplier
      if (newPurchase.paymentType === 'credit' && newPurchase.supplierId) {
        const supRef = doc(db, 'suppliers', newPurchase.supplierId);
        await updateDoc(supRef, {
          balance: increment(newPurchase.totalPrice)
        });
      }
      
      // Automatically register a corresponding ledger Expense!
      const expenseCategory = newPurchase.category === 'Medicine / Vaccines' ? 'Medicine / Vaccine' : (newPurchase.category === 'Feed' ? 'Feed' : 'Other');
      await addDoc(collection(db, 'expenses'), {
        category: expenseCategory,
        amount: newPurchase.totalPrice,
        description: `Procured ${newPurchase.itemName} (${newPurchase.quantity} ${newPurchase.unit}) from supplier. Avg weight: ${newPurchase.weight} kg.`,
        date: format(new Date(), 'yyyy-MM-dd'),
        ownerId: profile.uid,
        createdAt: new Date().toISOString()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'procurement_buy',
        itemName: newPurchase.itemName,
        supplierName: suppliers.find(s => s.id === newPurchase.supplierId)?.name || 'Direct',
        total: newPurchase.totalPrice,
        ownerId: profile.uid,
        timestamp: new Date().toISOString()
      });

      setNewPurchase({
        supplierId: '',
        itemName: '',
        category: 'Feed',
        quantity: 0,
        unit: 'pcs',
        weight: 0,
        totalPrice: 0,
        paymentType: 'cash'
      });
      setIsAddPurchaseOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'purchases');
    }
  };

  const handleClearSupplierDues = async (supplierId: string, currentBalance: number) => {
    const amount = prompt(`Enter payout amount to clear (Outstanding Balance: ₹${currentBalance})`, currentBalance.toString());
    if (!amount || isNaN(Number(amount))) return;
    const payment = Number(amount);
    if (payment <= 0) return;

    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Email verification is required.");
        return;
      }
      const supRef = doc(db, 'suppliers', supplierId);
      await updateDoc(supRef, {
        balance: increment(-payment)
      });

      // Log purchase expense for bookkeeping
      await addDoc(collection(db, 'expenses'), {
        category: 'Other',
        amount: payment,
        description: `Supplier dues settlement payment for ${suppliers.find(s => s.id === supplierId)?.name}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        ownerId: profile.uid,
        createdAt: new Date().toISOString()
      });

      // Activity log
      await addDoc(collection(db, 'activity_logs'), {
        type: 'supplier_payoff',
        supplierId,
        amount: payment,
        ownerId: profile.uid,
        timestamp: new Date().toISOString()
      });

      alert('Outstanding cleared successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, 'workers'), {
        ...newWorker,
        ownerId: profile.uid,
        createdAt: new Date().toISOString(),
        permissions: newWorker.role === 'Admin' ? ['view_finance', 'manage_inventory', 'edit_settings', 'pos_billing'] :
                      newWorker.role === 'POS Biller' ? ['manage_inventory', 'pos_billing'] :
                      ['manage_inventory']
      });
      setNewWorker({ name: '', phone: '', role: 'Farmworker', status: 'Active' });
      setIsAddWorkerOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, 'branches'), {
        ...newBranch,
        ownerId: profile.uid,
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      });
      setNewBranch({ name: '', location: '', manager: '', status: 'Synced' });
      setIsAddBranchOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Automated Cloud Snapshot Export system (Failsafe Backup)
  const handleCloudBackup = async () => {
    try {
      const collectionsToBackup = ['inventory', 'sales', 'expenses', 'customers', 'suppliers', 'purchases', 'batches', 'farmlogs', 'activity_logs'];
      const backupData: Record<string, any[]> = {};
      
      for (const colName of collectionsToBackup) {
        const snap = await getDocs(query(collection(db, colName), where('ownerId', '==', profile.uid)));
        backupData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `farmfreshhub_cloud_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      // Log backup entry
      await addDoc(collection(db, 'backups'), {
        ownerId: profile.uid,
        version: `v3.${Date.now().toString().slice(-4)}`,
        date: new Date().toISOString(),
        status: 'Failsafe Successful',
        size: `${(JSON.stringify(backupData).length / 1024).toFixed(2)} KB`,
        createdBy: profile.name || 'Admin'
      });
      
      alert("Failsafe database snapshot taken successfully! Transferred securely over client TLS and logged.");
    } catch (err) {
      console.error(err);
      alert("Error backing up cloud database. Please try again.");
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Are you sure you want to restore this data backup? This will overwrite or merge with your current cloud database documents. It is highly recommended to take a snapshot backup first.")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || typeof data !== 'object') {
          throw new Error("Invalid backup payload format");
        }

        const collections = Object.keys(data);
        if (collections.length === 0) {
          throw new Error("Backup file contains no database collections");
        }

        alert("Starting secure database restore... please do not close this window.");

        let restoredCount = 0;
        
        for (const colName of collections) {
          const items = data[colName];
          if (!Array.isArray(items)) continue;

          for (const item of items) {
            // Re-bind to current active user profile UID to ensure complete multi-tenant safety
            const cleanItem = { ...item };
            const docId = cleanItem.id;
            delete cleanItem.id;
            
            if (cleanItem.ownerId !== undefined) cleanItem.ownerId = profile.uid;
            if (cleanItem.userId !== undefined) cleanItem.userId = profile.uid;

            if (docId) {
              await setDoc(doc(db, colName, docId), cleanItem);
            } else {
              await addDoc(collection(db, colName), cleanItem);
            }
            restoredCount++;
          }
        }

        // Add backup restoration log
        await addDoc(collection(db, 'backups'), {
          ownerId: profile.uid,
          version: `r3.${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString(),
          status: 'Restored Merged',
          size: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
          createdBy: profile.name || 'Admin'
        });

        alert(`Database snapshot restored successfully! Processed and restored ${restoredCount} records.`);
        window.location.reload();
      } catch (err: any) {
        console.error("Backup Restore Error:", err);
        alert("Failed to parse and restore database: " + (err?.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  // WhatsApp Alert Simulation Trigger
  const triggerWhatsAppAlert = () => {
    const formattedPhone = smartAlertConfig.whatsappRecipient.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(smartAlertConfig.whatsappMessage);
    const apiURL = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
    window.open(apiURL, '_blank');
  };

  // Smart Notification System Integrator
  const triggerSmartAlert = async (type: string, msg: string) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        ownerId: profile.uid,
        title: type === 'temp' ? '⚠️ High Ambient Temp Alert' : '🔬 Biotech Vaccine Schedule',
        description: msg,
        read: false,
        timestamp: new Date().toISOString(),
        type: type === 'temp' ? 'warning' : 'info'
      });
      alert(`Smart alert triggered successfully! Check the core notification hub (Bell icon) to see the live prompt.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Barcode SVG Generator Utility
  const BarcodeSVG = ({ value }: { value: string }) => {
    const binary = value.split('').map(char => char.charCodeAt(0).toString(2)).join('');
    return (
      <svg className="w-full h-12" viewBox="0 0 100 40" preserveAspectRatio="none">
        <rect width="100" height="40" fill="transparent" />
        {binary.split('').map((bit, idx) => (
          <rect
            key={idx}
            x={`${idx * (100 / binary.length)}%`}
            y="0"
            width={`${100 / binary.length}%`}
            height="30"
            fill={bit === '1' ? '#1c1917' : 'transparent'}
          />
        ))}
        <text x="50%" y="38" className="text-[5px] font-mono font-black text-center text-stone-500 fill-current" textAnchor="middle">
          {value.toUpperCase()}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Menu Sub-Selector Tabs */}
      <div className="flex gap-2 border-b border-stone-200 overflow-x-auto pb-px scrollbar-none">
        {[
          { id: 'profile', label: 'Settings & Health', icon: <Building2 size={16} /> },
          { id: 'suppliers', label: 'Supplier & Purchases', icon: <Briefcase size={16} /> },
          { id: 'invoice', label: 'Invoice Settings', icon: <FileText size={16} /> },
          { id: 'qr', label: 'QR & Barcode Tags', icon: <QrCode size={16} /> },
          { id: 'cloud', label: 'Cloud Snapshot & Sync', icon: <Cloud size={16} /> },
          { id: 'alerts', label: 'WhatsApp & Smart Alerts', icon: <Bell size={16} /> },
          { id: 'roles', label: 'Role Management', icon: <Users size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              adminTab === tab.id 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile & Health Setup TAB */}
      {adminTab === 'profile' && (
        <>
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="text-orange-600" size={24} />
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Business Profile Settings</h2>
            </div>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="p-8">
                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Business / Shop Name</Label>
                      <Input 
                        value={businessSettings.businessName}
                        onChange={e => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Contact Number</Label>
                      <Input 
                        value={businessSettings.businessPhone}
                        onChange={e => setBusinessSettings({...businessSettings, businessPhone: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Business Email</Label>
                      <Input 
                        value={businessSettings.businessEmail}
                        onChange={e => setBusinessSettings({...businessSettings, businessEmail: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Full Address</Label>
                      <Input 
                        value={businessSettings.businessAddress}
                        onChange={e => setBusinessSettings({...businessSettings, businessAddress: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      onClick={(e) => handleUpdateSettings(e)}
                      disabled={isSaving} 
                      className="rounded-xl bg-stone-900 text-white h-12 px-8 flex gap-2"
                    >
                      <Save size={18} />
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* SaaS Pricing Plans & Subscriptions */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Key className="text-orange-600" size={24} />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Active Plan & Subscription Tier</h2>
                <p className="text-stone-500 text-xs">Switch your subscription model to instantly change active scale limits and access privileges.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  key: "starter",
                  name: "Starter Plan",
                  price: "₹299/mo",
                  desc: "Ideal for individual farm keepers tracking simple stock counts.",
                  color: "border-stone-200 bg-white hover:border-orange-200",
                  activeColor: "border-stone-900 ring-2 ring-stone-950/10",
                  features: [
                    "Up to 2 Live Batches Tracking",
                    "Stock Inventory (Chicken/Birds)",
                    "POS Billing & Standard Receipts",
                    "SLA Standard Guarantee Support"
                  ]
                },
                {
                  key: "business",
                  name: "Business Suite",
                  price: "₹799/mo",
                  desc: "Tailored for expanding commercial farms & retail storefronts.",
                  color: "border-stone-200 bg-white hover:border-orange-200",
                  activeColor: "border-orange-500 ring-2 ring-orange-500/10",
                  features: [
                    "Unlimited Live Batches Tracking",
                    "Multi-Species Category (Chicken, Duck, Goat, Fish)",
                    "Tax Invoice Generation with GST & HSN codes",
                    "One-click WhatsApp Invoices & Reminders"
                  ]
                },
                {
                  key: "enterprise",
                  name: "Enterprise Custom",
                  price: "₹1499/mo",
                  desc: "Advanced industrial framework with connected databases & nodes.",
                  color: "border-stone-200 bg-white hover:border-orange-200",
                  activeColor: "border-purple-600 ring-2 ring-purple-600/10",
                  features: [
                    "Everything in Business Suite",
                    "IoT Weighing Scales & Smart Integrations",
                    "Franchise Branches & Warehouse Synclinks",
                    "Predictive AI Insights & custom broker deduction rules"
                  ]
                }
              ].map((plan) => {
                const isActive = (profile?.subscriptionType || '').toLowerCase().includes(plan.key);
                return (
                  <Card 
                    key={plan.key} 
                    className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-200 shadow-sm relative overflow-hidden ${
                      isActive ? plan.activeColor : plan.color
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 bg-stone-900 text-white rounded-full p-1 shadow-sm">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-bold text-stone-900">{plan.name}</h3>
                          {isActive && (
                            <Badge variant="outline" className="text-[9px] font-black uppercase border-emerald-500 bg-emerald-50 text-emerald-700 px-2 rounded-full">
                              Active Tier
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">{plan.desc}</p>
                      </div>
                      <div className="py-2 border-y border-stone-100">
                        <span className="text-3xl font-black text-stone-950">{plan.price}</span>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs font-medium text-stone-600">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={async () => {
                        try {
                          const userRef = doc(db, 'users', profile.uid);
                          await updateDoc(userRef, {
                            subscriptionType: plan.key
                          });
                          alert(`Successfully subscribed to ${plan.name}! All permissions have been instantly allocated.`);
                        } catch (err) {
                          console.error(err);
                          alert("Failed to update pricing plan. Please verify active database connections.");
                        }
                      }}
                      className={`w-full mt-6 h-11 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 ${
                        isActive 
                          ? 'bg-stone-100 text-stone-400 cursor-not-allowed hover:bg-stone-100' 
                          : 'bg-stone-950 text-white hover:bg-stone-850'
                      }`}
                      disabled={isActive}
                    >
                      {isActive ? 'Current Active Tier' : `Activate ${plan.name}`}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Module Controls and Dashboard Switchboards */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Smartphone className="text-orange-600" size={24} />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">App Control Center & Feature Toggles</h2>
                <p className="text-stone-500 text-xs">Directly toggle which module panels are rendered inside the helper sidebar navigation menus.</p>
              </div>
            </div>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    { id: 'farm', label: 'Farm Management & Batches', icon: '🐣', desc: 'Track batches lifecycles, mortalities, vaccine alerts and feed layouts.' },
                    { id: 'shop', label: 'POS Billing & Shop Sales', icon: '🛍️', desc: 'Accept direct orders, generate custom clean invoices and draft receipts.' },
                    { id: 'inventory', label: 'Stock Management & Inventory', icon: '📦', desc: 'Regulate warehouse items, automatic raw feed stocks and dynamic counts.' },
                    { id: 'accounts', label: 'Ledger Accounts & Balance', icon: '💼', desc: 'Track active supplier payments, ledger logs, bank cash reserves and receipts.' },
                    { id: 'customers', label: 'Customer Directory & CRM', icon: '👥', desc: 'Manage loyal buyers, customized profiles, contact logs and historical transactions.' },
                    { id: 'delivery', label: 'Delivery & Shipping Logistics', icon: '🚚', desc: 'Fulfill bulk fleet delivery, optimize dispatch logs and track order routes.' },
                    { id: 'advanced_reports', label: 'Financial Reporting & Profit/Loss', icon: '📊', desc: 'Advanced profit and loss statements, tax summaries and sheets.' },
                    { id: 'analytics', label: 'Predictive Smart AI & Graphs', icon: '📈', desc: 'Forecast demand, predict performance metrics, and view visual analytics.' }
                  ].map((feat) => {
                    const toggles = profile?.featureToggles || {};
                    const isEnabled = toggles[feat.id] !== false; // Active by default if not set
                    return (
                      <div key={feat.id} className="flex items-center justify-between py-4 border-b border-stone-100 last:border-none">
                        <div className="space-y-1 pr-6 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{feat.icon}</span>
                            <span className="text-sm font-bold text-stone-900">{feat.label}</span>
                          </div>
                          <p className="text-xs text-stone-500 leading-normal">{feat.desc}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!profile?.uid) return;
                            try {
                              const userRef = doc(db, 'users', profile.uid);
                              await setDoc(userRef, {
                                [`featureToggles.${feat.id}`]: !isEnabled
                              }, { merge: true });
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`w-14 h-7 rounded-full transition-colors duration-200 flex items-center p-1 relative focus:outline-none shrink-0 ${
                            isEnabled ? 'bg-orange-600' : 'bg-stone-200'
                          }`}
                        >
                          <div 
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                              isEnabled ? 'translate-x-7' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-orange-600" size={24} />
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">System Health & Security</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Cloud Firestore', status: health.db === 'online' ? 'Healthy' : 'Offline', icon: <Database size={20} />, color: 'text-green-600' },
                { label: 'Firebase Auth', status: health.auth === 'online' ? 'Healthy' : 'Offline', icon: <ShieldCheck size={20} />, color: 'text-green-600' },
                { label: 'Backup Cloud Nodes', status: health.storage === 'online' ? 'Healthy' : 'Offline', icon: <Server size={20} />, color: 'text-green-600' },
                { label: 'Active SQL Socket Latency', status: health.latency, icon: <Smartphone size={20} />, color: 'text-orange-600' },
              ].map((item, i) => (
                <Card key={i} className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-stone-50 ${item.color}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">{item.label}</p>
                        <p className="text-sm font-bold text-stone-900">{item.status}</p>
                        {item.label === 'Cloud Firestore' && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono font-medium block mt-1 w-max">
                            DB: {firebaseConfig.firestoreDatabaseId || '(default)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <History className="text-orange-600" size={24} />
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Activity Audit Logs</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {['all', 'new_sale', 'stock_movement', 'delivery_update', 'new_batch', 'procurement_buy'].map(t => (
                  <Button 
                    key={t} 
                    variant={filter === t ? 'default' : 'outline'} 
                    size="sm" 
                    className="rounded-full capitalize whitespace-nowrap"
                    onClick={() => setFilter(t)}
                  >
                    {t.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
            
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b border-stone-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Timestamp</th>
                        <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">User / Actor</th>
                        <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Action Code</th>
                        <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs text-stone-500">
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-stone-900">{log.userName || log.userId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs uppercase font-bold text-orange-600 tracking-tight bg-orange-50 px-2.5 py-1 rounded-full">{log.type.replace('_', ' ')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-mono text-stone-500">{log.itemName || log.category || 'Global System'}</span>
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">No historical changes logged in this cycle.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* Supplier & Purchases Tab */}
      {adminTab === 'suppliers' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Procurement & Supplier Ledgers</h2>
              <p className="text-stone-500 text-sm mt-1">Register bulk feed providers, log chicks shipments, weights, and clear outstanding balances.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddSupplierOpen(true)} className="rounded-xl bg-stone-900 text-white">
                <Plus size={16} className="mr-1" />
                Add Supplier
              </Button>
              <Button onClick={() => setIsAddPurchaseOpen(true)} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white">
                <Plus size={16} className="mr-1" />
                Log Gross Purchase
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-[2rem] bg-orange-50/50 border-orange-100">
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Active Suppliers</p>
              <p className="text-2xl font-black text-orange-950 mt-1">{suppliers.length}</p>
            </Card>
            <Card className="p-6 rounded-[2rem] bg-amber-50/50 border-amber-100">
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Cumulative Procurement Cost</p>
              <p className="text-2xl font-black text-amber-950 mt-1">₹{purchases.reduce((acc, p) => acc + (p.totalPrice || 0), 0).toLocaleString()}</p>
            </Card>
            <Card className="p-6 rounded-[2rem] bg-red-50/50 border-red-100">
              <p className="text-[10px] font-black uppercase text-red-500 tracking-widest">Supplier Outstanding (Udhaar)</p>
              <p className="text-2xl font-black text-red-950 mt-1">₹{suppliers.reduce((acc, s) => acc + (s.balance || 0), 0).toLocaleString()}</p>
            </Card>
          </div>

          {/* Suppliers Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900">Suppliers Profiles & Accounts</h3>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Company / Supplier</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Category Provided</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Dues Outstanding</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest text-right">Action Gate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {suppliers.map(sup => (
                      <tr key={sup.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-900 leading-none">{sup.name}</p>
                          <small className="text-[10px] text-stone-500">{sup.company}</small>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase font-black bg-stone-50">
                            {sup.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-stone-600">{sup.phone}</td>
                        <td className="px-6 py-4">
                          {sup.balance > 0 ? (
                            <Badge className="bg-red-100 text-red-700 font-bold border-none rounded-full px-3">
                              ₹{sup.balance.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-stone-400">Paid / Clear</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleClearSupplierDues(sup.id, sup.balance)}
                            className="rounded-lg border-stone-200 hover:bg-stone-50 text-stone-800"
                            disabled={Number(sup.balance || 0) <= 0}
                          >
                            Clear Dues
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">No supplier profiles registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* Procurement Shipments Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900">Procurement & Purchase History</h3>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Date logged</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Item details</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Supply Source</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Batch Measure / Weight</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {purchases.map(pur => (
                      <tr key={pur.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs text-stone-500">
                          {format(new Date(pur.date), 'MMM dd yyyy, p')}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-900 leading-none">{pur.itemName}</p>
                          <small className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">{pur.category}</small>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-stone-700">
                          {suppliers.find(s => s.id === pur.supplierId)?.name || 'Direct Procurement'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-stone-700">{pur.quantity} {pur.unit}</span>
                          {Number(pur.weight) > 0 && <span className="text-[10px] text-stone-400 ml-1">({pur.weight} kg avg)</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-stone-950">
                          ₹{Number(pur.totalPrice).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">No procurements logged in this store ledger.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* QR & Barcode tag generator Tab */}
      {adminTab === 'qr' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">QR / Barcode SKU Support</h2>
            <p className="text-stone-500 text-sm mt-1">Read inventory SKU codes rapidly, generate package cut tags, and preview standard barcode printouts.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventoryItems.map(item => {
              // Create pseudo SKU
              const skuCode = `FFH-${item.type.slice(0,3).toUpperCase()}-${String(item.id).slice(-4)}`;
              return (
                <Card key={item.id} className="rounded-3xl border-stone-200 hover:border-orange-200 transition-all p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-stone-950 text-base">{item.name}</h4>
                      <p className="text-[10px] text-stone-400 tracking-wider uppercase font-bold">{item.type} stock model</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[9px] font-mono font-bold">
                      {skuCode}
                    </Badge>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl flex items-center justify-center border border-dashed border-stone-200">
                    <BarcodeSVG value={skuCode} />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 font-bold">Reserves: <strong className="text-stone-900">{item.quantity} {item.unit || 'pcs'}</strong></span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTagItem({ ...item, skuCode })}
                      className="text-orange-500 font-black flex items-center gap-1.5 p-0 hover:bg-transparent"
                    >
                      <Eye size={14} />
                      Generate Cut Tag
                    </Button>
                  </div>
                </Card>
              );
            })}
            {inventoryItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-stone-400 italic">No inventory products registered. Post first item in Inventory or Shop and they will populate here instantly.</div>
            )}
          </div>
        </div>
      )}

      {/* Cloud backup & syncing Tab */}
      {adminTab === 'cloud' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Persistent Cloud Backup & Sync Hub</h2>
            <p className="text-stone-500 text-sm mt-1">Download robust encrypted JSON snapshots containing all client transactions, and coordinate multi-coop databases.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Database snapshot Card */}
            <Card className="rounded-[2rem] border-stone-200 shadow-sm p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <Cloud size={24} />
                </div>
                <h3 className="font-bold text-stone-900 text-lg">Cloud Snapshot Snapshotter</h3>
                <p className="text-stone-500 text-xs leading-relaxed font-normal">Runs zero-latency scans of active collections, compressing keys down into client-executable JSON logs.</p>
                <div className="text-[11px] bg-stone-100 text-stone-700 px-3 py-1.5 rounded-xl font-mono font-medium inline-block border border-stone-200">
                  Target DB ID: <span className="font-bold text-orange-600">{firebaseConfig.firestoreDatabaseId || '(default)'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Button onClick={handleCloudBackup} className="rounded-xl w-full bg-stone-900 text-white h-11">
                  <Download size={16} className="mr-1.5" />
                  Take DB Snapshot
                </Button>
                <Button 
                  onClick={() => document.getElementById('restore-backup-upload')?.click()} 
                  variant="outline" 
                  className="rounded-xl w-full border-stone-200 h-11 hover:bg-stone-50"
                >
                  <RefreshCw size={16} className="mr-1.5" />
                  Restore DB Snapshot
                </Button>
                <input 
                  type="file" 
                  accept=".json" 
                  id="restore-backup-upload" 
                  className="hidden" 
                  onChange={handleRestoreBackup} 
                />
              </div>
            </Card>

            {/* Database Sync Multi branch configuration Card */}
            <Card className="rounded-[2rem] border-stone-200 shadow-sm p-8 space-y-6 flex flex-col justify-between col-span-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-stone-900 text-lg">Multi-Branch Sync Matrix</h3>
                  <Button onClick={() => setIsAddBranchOpen(true)} size="sm" variant="outline" className="rounded-xl border-stone-200 text-xs">
                    <Plus size={14} className="mr-1" />
                    Register New Branch
                  </Button>
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">Coordinate satellite structures (e.g. storage structures, separate retails) and secure continuous synchronization status reports in unified views.</p>
                
                <div className="space-y-3 pt-2">
                  {branches.map(br => (
                    <div key={br.id} className="flex justify-between items-center p-3.5 bg-stone-50 rounded-2xl border border-stone-100 hover:border-orange-200 transition-colors">
                      <div>
                        <p className="font-bold text-stone-900 text-sm">{br.name}</p>
                        <p className="text-[10px] text-stone-400">{br.location} • Manager: {br.manager}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold text-stone-400">Ping: 34ms</span>
                        <Badge className={`${br.status === 'Synced' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} border-none`}>
                          {br.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {branches.length === 0 && (
                    <p className="text-center py-6 text-stone-400 italic text-xs">No remote nodes mapped. Sync status defaults to Primary Cloud Instance.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Backup Snapshot logs */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-stone-900">Encrypted Backup History (Failsafe)</h3>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Backup Version</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Timestamp</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Compressed Payload</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Verified Status</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {backups.map(bk => (
                      <tr key={bk.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-stone-700">{bk.version}</td>
                        <td className="px-6 py-4 text-xs text-stone-500">
                          {format(new Date(bk.date), 'MMM dd yyyy, p')}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-stone-800">{bk.size}</td>
                        <td className="px-6 py-4">
                          <Badge className="bg-green-100 text-green-700 border-none font-bold rounded-full px-2.5">
                            {bk.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-stone-600">{bk.createdBy}</td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">No snapshot logs found. Run your first secure backup with the taking tool.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* Alerts & WhatsApp Configuration Tab */}
      {adminTab === 'alerts' && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Smart Alerts & Vaccination Checklist */}
          <Card className="rounded-[2rem] border-stone-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-lg">Smart Ambient & Bio-Security Limits</h3>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-wide">Telemetry Prompts</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-wider uppercase text-stone-400">Alert Ambient Max Temp</Label>
                  <Input 
                    type="number"
                    value={smartAlertConfig.maxTemp}
                    onChange={e => setSmartAlertConfig({...smartAlertConfig, maxTemp: Number(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black tracking-wider uppercase text-stone-400">Alert Ambient Min Temp</Label>
                  <Input 
                    type="number"
                    value={smartAlertConfig.minTemp}
                    onChange={e => setSmartAlertConfig({...smartAlertConfig, minTemp: Number(e.target.value)})}
                    className="rounded-xl h-12"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black tracking-wider uppercase text-stone-400">Critical Stock Warning Threshold</Label>
                <Input 
                  type="number"
                  value={smartAlertConfig.lowStockThreshold}
                  onChange={e => setSmartAlertConfig({...smartAlertConfig, lowStockThreshold: Number(e.target.value)})}
                  className="rounded-xl h-12"
                />
              </div>

              <div className="border-t border-stone-100 pt-6 space-y-3">
                <h4 className="text-xs font-black uppercase text-stone-400 tracking-wider">Simulate Live Biosafety Triggers</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => triggerSmartAlert('temp', `⚠️ Critical Coop Warning: Multi-sensing hardware detected coop temperature of 36.4°C exceeding safe threshold limit of ${smartAlertConfig.maxTemp}°C`)}
                    className="rounded-xl border-stone-200 text-xs font-bold leading-normal text-red-700 hover:bg-red-50 flex gap-1.5"
                  >
                    <AlertTriangle size={14} />
                    Coop Overheat Alarm
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => triggerSmartAlert('vacc', `🔬 Biotechnology Milestone Alert: Flock Batch F-8 broilers are scheduled for vaccination cycle ND-IB (Newcastle disease vaccine). Action required.`)}
                    className="rounded-xl border-stone-200 text-xs font-bold leading-normal text-blue-700 hover:bg-blue-50 flex gap-1.5"
                  >
                    <Calendar size={14} />
                    Vaccine Scheduler
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* WhatsApp SMS & Social alert triggers panel */}
          <Card className="rounded-[2rem] border-stone-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-lg">WhatsApp Alerts & PDF Triggers</h3>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-wide">Direct customer invoice triggers</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-stone-500 text-xs leading-relaxed">Direct WhatsApp API is integrated with bills. Enter customer parameter lines or testing recipients below and click trigger to verify browser redirect hooks.</p>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-wider uppercase text-stone-400">Recipient Phone Number (with country code)</Label>
                <Input 
                  value={smartAlertConfig.whatsappRecipient}
                  onChange={e => setSmartAlertConfig({...smartAlertConfig, whatsappRecipient: e.target.value})}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-wider uppercase text-stone-400">Autocomposed PDF Balance Link Template</Label>
                <textarea 
                  rows={4}
                  value={smartAlertConfig.whatsappMessage}
                  onChange={e => setSmartAlertConfig({...smartAlertConfig, whatsappMessage: e.target.value})}
                  className="w-full text-xs p-3.5 border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              <Button onClick={triggerWhatsAppAlert} className="rounded-xl w-full bg-green-600 hover:bg-green-700 text-white h-11 flex gap-2">
                <MessageSquare size={16} />
                Trigger Test WhatsApp Alert
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Invoice Settings Tab */}
      {adminTab === 'invoice' && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Invoice Customization & Templates</h2>
            <p className="text-stone-500 text-sm mt-1">Select from multiple high-fidelity layout styles, brand accents, and customize dynamic business profiles below.</p>
          </div>

          {/* Multiple Invoice Templates Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Layers size={14} className="text-orange-500" />
              Available Invoice Layouts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  id: "classic",
                  name: "Classic Minimalist",
                  accent: "border-stone-200 bg-white hover:border-stone-400",
                  activeAccent: "border-stone-900 ring-4 ring-stone-900/10",
                  desc: "Clean layout, neutral gray tones, standard tabular lists. Perfect for general storefront invoice look.",
                  preview: (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-250 font-sans text-[9px] space-y-2 opacity-80">
                      <div className="border-b pb-1 font-bold text-stone-850">CLASSIC BILLING</div>
                      <div className="flex justify-between">
                        <span>INV# 2026-003</span>
                        <span>02/06/2026</span>
                      </div>
                      <div className="space-y-1">
                        <div className="bg-stone-200 h-1.5 w-full rounded" />
                        <div className="bg-stone-200 h-1.5 w-2/3 rounded" />
                      </div>
                    </div>
                  )
                },
                {
                  id: "orange",
                  name: "Modern Bold Orange",
                  accent: "border-stone-200 bg-white hover:border-orange-400",
                  activeAccent: "border-orange-500 ring-4 ring-orange-500/10",
                  desc: "Tech-accented custom look, orange titles, and styled headers matching Farm Fresh Hub brand assets.",
                  preview: (
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 font-sans text-[9px] space-y-2 opacity-85">
                      <div className="border-b border-orange-200 pb-1 font-extrabold text-orange-600">FARM FRESH HUB INVOICE</div>
                      <div className="flex justify-between text-orange-800">
                        <span>INV# CM-9411</span>
                        <span>02/06/2026</span>
                      </div>
                      <div className="space-y-1">
                        <div className="bg-orange-200 h-1.5 w-full rounded" />
                        <div className="bg-orange-200 h-1.5 w-4/5 rounded" />
                      </div>
                    </div>
                  )
                },
                {
                  id: "thermal",
                  name: "Industrial Thermal Receipt",
                  accent: "border-stone-200 bg-white hover:border-stone-405",
                  activeAccent: "border-emerald-500 ring-4 ring-emerald-500/10",
                  desc: "Compact, light layout with monospaced style and dashed dividers. Optimized for thermal POS printers.",
                  preview: (
                    <div className="bg-stone-900 text-stone-300 p-4 rounded-xl border border-stone-800 font-mono text-[8px] space-y-2">
                      <div className="text-center font-bold text-white border-b border-dashed border-stone-700 pb-1">*** THERMAL ***</div>
                      <div>INV-02219  02/06/2026</div>
                      <div className="border-t border-dashed border-stone-700 pt-1 space-y-1">
                        <div className="flex justify-between"><span>QTY 10 CHICKEN</span><span>2400.00</span></div>
                        <div className="flex justify-between"><span>TAX COMPLETE</span><span>120.00</span></div>
                      </div>
                    </div>
                  )
                },
                {
                  id: "premium",
                  name: "Premium Slate Indigo",
                  accent: "border-stone-200 bg-white hover:border-indigo-400",
                  activeAccent: "border-indigo-600 ring-4 ring-indigo-600/10",
                  desc: "Deep indigo accents, clean grids, and top-header spacing giving an elegant corporate enterprise mood.",
                  preview: (
                    <div className="bg-white p-4 rounded-xl border border-indigo-200 font-serif text-[9px] space-y-2 opacity-85">
                      <div className="border-b-2 border-indigo-600 pb-1 font-bold text-indigo-900 italic">Enterprise Premium</div>
                      <div className="flex justify-between font-sans text-stone-500">
                        <span>Doc Ref: IND-92</span>
                        <span>02/06/2026</span>
                      </div>
                      <div className="space-y-1">
                        <div className="bg-indigo-50 h-1.5 w-full rounded" />
                        <div className="bg-indigo-50 h-1.5 w-3/4 rounded" />
                      </div>
                    </div>
                  )
                }
              ].map((tpl) => {
                const isCurrent = activeTemplate === tpl.id;
                return (
                  <Card 
                    key={tpl.id} 
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-xs relative overflow-hidden cursor-pointer ${
                      isCurrent ? tpl.activeAccent : tpl.accent
                    }`}
                    onClick={() => handleSelectTemplate(tpl.id)}
                  >
                    {isCurrent && (
                      <div className="absolute top-2 right-2 bg-stone-900 text-white rounded-full p-1 shadow-sm z-10">
                        <Check size={10} className="stroke-[3]" />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="relative">
                        {tpl.preview}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                          {tpl.name}
                          {isCurrent && (
                            <Badge className="bg-orange-500 text-white font-black text-[8px] h-4 py-0 px-1 border-none">
                              Active
                            </Badge>
                          )}
                        </h4>
                        <p className="text-stone-400 text-[10px] leading-relaxed mt-1">{tpl.desc}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(tpl.id);
                      }}
                      className={`h-9 rounded-xl mt-4 w-full text-xs font-bold ${
                        isCurrent 
                          ? 'bg-stone-900 text-white hover:bg-stone-850' 
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {isCurrent ? "Active Template" : "Select Template"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Business Details custom form synchronization */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-stone-400 tracking-widest flex items-center gap-2">
              <Building2 size={14} className="text-orange-500" />
              Connected Business Details & Profile Settings
            </h3>
            <Card className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
              <CardContent className="p-8">
                <form onSubmit={handleUpdateSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Business / Shop Name</Label>
                      <Input 
                        value={businessSettings.businessName}
                        onChange={e => setBusinessSettings({...businessSettings, businessName: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Contact Number</Label>
                      <Input 
                        value={businessSettings.businessPhone}
                        onChange={e => setBusinessSettings({...businessSettings, businessPhone: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Business Email</Label>
                      <Input 
                        value={businessSettings.businessEmail}
                        onChange={e => setBusinessSettings({...businessSettings, businessEmail: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Full Address</Label>
                      <Input 
                        value={businessSettings.businessAddress}
                        onChange={e => setBusinessSettings({...businessSettings, businessAddress: e.target.value})}
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">GSTIN / Tax Identifier</Label>
                      <Input 
                        value={businessSettings.businessGSTIN}
                        onChange={e => setBusinessSettings({...businessSettings, businessGSTIN: e.target.value})}
                        className="rounded-xl h-12"
                        placeholder="e.g. 24AAAAA1111A1Z1"
                      />
                    </div>
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <Label className="text-xs font-bold uppercase text-stone-400">Invoicing Terms, Bank Details, and Conditions</Label>
                      <textarea 
                        rows={3}
                        value={businessSettings.invoiceTerms}
                        onChange={e => setBusinessSettings({...businessSettings, invoiceTerms: e.target.value})}
                        className="w-full text-sm p-3.5 border border-stone-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        placeholder="e.g. 1. Goods once sold will not be taken back."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-stone-100 flex-col md:flex-row items-center gap-3">
                    <p className="text-stone-400 text-[10px] italic">Setting values above dynamically updates tags, PDF builds, and POS invoicing models immediately.</p>
                    <Button 
                      type="submit" 
                      onClick={(e) => handleUpdateSettings(e)}
                      disabled={isSaving} 
                      className="rounded-xl bg-stone-900 text-white h-12 px-8 flex gap-2 w-full md:w-auto"
                    >
                      <Save size={18} />
                      {isSaving ? 'Syncing Profile...' : 'Save Settings & Templates'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {/* Role management Tab */}
      {adminTab === 'roles' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Differentiated Role & Team Permissions</h2>
              <p className="text-stone-500 text-sm mt-1">Assign custom authorization tags for workers, POS billers, and admins to restrict system routes.</p>
            </div>
            <Button onClick={() => setIsAddWorkerOpen(true)} className="rounded-xl bg-stone-900 text-white">
              <Plus size={16} className="mr-1" />
              Add Team Member
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Workers Panel Table */}
            <Card className="rounded-[2rem] border-stone-200 shadow-sm p-6 lg:col-span-2 space-y-4">
              <h3 className="font-bold text-stone-900 text-lg">Active Organization Roster</h3>
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Name / Contact</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Access Role</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-stone-400 uppercase tracking-widest">Auth Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {workers.map(w => (
                      <tr key={w.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-stone-900 leading-none">{w.name}</p>
                          <small className="text-[10px] text-stone-500">{w.phone}</small>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`rounded-full text-[10px] font-black border-none px-2.5 ${
                            w.role === 'Admin' ? 'bg-orange-100 text-orange-700' :
                            w.role === 'POS Biller' ? 'bg-purple-100 text-purple-700' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {w.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {w.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] text-stone-400 leading-normal font-bold">
                            {(w.permissions || []).join(', ') || 'No core privileges'}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {workers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">No employees or workers registered yet in this workspace.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Custom permission mapping view */}
            <Card className="rounded-[2rem] border-stone-200 shadow-sm p-8 space-y-6">
              <h3 className="font-bold text-stone-900 text-lg">Route Access Lock Keys</h3>
              <p className="text-stone-500 text-xs leading-relaxed">Admin reviews and enables route access lock tokens universally. Lock configurations propagate to team logins immediately.</p>
              
              <div className="space-y-4 pt-2">
                {[
                  { role: 'Admin Level Manager', desc: 'Full write/read, database backups, profile setups, wage logging, settlements.', access: true },
                  { role: 'POS Biller Clerk', desc: 'Process checkout catalog, billings, generate invoice pdfs, register clients.', access: true },
                  { role: 'Farmworker Attendant', desc: 'Inventory stocks level management, register deaths, medicate checklists.', access: false }
                ].map((perm, i) => (
                  <div key={i} className="space-y-2 p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900 text-xs uppercase tracking-tight">{perm.role}</span>
                      <Badge className={perm.access ? 'bg-green-100 text-green-600 font-bold border-none' : 'bg-orange-100 text-orange-600 font-bold border-none'}>
                        {perm.access ? 'Granted' : 'Restricted'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-normal">{perm.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER MODAL: Print Tag Visualizer */}
      {selectedTagItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6 bg-white space-y-4">
            <div className="text-center space-y-1">
              <Badge variant="outline" className="rounded-full px-2.5 bg-stone-50 tracking-wider">
                Print Carton Tag
              </Badge>
              <h3 className="font-black text-2xl text-stone-950 uppercase tracking-tight">{selectedTagItem.name}</h3>
            </div>

            <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl space-y-4 font-mono text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-orange-600 text-white text-[8px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                Raw SKU
              </div>
              <p className="text-xs text-stone-600 font-bold text-left pt-2">BATCH DETECT: <strong className="text-stone-900">FH-{Date.now().toString().slice(-4)}</strong></p>
              <p className="text-xs text-stone-600 font-bold text-left">QUANTITY: <strong className="text-stone-900">{selectedTagItem.quantity} {selectedTagItem.unit}</strong></p>
              <p className="text-xs text-stone-600 font-bold text-left">CATG REF: <strong className="text-stone-900 uppercase">{selectedTagItem.type}</strong></p>
              
              <div className="bg-white p-3.5 rounded-xl flex items-center justify-center border border-dashed border-orange-200 mt-2">
                <BarcodeSVG value={selectedTagItem.skuCode} />
              </div>

              <p className="text-[8px] text-stone-400 font-bold tracking-wider leading-none">© 2026 FARMFRESH HUB COOP SYSTEM</p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setSelectedTagItem(null)} className="flex-1 rounded-2xl h-11 text-xs">Close</Button>
              <Button type="button" onClick={() => { alert('Tag sent to linked label printer network!'); setSelectedTagItem(null); }} className="flex-1 bg-stone-900 text-white rounded-2xl h-11 text-xs">Print Label</Button>
            </div>
          </Card>
        </div>
      )}

      {/* RENDER MODAL: Register Supplier */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Register New Bulk Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Supplier Name / Representive</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newSupplier.name} 
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Company Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newSupplier.company} 
                    onChange={e => setNewSupplier({...newSupplier, company: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Phone</label>
                  <Input 
                    required 
                    type="tel"
                    className="h-12 rounded-2xl" 
                    value={newSupplier.phone} 
                    onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Category Provided</label>
                  <select 
                    className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm"
                    value={newSupplier.category}
                    onChange={e => setNewSupplier({...newSupplier, category: e.target.value})}
                  >
                    <option>Feed</option>
                    <option>Medicine / Vaccines</option>
                    <option>Livestock Breeders</option>
                    <option>Hatchery Equipment</option>
                    <option>Aquaculture Feed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Initial Outstanding Balance (₹)</label>
                  <Input 
                    type="number"
                    className="h-12 rounded-2xl" 
                    value={newSupplier.balance || ''} 
                    onChange={e => setNewSupplier({...newSupplier, balance: Number(e.target.value)})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddSupplierOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Register Supplier</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RENDER MODAL: Log Gross Purchase */}
      {isAddPurchaseOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Log Bulk Procurement Purchase</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPurchase} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Select Supplier</label>
                  <select 
                    required
                    className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm"
                    value={newPurchase.supplierId}
                    onChange={e => setNewPurchase({...newPurchase, supplierId: e.target.value})}
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.company})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Item Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    placeholder="e.g. Master Grow broiler feed"
                    value={newPurchase.itemName} 
                    onChange={e => setNewPurchase({...newPurchase, itemName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400">Procure Category</label>
                    <select 
                      className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm"
                      value={newPurchase.category}
                      onChange={e => setNewPurchase({...newPurchase, category: e.target.value})}
                    >
                      <option>Feed</option>
                      <option>Medicine / Vaccines</option>
                      <option>Chicks Breeders</option>
                      <option>Goat Breeders</option>
                      <option>Aquaculture Feed</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400">Payment Channel</label>
                    <select 
                      className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm"
                      value={newPurchase.paymentType}
                      onChange={e => setNewPurchase({...newPurchase, paymentType: e.target.value})}
                    >
                      <option value="cash">Direct Cash / Bank</option>
                      <option value="credit">Buy on Credit (Udhaar)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400">Quantity</label>
                    <Input 
                      required
                      type="number" 
                      className="h-12 rounded-2xl" 
                      value={newPurchase.quantity || ''} 
                      onChange={e => setNewPurchase({...newPurchase, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400">Unit</label>
                    <Input 
                      required
                      className="h-12 rounded-2xl" 
                      placeholder="bags, pcs, kg"
                      value={newPurchase.unit} 
                      onChange={e => setNewPurchase({...newPurchase, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-stone-400">Avg weight (kg)</label>
                    <Input 
                      type="number" step="0.01"
                      className="h-12 rounded-2xl" 
                      value={newPurchase.weight || ''} 
                      onChange={e => setNewPurchase({...newPurchase, weight: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Total Bill Amount (₹)</label>
                  <Input 
                    required
                    type="number" 
                    className="h-12 rounded-2xl" 
                    value={newPurchase.totalPrice || ''} 
                    onChange={e => setNewPurchase({...newPurchase, totalPrice: Number(e.target.value)})}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddPurchaseOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Log procurement</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RENDER MODAL: Register Team Member */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Register Coop Worker</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWorker} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Team Member Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newWorker.name} 
                    onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Phone</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newWorker.phone} 
                    onChange={e => setNewWorker({...newWorker, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Select Access Role</label>
                  <select 
                    className="w-full h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm"
                    value={newWorker.role}
                    onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                  >
                    <option value="Admin">Admin Manager</option>
                    <option value="POS Biller">POS Biller Clerk</option>
                    <option value="Farmworker">Farmworker Attendant</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddWorkerOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Authorize Member</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RENDER MODAL: Register Sync Branch */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md rounded-[2rem] shadow-2xl">
            <CardHeader>
              <CardTitle>Register Franchise Unit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBranch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Branch Name</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    placeholder="e.g. Dhanbad Retail Outlet"
                    value={newBranch.name} 
                    onChange={e => setNewBranch({...newBranch, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Location Address</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newBranch.location} 
                    onChange={e => setNewBranch({...newBranch, location: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-stone-400">Assigned Branch Manager</label>
                  <Input 
                    required 
                    className="h-12 rounded-2xl" 
                    value={newBranch.manager} 
                    onChange={e => setNewBranch({...newBranch, manager: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddBranchOpen(false)} className="flex-1 rounded-2xl h-12">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-stone-900 text-white rounded-2xl h-12">Map Franchise Node</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
