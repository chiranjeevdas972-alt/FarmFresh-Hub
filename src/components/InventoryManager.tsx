import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Trash2, Plus, Package } from 'lucide-react';

const SUB_TYPES: Record<string, string[]> = {
  hen: ['Broiler (ब्रॉयलर)', 'Layer (लेयर)', 'Kadaknath (कड़कनाथ)', 'Sonali (सोनाली)', 'Desi / Country Chicken (देसी)'],
  goat: ['Sirohi (सिरोही)', 'Jamnapari (जमुनापारी)', 'Barbari (बरबरी)', 'Black Bengal (ब्लैक बंगाल)', 'Boer (बोअर)'],
  fish: ['Rohu (रोहू)', 'Catla (कतला)', 'Tilapia (तिलापिया)', 'Pangasius (पंगासियस)', 'Common Carp (कॉमन कार्प)'],
  egg: ['White Eggs (सफेद अंडे)', 'Brown Eggs (भूरे अंडे)', 'Desi Eggs (देसी अंडे)', 'Hatching Eggs (प्रजूनन अंडे)']
};

export default function InventoryManager({ profile }: { profile: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'bird',
    quantity: 0,
    unit: 'pcs',
    subType: ''
  });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'inventory'), where('ownerId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));
    return () => unsub();
  }, [profile]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity <= 0 || !profile) return;
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to manage inventory.");
        return;
      }
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        ownerId: profile.uid,
        lastUpdated: new Date().toISOString()
      });
      setNewItem({ name: '', type: 'bird', quantity: 0, unit: 'pcs', subType: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-600" />
            Add New Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Item Name</label>
              <Input 
                placeholder="Item Name (e.g. Broiler Chicks)" 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Type</label>
              <Select value={newItem.type} onValueChange={val => {
                const defaultSub = SUB_TYPES[val] ? SUB_TYPES[val][0] : '';
                setNewItem({...newItem, type: val, subType: defaultSub});
              }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bird">Birds</SelectItem>
                  <SelectItem value="hen">Hen</SelectItem>
                  <SelectItem value="duck">Duck</SelectItem>
                  <SelectItem value="goat">Goat</SelectItem>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                  <SelectItem value="egg">Eggs</SelectItem>
                  <SelectItem value="meat">Meat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {SUB_TYPES[newItem.type] ? (
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Sub-Type / Breed</label>
                <Select value={newItem.subType} onValueChange={val => setNewItem({...newItem, subType: val})}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sub-Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_TYPES[newItem.type].map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className={SUB_TYPES[newItem.type] ? "md:col-span-3" : "md:col-span-5"}>
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">Quantity & Unit</label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={newItem.quantity || ''}
                  onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  className="rounded-xl"
                />
                <Input 
                  placeholder="Unit" 
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  className="rounded-xl w-20"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full h-10 rounded-xl bg-stone-900 text-white hover:bg-stone-800">
                Add Item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-stone-50">
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const getImageForType = (type: string) => {
                const t = (type || '').toLowerCase();
                switch(t) {
                  case 'duck': return 'https://images.unsplash.com/photo-1570481662006-a3a13746fe9f?auto=format&fit=crop&q=60&w=100';
                  case 'egg': 
                  case 'eggs': return 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=60&w=100';
                  case 'hen':
                  case 'chicken':
                  case 'bird':
                  case 'live_bird': return 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=60&w=100';
                  case 'goat': return 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=60&w=100';
                  case 'fish': return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&q=60&w=100';
                  case 'feed': return 'https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?auto=format&fit=crop&q=60&w=100';
                  case 'dressed_chicken': 
                  case 'meat': return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=60&w=100';
                  case 'medicine': return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=60&w=100';
                  default: return 'https://images.unsplash.com/photo-1586769852044-692d6e67638d?auto=format&fit=crop&q=60&w=100';
                }
              };

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-100 shadow-xs">
                      <img 
                        src={getImageForType(item.type)} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize rounded-full px-3 text-[10px] font-bold">
                      {item.type}{item.subType ? ` (${item.subType})` : ''}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-stone-900">{item.quantity} {item.unit}</TableCell>
                  <TableCell className="text-stone-500 text-[10px] font-bold uppercase tracking-tight">
                    {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(item.id)}
                      className="text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-stone-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No items in inventory
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
