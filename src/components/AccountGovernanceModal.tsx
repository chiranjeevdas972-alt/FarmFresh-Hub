import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { deleteDoc, doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { ShieldAlert, Download, Trash2, X, Check, Loader2, RefreshCw, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { safeLocalStorage } from '../lib/utils';

const localStorage = safeLocalStorage;

interface AccountGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: any;
  onLogout: () => void;
}

export default function AccountGovernanceModal({ 
  isOpen, 
  onClose, 
  user, 
  profile, 
  onLogout 
}: AccountGovernanceModalProps) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [errorText, setErrorText] = useState('');

  if (!isOpen) return null;

  // Real, fully functional JSON export of user's complete data records (Phase 12)
  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    setErrorText('');

    try {
      const dataPayload: Record<string, any> = {
        metadata: {
          exporter: "FarmFresh Hub Data Portability Engine",
          exportedAt: new Date().toISOString(),
          jurisdiction: "Dhanbad (Jharkhand, India)",
          complianceFramework: "GDPR / DPDP Compliance"
        },
        userAccount: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          providerId: user.providerData?.[0]?.providerId || "email",
        },
        profile: profile || {}
      };

      // Gather additional data structures if they exist in firestore collection
      const collectionsToFetch = ['batches', 'sales', 'inventory', 'ledgers', 'customers', 'deliveries'];
      
      for (const colName of collectionsToFetch) {
        try {
          const colRef = collection(db, colName);
          // Queries matching user's uuid
          const q = query(colRef, where('userId', '==', user.uid));
          const querySnap = await getDocs(q);
          
          dataPayload[colName] = querySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (colErr) {
          console.warn(`Could not export collection ${colName}, skipping:`, colErr);
          dataPayload[colName] = [];
        }
      }

      // Convert to clean file stream
      const jsonStr = JSON.stringify(dataPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const fileLink = document.createElement('a');
      fileLink.href = downloadUrl;
      fileLink.download = `farmfresh_hub_data_export_${user.uid.substring(0, 8)}.json`;
      document.body.appendChild(fileLink);
      fileLink.click();
      document.body.removeChild(fileLink);
      
      // Cleanup
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("Export failure:", err);
      setErrorText("Failed to compile cloud datasets: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Secure Account Deletion (Irreversible Purging of profile & transactions) (Phase 13)
  const handleIrreversibleWipe = async () => {
    if (!user) return;
    if (confirmationInput !== 'DELETE MY DATA') {
      setErrorText("Verification string is invalid. Please type 'DELETE MY DATA' accurately.");
      return;
    }

    setDeleting(true);
    setErrorText('');

    try {
      // 1. Delete associated collections matching user's credentials in a batch
      const collectionsToWipe = ['batches', 'sales', 'inventory', 'ledgers', 'customers', 'deliveries'];
      const batchInstance = writeBatch(db);

      for (const colName of collectionsToWipe) {
        const colRef = collection(db, colName);
        const q = query(colRef, where('userId', '==', user.uid));
        const querySnap = await getDocs(q);
        querySnap.docs.forEach((docItem) => {
          batchInstance.delete(docItem.ref);
        });
      }

      // Delete core profile document
      const profileDocRef = doc(db, 'users', user.uid);
      batchInstance.delete(profileDocRef);

      // Execute batch deletes in Firestore
      await batchInstance.commit();

      // 2. Clear all local browser databases and keys to prevent trailing identity leaks
      localStorage.clear();
      sessionStorage.clear();

      // 3. Delete user credentials from Firebase Authentication
      const activeUserInstance = auth.currentUser;
      if (activeUserInstance) {
        await deleteUser(activeUserInstance);
      }

      // 4. Force state update & logout redirects immediately
      onLogout();
      onClose();
      window.location.reload();
    } catch (err: any) {
      console.error("Deletion/Wipe failure:", err);
      if (err.code === 'auth/requires-recent-login') {
        setErrorText("Security mandate triggered. Please sign out and sign back in before executing full deletion.");
      } else {
        setErrorText("Failure during secure purge cycle: " + err.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6" id="governance-compliance-modal">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-stone-200 relative z-10 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="bg-red-950 p-6 text-white flex justify-between items-center border-b border-red-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-650 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert size={22} className="text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-base font-black tracking-tight uppercase">User Account Governance Center</h2>
                <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest font-mono">
                  GDPR Section 17 & 20 Sovereignty Handlers
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-900/40 hover:bg-red-900/70 flex items-center justify-center text-red-200 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6 text-left max-h-[70vh] overflow-y-auto">
            {errorText && (
              <div className="p-4 bg-red-50 border border-red-150 text-red-700 rounded-2xl text-xs font-semibold leading-relaxed flex items-start gap-2.5">
                <ShieldAlert size={16} className="shrink-0 mt-0.5 text-red-600 animate-bounce" />
                <span>{errorText}</span>
              </div>
            )}

            {/* Explanatory notes */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-stone-900 text-sm">Regulatory Data Sovereignty</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-medium">
                Under operational compliance protocols matching global data protection standards (GDPR / DPDP), users of the FarmFresh Hub platform retain absolute ownership of recorded datasets. We guarantee secure tools for dynamic portability and self-service database wiping.
              </p>
            </div>

            {/* Box 1: Data Access & Portability (Phase 12) */}
            <div className="p-5 rounded-2xl border border-stone-150 bg-stone-50/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <Download size={16} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-stone-800 uppercase tracking-wider">Compile & Export Portfolio Data</h4>
                  <p className="text-[10px] text-stone-400 mt-1">Download complete JSON records of livestock cycles, customers, and invoice stats.</p>
                </div>
              </div>
              <Button
                disabled={exporting}
                onClick={handleExportData}
                type="button"
                className="w-full bg-white hover:bg-stone-50 text-stone-850 border border-stone-200 rounded-xl text-xs font-bold py-2.5 shadow-sm uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-stone-500" />
                    Assembling Files...
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Download Standardized JSON Archive
                  </>
                )}
              </Button>
            </div>

            {/* Box 2: Secure Account Deletion (Phase 13) */}
            <div className="p-5 rounded-2xl border border-red-100 bg-red-50/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-red-800 uppercase tracking-wider">Execute Indefinite Account Wipe</h4>
                  <p className="text-[10px] text-red-400 mt-1">Completely delete your account, authentication tokens, and all Cloud databases.</p>
                </div>
              </div>

              {deleteStep === 0 && (
                <Button
                  onClick={() => setDeleteStep(1)}
                  type="button"
                  className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold py-2.5 shadow-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Initiate Deletion Cycle
                </Button>
              )}

              {deleteStep === 1 && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3.5">
                  <p className="text-[11px] text-red-700 font-extrabold leading-normal uppercase tracking-wider">
                    ⚠️ CRITICAL NOTICE: THIS ACTION CANNOT BE UNDONE
                  </p>
                  <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                    Proceeding will wipe your farm records, billing histories, and verification details from Dhanbad secure cloud systems forever. Unsynced local devices caches are lost instantly.
                  </p>
                  <div className="flex gap-2.5">
                    <Button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold py-2"
                    >
                      I Understand, Proceed
                    </Button>
                    <Button
                      onClick={() => setDeleteStep(0)}
                      variant="outline"
                      className="flex-1 border-stone-200 text-stone-600 rounded-xl text-xs font-bold py-2 bg-white"
                    >
                      Abort
                    </Button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-150 space-y-3.5">
                  <p className="text-xs text-stone-700 font-bold">
                    To eliminate accidental triggers, please type the confirmation code <code className="bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded leading-none">DELETE MY DATA</code> below:
                  </p>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="Type DELETE MY DATA"
                    className="w-full h-11 px-3 border border-red-200 rounded-xl text-xs bg-white text-stone-850 font-mono font-bold uppercase tracking-wider"
                  />
                  <div className="flex gap-2.5 pt-1">
                    <Button
                      disabled={deleting || confirmationInput !== 'DELETE MY DATA'}
                      onClick={handleIrreversibleWipe}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold py-2 shadow-sm disabled:opacity-50"
                    >
                      {deleting ? (
                        <span className="flex items-center justify-center gap-1.5 font-bold uppercase tracking-widest text-[10px]">
                          <RefreshCw size={12} className="animate-spin" />
                          Purging System...
                        </span>
                      ) : "Confirm Destruction"}
                    </Button>
                    <Button
                      disabled={deleting}
                      onClick={() => { setDeleteStep(0); setConfirmationInput(''); }}
                      variant="outline"
                      className="flex-1 border-stone-200 text-stone-600 bg-white rounded-xl text-xs font-bold py-2"
                    >
                      Abort
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-stone-50 border-t border-stone-100 p-5 flex justify-end shrink-0">
            <Button
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-extrabold py-2 px-6 uppercase tracking-widest font-mono"
            >
              Done & Save
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
