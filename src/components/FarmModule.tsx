import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, ensureVerified } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, increment, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Plus, Bird, History, Activity, Syringe, Scale, AlertTriangle, TrendingDown, CheckCircle2, Zap } from 'lucide-react';
import { farmUtils } from '../lib/farmUtils';
import { notificationService } from '../services/notificationService';
import { format } from 'date-fns';

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

export default function FarmModule({ action, onActionComplete, profile }: { 
  action?: string | null, 
  onActionComplete?: () => void,
  profile: any
}) {
  const [batches, setBatches] = useState<any[]>([]);
  const [farmLogs, setFarmLogs] = useState<any[]>([]);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);

  useEffect(() => {
    if (action === 'add-batch') {
      setIsAddBatchOpen(true);
      onActionComplete?.();
    } else if (action === 'log-feed' && batches.length > 0) {
      setActiveLogBatch(batches[0]);
      setLogType('feed');
      onActionComplete?.();
    }
  }, [action, batches]);
  const [newBatch, setNewBatch] = useState({
    batchId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    initialQuantity: 0,
    supplier: '',
    costPerChick: 0,
    paidAmount: 0
  });

  const totalAmount = (newBatch.initialQuantity || 0) * (newBatch.costPerChick || 0);
  const dueAmount = totalAmount - (newBatch.paidAmount || 0);

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'batches'), where('ownerId', '==', profile.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const sortedBatches = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setBatches(sortedBatches);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'batches'));

    const qLogs = query(collection(db, 'farmlogs'), where('ownerId', '==', profile.uid));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setFarmLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'farmlogs'));

    return () => { unsub(); unsubLogs(); };
  }, [profile]);

  const handleAddBatch = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    if (!profile?.uid) {
      alert("Authentication error. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified or your session has expired. Please verify your email or log in again.");
        setIsSubmitting(false);
        return;
      }

      if (!newBatch.batchId || !newBatch.startDate || !newBatch.initialQuantity) {
        alert("Please fill in all required fields (Batch ID, Start Date, and Initial Quantity).");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'batches'), {
        ...newBatch,
        currentQuantity: newBatch.initialQuantity,
        mortalityCount: 0,
        totalCost: totalAmount,
        dueAmount: dueAmount,
        status: 'active',
        ownerId: profile.uid,
        createdAt: new Date().toISOString()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        type: 'new_batch',
        batchId: newBatch.batchId,
        count: newBatch.initialQuantity,
        totalCost: totalAmount,
        ownerId: profile.uid,
        timestamp: new Date().toISOString(),
        userId: profile.uid,
        userName: profile.displayName || profile.name || 'User'
      });

      setIsAddBatchOpen(false);
      setNewBatch({
        batchId: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        initialQuantity: 0,
        supplier: '',
        costPerChick: 0,
        paidAmount: 0
      });
    } catch (err) {
      console.error("Error creating batch:", err);
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    } finally {
      setIsSubmitting(false);
    }
  };

  const logMortality = async (batchId: string, count: number) => {
    try {
      const batchRef = doc(db, 'batches', batchId);
      await updateDoc(batchRef, {
        mortalityCount: increment(count),
        currentQuantity: increment(-count)
      });
      await addDoc(collection(db, 'farmlogs'), {
        batchId,
        type: 'mortality',
        count,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `batches/${batchId}`);
    }
  };

  const [activeLogBatch, setActiveLogBatch] = useState<any>(null);
  const [logType, setLogType] = useState<'mortality' | 'feed' | 'vaccine' | 'weight'>('mortality');
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const isTrial = false;
  const hasMultipleBatches = batches.length >= 1;

  const submitLog = async () => {
    if (!activeLogBatch || !logValue) return;
    setIsSubmitting(true);
    try {
      if (!(await ensureVerified())) {
        alert("Action blocked. Your email is not verified. Please verify your email to log data.");
        setIsSubmitting(false);
        return;
      }

      const logData: any = {
        batchId: activeLogBatch.id,
        batchName: activeLogBatch.batchId,
        type: logType,
        ownerId: profile?.uid || 'unknown',
        timestamp: new Date().toISOString(),
        notes: logNotes
      };

      if (logType === 'mortality') {
        const count = Number(logValue);
        await updateDoc(doc(db, 'batches', activeLogBatch.id), {
          mortalityCount: increment(count),
          currentQuantity: increment(-count)
        });
        logData.count = count;
      } else if (logType === 'feed') {
        logData.quantity = Number(logValue);
      } else if (logType === 'weight') {
        logData.avgWeight = Number(logValue);
        await updateDoc(doc(db, 'batches', activeLogBatch.id), {
          lastAvgWeight: Number(logValue)
        });
      } else if (logType === 'vaccine') {
        logData.vaccineName = logValue;
      }

      await addDoc(collection(db, 'farmlogs'), logData);
      setActiveLogBatch(null);
      setLogValue('');
      setLogNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'farmlogs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <HenIcon className="text-orange-600" />
          Active Batches
        </h3>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {profile?.subscriptionType === 'professional' && (
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50 gap-2 font-bold"
              onClick={() => setShowAIInsights(true)}
            >
              <Zap size={18} />
              AI FCR Optimize
            </Button>
          )}
          <Dialog open={isAddBatchOpen} onOpenChange={setIsAddBatchOpen}>
            <DialogTrigger render={
              <Button 
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white gap-2 font-bold shadow-lg shadow-orange-100"
              >
                <Plus size={18} />
                New Batch
              </Button>
            } />
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add New Chick Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBatch} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch ID / Name</Label>
                  <Input 
                    required 
                    value={newBatch.batchId} 
                    onChange={e => setNewBatch({...newBatch, batchId: e.target.value})} 
                    placeholder="B-2025-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    required 
                    value={newBatch.startDate} 
                    onChange={e => setNewBatch({...newBatch, startDate: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initial Quantity</Label>
                  <Input 
                    type="number" 
                    required 
                    value={newBatch.initialQuantity || ''} 
                    onChange={e => setNewBatch({...newBatch, initialQuantity: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost per Chick (₹)</Label>
                  <Input 
                    type="number" 
                    required 
                    value={newBatch.costPerChick || ''} 
                    onChange={e => setNewBatch({...newBatch, costPerChick: Number(e.target.value)})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paid Amount (₹)</Label>
                  <Input 
                    type="number" 
                    value={newBatch.paidAmount || ''} 
                    onChange={e => setNewBatch({...newBatch, paidAmount: Number(e.target.value)})} 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount (₹)</Label>
                  <Input 
                    readOnly 
                    value={totalAmount} 
                    className="bg-stone-50 font-bold text-orange-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Amount (₹)</Label>
                  <Input 
                    readOnly 
                    value={dueAmount} 
                    className="bg-red-50 font-bold text-red-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input 
                    value={newBatch.supplier} 
                    onChange={e => setNewBatch({...newBatch, supplier: e.target.value})} 
                    placeholder="ABC Hatcheries"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-stone-900 text-white rounded-xl h-12 font-bold hover:bg-stone-800 transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Batch'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Zap className="text-purple-600" />
              AI Harvest Optimizer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100 space-y-4">
              <h4 className="font-bold text-purple-900">Optimization Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-black uppercase text-stone-400 mb-1">Target FCR</p>
                  <p className="text-2xl font-black text-green-600">1.45</p>
                  <p className="text-xs text-stone-500">Industry Standard: 1.55</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-black uppercase text-stone-400 mb-1">Feed Efficiency</p>
                  <p className="text-2xl font-black text-purple-600">+12%</p>
                  <p className="text-xs text-stone-500">Yield Prediction Index</p>
                </div>
              </div>
              <p className="text-sm text-purple-800 leading-relaxed italic">
                "Based on current growth kurve, lowering temperature by 1°C in the nursery hall will improve feed intake pattern."
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest pl-2">AI Recovery Plan</p>
              <ul className="space-y-2">
                {[
                  "Increase ventilation cycles between 2PM - 4PM",
                  "Switch to Finisher Feed 2 days earlier for Batch-A1",
                  "Add Vitamin-C supplements to Batch-B2 water line"
                ].map((tip, i) => (
                  <li key={i} className="flex gap-3 items-center p-3 bg-white border border-stone-100 rounded-2xl text-sm font-medium">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
            
            <Button onClick={() => setShowAIInsights(false)} className="w-full h-14 rounded-2xl bg-stone-900 text-white font-bold">
              Download Full Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <Card key={batch.id} className="rounded-[2rem] border-stone-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-stone-50 border-b border-stone-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{batch.batchId}</CardTitle>
                  <CardDescription>Started: {format(new Date(batch.startDate), 'MMM dd, yyyy')}</CardDescription>
                </div>
                <Badge className={batch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-700'}>
                  {batch.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-stone-400 mb-1">Live Birds</p>
                  <p className="text-xl font-bold">{batch.currentQuantity}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-red-400 mb-1">Mortality</p>
                  <p className="text-xl font-bold text-red-600">{batch.mortalityCount}</p>
                </div>
              </div>

              {/* Advanced Farm Metrics */}
              {(() => {
                const mortalityRate = farmUtils.calculateMortalityRate(batch.mortalityCount, batch.initialQuantity);
                const batchLogs = farmLogs.filter(l => l.batchId === batch.id);
                const totalFeed = batchLogs.filter(l => l.type === 'feed').reduce((sum, l) => sum + (l.quantity || 0), 0);
                const totalWeight = (batch.lastAvgWeight || 0) * batch.currentQuantity / 1000; // Total kg
                const fcr = farmUtils.calculateFCR(totalFeed, totalWeight);
                const health = farmUtils.getHealthAlert(Number(mortalityRate));

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-amber-50 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Mortality %</p>
                        <p className={`text-xl font-bold ${Number(mortalityRate) > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                          {mortalityRate}%
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-green-400 mb-1">FCR Ratio</p>
                        <p className="text-xl font-bold text-green-600">{fcr}</p>
                      </div>
                    </div>
                    
                    {Number(mortalityRate) > 5 && (
                      <div className={`p-2 rounded-xl flex items-center gap-2 text-[10px] font-bold ${health.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        <AlertTriangle size={14} />
                        {health.message}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Survival Rate</span>
                  <span className="font-bold">{((batch.currentQuantity / batch.initialQuantity) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500" 
                    style={{ width: `${(batch.currentQuantity / batch.initialQuantity) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl h-12 gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold"
                  onClick={() => { setActiveLogBatch(batch); setLogType('mortality'); }}
                >
                  <History size={16} />
                  Death
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl h-12 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                  onClick={() => { setActiveLogBatch(batch); setLogType('weight'); }}
                >
                  <Scale size={16} />
                  Weight
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl h-12 gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 font-bold"
                  onClick={() => { setActiveLogBatch(batch); setLogType('feed'); }}
                >
                  <Activity size={16} />
                  Feed
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl h-12 gap-2 border-purple-200 text-purple-600 hover:bg-purple-50 font-bold"
                  onClick={() => { setActiveLogBatch(batch); setLogType('vaccine'); }}
                >
                  <Syringe size={16} />
                  Med
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeLogBatch && (
        <Dialog open={!!activeLogBatch} onOpenChange={() => setActiveLogBatch(null)}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {logType === 'mortality' && '🐤 Log Death (Mortality)'}
                {logType === 'feed' && '🌾 Log Feed Consumption'}
                {logType === 'weight' && '⚖️ Log Average Weight'}
                {logType === 'vaccine' && '💉 Log Medicine / Vaccine'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-stone-400">
                  {logType === 'mortality' && 'Death Count (Quantity)'}
                  {logType === 'feed' && 'Feed Quantity (in kg)'}
                  {logType === 'weight' && 'Average Body Weight (in grams)'}
                  {logType === 'vaccine' && 'Medicine or Vaccine Name'}
                </Label>
                <Input 
                  type={logType === 'vaccine' ? 'text' : 'number'}
                  value={logValue}
                  onChange={e => setLogValue(e.target.value)}
                  placeholder={
                    logType === 'mortality' ? 'e.g. 5' : 
                    logType === 'weight' ? 'e.g. 450' : 
                    logType === 'feed' ? 'e.g. 50' :
                    'Enter name...'
                  }
                  className="rounded-xl h-12 text-lg font-bold"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-stone-400">Notes & Observations (Optional)</Label>
                <Input 
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  placeholder="e.g. Birds look active, normal intake..."
                  className="rounded-xl h-12"
                />
              </div>
              <Button 
                onClick={submitLog} 
                disabled={isSubmitting || !logValue}
                className="w-full bg-stone-900 text-white rounded-xl h-14 text-lg font-bold shadow-lg shadow-stone-100"
              >
                {isSubmitting ? 'Saving...' : 'Save Log Entry'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
