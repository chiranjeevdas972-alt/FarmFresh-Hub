import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Bird, ShoppingBag, LayoutDashboard, LogOut, Package, History, BrainCircuit, Plus, Users, Wallet, BarChart3, Truck, FileText, ShieldCheck, ArrowLeft, Menu, X, Lock, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import InventoryModule from './InventoryModule';
import ShopModule from './ShopModule';
import FarmModule from './FarmModule';
import AccountsModule from './AccountsModule';
import CustomerModule from './CustomerModule';
import AnalyticsModule from './AnalyticsModule';
import DeliveryModule from './DeliveryModule';
import AdvancedReportingModule from './AdvancedReportingModule';
import AdminModule from './AdminModule';
import Activity from './Activity';
import NotificationCenter from './NotificationCenter';
import FeatureLockedScreen from './FeatureLockedScreen';
import { useTranslation } from 'react-i18next';
import SecurityPolicyModal from './SecurityPolicyModal';
import AccountGovernanceModal from './AccountGovernanceModal';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where, doc, updateDoc } from 'firebase/firestore';

interface DashboardProps {
  user: FirebaseUser;
  profile: any;
  onLogout: () => void;
  onUpgrade: (plan: { name: string, price: number }) => void;
}

const HenIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2C14.2091 2 16 3.79086 16 6V8" />
    <path d="M16 8C19 8 20 10 20 12C20 14 19 16 16 16H8C5 16 4 14 4 12C4 10 5 8 8 8" />
    <path d="M8 8V6C8 3.79086 9.79086 2 12 2Z" />
    <path d="M10 16V20" />
    <path d="M14 16V20" />
    <circle cx="10" cy="11" r="0.5" fill="currentColor" />
    <path d="M15 4L17 3" strokeWidth="1.5" />
    <path d="M13 3L15 2" strokeWidth="1.5" />
  </svg>
);

