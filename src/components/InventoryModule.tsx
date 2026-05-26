import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, increment, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Plus, Package, AlertTriangle, ArrowRightLeft, Warehouse, Trash2, History } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { format } from 'date-fns';

export default function InventoryModule({ profile, initialFilter = 'all' }: { profile?: any, initialFilter?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>(initialFilter);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'live_bird',
    quantity: 0,
    price: 0,
    unit: 'pcs',
    lowStockThreshold: 10,
    locationType: 'farm'
  });

  useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'inventory'), where('ownerId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const sortedItems = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setItems(sortedItems);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));
    return () => unsub();
  }, [profile]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to manage inventory.");
        return;
      }

      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        locationId: 'default', // In real app, select farm/shop ID
        ownerId: profile?.uid || 'unknown',
        createdAt: new Date().toISOString()
      });
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'inventory_add',
        itemName: newItem.name,
        quantity: newItem.quantity,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
      setIsAddItemOpen(false);
      setNewItem({
        name: '',
        type: 'live_bird',
        quantity: 0,
        price: 0,
        unit: 'pcs',
        lowStockThreshold: 10,
        locationType: 'farm'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified.");
        return;
      }
      await deleteDoc(doc(db, 'inventory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
    }
  };

  const updateStock = async (itemId: string, delta: number) => {
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified.");
        return;
      }

      const itemRef = doc(db, 'inventory', itemId);
      const itemIdx = items.findIndex(i => i.id === itemId);
      const currentItem = items[itemIdx];
      const newQty = currentItem.quantity + delta;

      await updateDoc(itemRef, {
        quantity: increment(delta)
      });

      // Stock alert logic
      if (newQty <= (currentItem.lowStockThreshold || 0)) {
        await notificationService.notify('admin', {
          title: 'Low Stock Alert',
          message: `${currentItem.name} is low on stock (${newQty} ${currentItem.unit} left)`,
          type: 'warning',
          category: 'stock'
        });
      }

      // Log movement activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'stock_movement',
        itemId,
        itemName: currentItem.name,
        delta,
        newQty,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        userId: profile?.uid || 'unknown',
        userName: profile?.name || 'System'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Package className="text-orange-600" />
          Inventory Stock
        </h3>
        <div className="flex gap-2">
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-xl bg-stone-900 text-white shadow-sm">
                  <Plus size={18} className="mr-2" />
                  Add Item
                </Button>
              }
            />
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input 
                    required 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})} 
                    placeholder="e.g. Starter Feed, Broiler Bird"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select 
                      className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                      value={newItem.type}
                      onChange={e => setNewItem({...newItem, type: e.target.value})}
                    >
                      <option value="live_bird">Live Bird</option>
                      <option value="hen">Hen</option>
                      <option value="duck">Duck</option>
                      <option value="goat">Goat</option>
                      <option value="dressed_chicken">Dressed Chicken</option>
                      <option value="egg">Egg</option>
                      <option value="feed">Feed</option>
                      <option value="medicine">Medicine</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <select 
                      className="w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                      value={newItem.locationType}
                      onChange={e => setNewItem({...newItem, locationType: e.target.value})}
                    >
                      <option value="farm">Farm</option>
                      <option value="shop">Shop</option>
                      <option value="cold_storage">Cold Storage</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.quantity || ''} 
                      onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low Alert Threshold</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.lowStockThreshold || ''} 
                      onChange={e => setNewItem({...newItem, lowStockThreshold: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input 
                      required 
                      value={newItem.unit} 
                      onChange={e => setNewItem({...newItem, unit: e.target.value})} 
                      placeholder="kg, pcs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selling Price (₹)</Label>
                    <Input 
                      type="number" 
                      required 
                      value={newItem.price || ''} 
                      onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-stone-900 text-white rounded-xl h-12">
                  Add to Inventory
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x pointer-events-auto">
        {[
          { label: 'All Stock', value: 'all' },
          { label: 'Hens / Birds', value: 'hen' },
          { label: 'Ducks', value: 'duck' },
          { label: 'Eggs', value: 'egg' },
          { label: 'Goats', value: 'goat' },
          { label: 'Fish', value: 'fish' },
          { label: 'Feed', value: 'feed' },
          { label: 'Medicine', value: 'medicine' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilterType(tab.value)}
            className={`px-4 py-2 text-xs font-black rounded-full uppercase tracking-wider transition-all duration-300 pointer-events-auto shrink-0 snap-start border ${
              filterType === tab.value
                ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.filter(item => {
          if (!filterType || filterType === 'all') return true;
          const t = (item.type || '').toLowerCase();
          const filter = filterType.toLowerCase();
          if (filter === 'hen') {
            return t === 'hen' || t === 'live_bird' || t === 'chicken' || t === 'bird';
          }
          if (filter === 'egg') {
            return t === 'egg' || t === 'eggs';
          }
          if (filter === 'duck') {
            return t === 'duck' || t === 'ducks';
          }
          if (filter === 'goat') {
            return t === 'goat' || t === 'goats';
          }
          if (filter === 'fish') {
            return t === 'fish' || t === 'fishes';
          }
          return t === filter;
        }).map((item) => {
          const getImageForType = (type: string) => {
            const t = (type || '').toLowerCase();
            switch(t) {
              case 'duck': return 'https://images.unsplash.com/photo-1570481662006-a3a13746fe9f?auto=format&fit=crop&q=60&w=400'; 
              case 'egg':
              case 'eggs': return 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=60&w=400';
              case 'hen':
              case 'chicken':
              case 'live_bird': return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=60&w=400';
              case 'goat': return 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=60&w=400';
              case 'fish': return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=60&w=400';
              case 'feed': return 'https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?auto=format&fit=crop&q=60&w=400';
              case 'dressed_chicken': 
              case 'meat': return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=60&w=400';
              case 'medicine': return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=60&w=400';
              default: return 'https://images.unsplash.com/photo-1586769852044-692d6e67638d?auto=format&fit=crop&q=60&w=400';
            }
          };

          return (
            <Card key={item.id} className="rounded-[2.5rem] border-stone-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-500 bg-white">
              <div className="h-48 w-full overflow-hidden relative">
                <img 
                  src={getImageForType(item.type)} 
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                    {item.type.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                    <Warehouse size={12} className="text-orange-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight">{item.locationType}</span>
                  </div>
                </div>
              </div>
              <CardHeader className="pb-2 pt-5 px-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-black tracking-tighter text-stone-900 group-hover:text-orange-600 transition-colors">{item.name}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-black tracking-[0.2em] text-stone-400 mt-0.5">REF: {item.id.slice(0, 8)}</CardDescription>
                  </div>
                  <Badge variant={item.quantity <= (item.lowStockThreshold || 0) ? 'destructive' : 'outline'} className="rounded-full font-bold text-[9px] h-5">
                    {item.quantity <= (item.lowStockThreshold || 0) ? 'LOW' : 'STOCK'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 flex-1 px-6 pb-6">
                <div className="flex justify-between items-end mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Available Stock</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-stone-900 leading-none">{item.quantity}</span>
                      <span className="text-xs font-black text-stone-400 uppercase">{item.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Price Point</p>
                    <div className="px-3 py-1 bg-green-50 rounded-full border border-green-100 inline-block">
                      <p className="text-sm font-black text-green-700 tracking-tight">₹{item.price}<span className="text-[10px] ml-0.5 opacity-60">/{item.unit}</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-[1.25rem] border border-stone-200">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateStock(item.id, -1)}
                    className="flex-1 h-11 rounded-xl bg-white shadow-sm hover:text-red-600 hover:shadow-md transition-all active:scale-95"
                  >
                    <span className="text-xl font-black">−</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => updateStock(item.id, 1)}
                    className="flex-1 h-11 rounded-xl bg-white shadow-sm hover:text-green-600 hover:shadow-md transition-all active:scale-95"
                  >
                    <span className="text-xl font-black">+</span>
                  </Button>
                  <div className="w-px h-6 bg-stone-300 mx-1" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteItem(item.id)}
                    className="h-11 w-11 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