export default function Dashboard({ user, profile, onLogout, onUpgrade }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [inventoryFilter, setInventoryFilter] = useState<string>('all');
  const [moduleAction, setModuleAction] = useState<string | null>(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gatedPlanRequired, setGatedPlanRequired] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; tab: 'terms' | 'privacy' }>({
    isOpen: false,
    tab: 'terms'
  });
  const [showGovernance, setShowGovernance] = useState(false);
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    birdsFromInventory: 0,
    birdsFromBatches: 0,
    totalSales: 0,
    activeBatches: 0,
    lowStock: 0
  });

  useEffect(() => {
    if (!profile) return;

    // Basic stats listeners
    const unsubInv = onSnapshot(query(collection(db, 'inventory'), where('ownerId', '==', profile.uid)), (snapshot) => {
      let birds = 0;
      let low = 0;
      snapshot.docs.forEach(docItem => {
        const data = docItem.data();
        const type = data.type;
        const qty = Number(data.quantity) || 0;
        const threshold = Number(data.lowStockThreshold) !== undefined ? Number(data.lowStockThreshold) : 10;
        
        if (['live_bird', 'hen', 'goat'].includes(type)) birds += qty;
        
        // Count as low stock if quantity is less than or equal to threshold
        if (qty <= threshold) {
          low++;
        }
      });
      setStats(prev => ({ ...prev, birdsFromInventory: birds, lowStock: low }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('ownerId', '==', profile.uid)), (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => total += (Number(doc.data().total) || 0));
      setStats(prev => ({ ...prev, totalSales: total }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'sales'));

    const unsubBatches = onSnapshot(query(collection(db, 'batches'), where('ownerId', '==', profile.uid)), (snapshot) => {
      const activeDocs = snapshot.docs.filter(d => d.data().status === 'active');
      const active = activeDocs.length;
      let birdCount = 0;
      activeDocs.forEach(doc => {
        birdCount += (Number(doc.data().currentQuantity) || 0);
      });
      setStats(prev => ({ ...prev, activeBatches: active, birdsFromBatches: birdCount }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'batches'));

    return () => {
      unsubInv();
      unsubSales();
      unsubBatches();
    };
  }, [profile]);

  const totalBirds = stats.birdsFromInventory + stats.birdsFromBatches;

  const menuItems = [
    { id: 'overview', label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
    { id: 'farm', label: t('farm'), icon: <HenIcon size={18} /> },
    { id: 'shop', label: t('shop'), icon: <ShoppingBag size={18} /> },
    { id: 'inventory', label: t('inventory'), icon: <Package size={18} /> },
    { id: 'accounts', label: t('accounts'), icon: <Wallet size={18} /> },
    { id: 'customers', label: t('customers'), icon: <Users size={18} /> },
    { id: 'delivery', label: 'Delivery', icon: <Truck size={18} /> },
    { id: 'advanced_reports', label: 'Financials', icon: <FileText size={18} /> },
    { id: 'admin', label: 'Admin', icon: <ShieldCheck size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  ];

  const isPlanGated = (tabId: string) => {
    return null;
  };

  const visibleMenuItems = menuItems.filter(item => {
    if (item.id === 'overview' || item.id === 'admin') return true;
    const toggles = profile?.featureToggles || {};
    if (toggles[item.id] === false) return false;
    return true;
  });

  const isFeatureDisabled = (tabId: string) => {
    if (tabId === 'overview' || tabId === 'admin') return false;
    const toggles = profile?.featureToggles || {};
    return toggles[tabId] === false;
  };

  const getFeatureName = (tabId: string) => {
    switch (tabId) {
      case 'farm': return 'Farm Management & Batches';
      case 'shop': return 'POS Billing & Shop Sales';
      case 'inventory': return 'Stock Management & Inventory';
      case 'accounts': return 'Ledger Accounts & Balance';
      case 'customers': return 'Customer Directory & CRM';
      case 'delivery': return 'Delivery & Shipping Logistics';
      case 'advanced_reports': return 'Financial Reporting & Profit/Loss';
      case 'analytics': return 'Predictive Smart AI & Graphs';
      default: return 'Requested Feature';
    }
  };

  const handleTabChange = (id: string) => {
    const requiredPlan = isPlanGated(id);
    if (requiredPlan) {
      setGatedPlanRequired(requiredPlan);
      setShowUpgradeModal(true);
      return;
    }
    setActiveTab(id);
    setIsSidebarOpen(false);
    if (id === 'inventory') {
      setInventoryFilter('all');
    }
  };

  return (
    <div className="flex h-screen lg:h-screen min-h-[100dvh] bg-stone-50 overflow-hidden relative safe-px">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 left-0 w-64 bg-white border-r border-stone-200 flex flex-col z-[200] transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} safe-pt safe-pb`}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              <HenIcon size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-stone-900 truncate max-w-[150px]" title={profile?.businessName || 'Farm Fresh Hub'}>
              {profile?.businessName || 'Farm Fresh Hub'}
            </span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-stone-400 hover:text-stone-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const reqPlan = isPlanGated(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-stone-900 text-white shadow-lg shadow-stone-200' 
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                {reqPlan && (
                  <Lock size={12} className="text-orange-600 shrink-0 opacity-70" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : (
                <Users size={16} className="text-orange-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.displayName}</p>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{profile?.role}</p>
                {profile?.subscriptionType && (
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded-full font-black ${
                      profile.subscriptionType === 'professional' ? 'bg-purple-100 text-purple-700' :
                      profile.subscriptionType === 'standard' ? 'bg-orange-100 text-orange-700' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {profile.subscriptionType}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-4 mb-3 border-t border-stone-100 pt-3 select-none">
            <div className="flex justify-between items-center text-[10px] text-stone-400 font-extrabold uppercase tracking-widest">
              <button
                onClick={() => setSecurityModal({ isOpen: true, tab: 'terms' })}
                className="hover:text-stone-700 transition-colors cursor-pointer bg-transparent border-none p-0 normal-case font-extrabold"
              >
                Terms
              </button>
              <span>•</span>
              <button
                onClick={() => setSecurityModal({ isOpen: true, tab: 'privacy' })}
                className="hover:text-stone-700 transition-colors cursor-pointer bg-transparent border-none p-0 normal-case font-extrabold"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                onClick={() => setShowGovernance(true)}
                className="hover:text-stone-900 text-orange-600 transition-colors cursor-pointer bg-transparent border-none p-0 normal-case font-extrabold underline decoration-orange-600/30"
              >
                Data Control
              </button>
            </div>
          </div>

          <Button 
            onClick={onLogout} 
            variant="ghost" 
            className="w-full justify-start text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut size={18} className="mr-3" />
            {t('logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 safe-pt safe-pb">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-stone-100 text-stone-500"
            >
              <Menu size={24} />
            </button>
            {activeTab !== 'overview' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveTab('overview')}
                className="hidden sm:flex rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft size={24} />
              </Button>
            )}
            <div className="min-w-0">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 truncate">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-stone-500 mt-1 truncate">
                Welcome back, {user.displayName?.split(' ')[0]}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto justify-between sm:justify-end">
            <NotificationCenter />
            <Dialog 
              open={isQuickActionOpen} 
              onOpenChange={setIsQuickActionOpen}
            >
              <DialogTrigger
                render={
                  <Button className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2 h-11 px-4 sm:px-6">
                    <Plus size={18} />
                    <span className="hidden sm:inline">Quick Action</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                }
              />
              <DialogContent className="rounded-[2rem] max-w-[90vw] sm:max-w-sm p-4 sm:p-6 border-none">
                <DialogHeader className="flex flex-row items-center justify-between mb-4 space-y-0">
                  <DialogTitle className="text-xl font-bold text-stone-900">Quick Actions</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-2">
                  {[
                    { label: 'NEW SALE', icon: <ShoppingBag size={24} />, active: 'shop', action: 'new-sale', color: 'bg-[#FFF7ED] text-[#EA580C]' },
                    { label: 'ADD CHICK', icon: <HenIcon size={24} />, active: 'farm', action: 'add-batch', color: 'bg-[#FFF7ED] text-[#EA580C]' },
                    { label: 'LOG FEED', icon: <Package size={24} />, active: 'farm', action: 'log-feed', color: 'bg-[#FFFBEB] text-[#D97706]' },
                    { label: 'ADD EXPENSE', icon: <Wallet size={24} />, active: 'accounts', action: 'add-expense', color: 'bg-[#FEF2F2] text-[#DC2626]' },
                    { label: 'NEW CUST', icon: <Users size={24} />, active: 'customers', action: 'add-cust', color: 'bg-[#FAF5FF] text-[#9333EA]' },
                    { label: 'REPORTS', icon: <BarChart3 size={24} />, active: 'analytics', action: 'reports', color: 'bg-[#F0FDF4] text-[#16A34A]' },
                  ].map((act, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleTabChange(act.active);
                        if (act.action) setModuleAction(act.action);
                        setIsQuickActionOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 ${act.color}`}
                    >
                      <div className="mb-2">{act.icon}</div>
                      <span className="text-[10px] font-black tracking-wider text-center">{act.label}</span>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                   { label: 'TOTAL HENS, GOATS, BIRDS', value: totalBirds.toLocaleString(), color: 'text-stone-900', target: 'farm' },
                   { label: t('total_sales'), value: `₹${stats.totalSales.toLocaleString()}`, color: 'text-green-600', target: 'analytics' },
                   { label: 'Active Batches', value: stats.activeBatches, color: 'text-blue-600', target: 'farm' },
                   { label: 'Low Stock Items', value: stats.lowStock, color: stats.lowStock > 0 ? 'text-red-600' : 'text-stone-900', target: 'inventory' },
                ].map((stat, i) => (
                  <Card 
                    key={i} 
                    className="rounded-3xl border-stone-200 shadow-sm overflow-hidden cursor-pointer hover:border-orange-200 transition-colors group"
                    onClick={() => handleTabChange(stat.target)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-stone-400 group-hover:text-orange-500 transition-colors">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="overflow-x-hidden">
                  <AnalyticsModule 
                    onNavigate={(tab) => setActiveTab(tab)} 
                    action={moduleAction} 
                    onActionComplete={() => setModuleAction(null)} 
                    profile={profile}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">Live Stock Catalog</h3>
                    <Button 
                      variant="link" 
                      onClick={() => setActiveTab('inventory')}
                      className="text-orange-600 font-bold p-0"
                    >
                      View All
                    </Button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {[
                      { name: 'Hen', id: 'hen', type: 'hen' },
                      { name: 'Duck', id: 'duck', type: 'duck' },
                      { name: 'Egg', id: 'egg', type: 'egg' },
                      { name: 'Goat', id: 'goat', type: 'goat' },
                      { name: 'Fish', id: 'fish', type: 'fish' }
                    ].map((item) => {
                      const getImage = (type: string) => {
                        if (type === 'hen') return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=60&w=200';
                        if (type === 'duck') return 'https://images.unsplash.com/photo-1570481662006-a3a13746fe9f?auto=format&fit=crop&q=60&w=200';
                        if (type === 'egg') return 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=60&w=200';
                        if (type === 'goat') return 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=60&w=200';
                        if (type === 'fish') return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=60&w=200';
                        return '';
                      };
                      return (
                        <div 
                          key={item.id} 
                          className="min-w-[140px] sm:min-w-[180px] bg-white p-2 rounded-3xl border border-stone-200 shadow-xs snap-start hover:border-orange-200 transition-colors cursor-pointer group"
                          onClick={() => {
                            setInventoryFilter(item.type);
                            setActiveTab('inventory');
                          }}
                        >
                          <div className="h-24 sm:h-32 w-full rounded-2xl overflow-hidden mb-3 relative">
                            <img 
                              src={getImage(item.type)} 
                              alt={item.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-stone-900/10" />
                          </div>
                          <p className="text-center font-black text-xs text-stone-900 uppercase tracking-tighter">{item.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
          )}

          <div className="w-full">
            {isFeatureDisabled(activeTab) ? (
              <FeatureLockedScreen 
                featureName={getFeatureName(activeTab)} 
                role={profile?.role} 
                onBackToOverview={() => setActiveTab('overview')} 
                onGoToAdmin={() => setActiveTab('admin')} 
              />
            ) : (
              <>
                {activeTab === 'farm' && <FarmModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
                {activeTab === 'shop' && <ShopModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
                {activeTab === 'inventory' && <InventoryModule profile={profile} initialFilter={inventoryFilter} />}
                {activeTab === 'accounts' && <AccountsModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
                {activeTab === 'customers' && <CustomerModule action={moduleAction} onActionComplete={() => setModuleAction(null)} profile={profile} />}
                {activeTab === 'delivery' && <DeliveryModule profile={profile} />}
                {activeTab === 'advanced_reports' && <AdvancedReportingModule profile={profile} />}
                {activeTab === 'admin' && <Activity profile={profile} />}
                {activeTab === 'analytics' && (
                  <AnalyticsModule 
                    onNavigate={(tab) => setActiveTab(tab)} 
                    action={moduleAction} 
                    onActionComplete={() => setModuleAction(null)} 
                    profile={profile}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Dynamic Subscription Gating Dialog */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md border-stone-200">
          <DialogHeader className="space-y-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold text-stone-900 tracking-tight">
              Unlock {gatedPlanRequired}!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <p className="text-stone-500 text-xs leading-relaxed">
              This panel belongs to professional logistics & analytics dashboards, requiring the <span className="font-bold text-stone-900">{gatedPlanRequired}</span> scale. Upgrade now to enable connected warehouses, AI demand predictions, and thermal invoicing.
            </p>

            <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-850">
                <Check size={14} className="text-emerald-600" />
                <span>Gain 100% full instant access</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-850">
                <Check size={14} className="text-emerald-600" />
                <span>Connected clouds & offline backups</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={async () => {
                  if (!user?.uid) return;
                  try {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                      subscriptionType: (gatedPlanRequired || '').toLowerCase()
                    });
                    setShowUpgradeModal(false);
                    setGatedPlanRequired(null);
                    alert(`Success! Activated the ${gatedPlanRequired} subscription level.`);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full h-12 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800"
              >
                Instant Upgrade to {gatedPlanRequired}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-xs text-stone-450 hover:bg-stone-50 rounded-xl h-10"
              >
                Cancel & Go Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SecurityPolicyModal 
        isOpen={securityModal.isOpen} 
        onClose={() => setSecurityModal({ ...securityModal, isOpen: false })} 
        initialTab={securityModal.tab} 
      />

      <AccountGovernanceModal 
        isOpen={showGovernance}
        onClose={() => setShowGovernance(false)}
        user={user}
        profile={profile}
        onLogout={onLogout}
      />
    </div>
  );
}
