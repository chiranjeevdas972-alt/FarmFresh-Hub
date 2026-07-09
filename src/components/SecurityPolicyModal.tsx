import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, Scale, Lock, Landmark, PhoneCall, Receipt, Info, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

interface SecurityPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy' | 'refunds' | 'billing';
}

export default function SecurityPolicyModal({ isOpen, onClose, initialTab = 'terms' }: SecurityPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'refunds' | 'billing'>('terms');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6" id="security-policy-modal">
        {/* Dark Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-stone-200 relative z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-stone-900 p-6 text-white relative flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold tracking-tight">FarmFresh Hub Policy, Terms & Legal Compliance</h2>
                <p className="text-xs text-stone-400 font-medium font-mono">Zero-Leak Architecture • Director/Founder: Chiranjeev Das (Dhanbad)</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-stone-850 hover:bg-stone-800 flex items-center justify-center text-stone-300 hover:text-white transition-colors border border-stone-800 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Switcher Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-stone-100 bg-stone-50 p-2 gap-1 select-none shrink-0">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'privacy'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Lock size={12} />
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'terms'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Scale size={12} />
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'refunds'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Receipt size={12} />
              Refund Policy
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center justify-center gap-2 py-3 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === 'billing'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/50'
              }`}
            >
              <Info size={12} />
              Billing & Trial
            </button>
          </div>

          {/* Main Scroller Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-stone-700 text-sm leading-relaxed max-h-[60vh] bg-stone-50/30">
            
            {/* TAB 1: PRIVACY POLICY COMPLIANCE */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2.5 text-stone-950">
                  <Lock className="text-orange-600 shrink-0 animate-pulse" size={18} />
                  <h3 className="font-bold text-base tracking-tight">Section A: User Privacy & Data Protection Policy (GDPR / IT Act)</h3>
                </div>
                <p className="font-semibold text-stone-600">
                  We guarantee full sovereignty over your enterprise records. This Privacy Policy outlines exactly how your information is safeguarded, stored, and compiled.
                </p>

                <div className="space-y-4 font-medium text-stone-600">
                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">1. Data Collected & Sources</h4>
                    <p className="mt-1 text-xs">
                      We gather specific parameters required to compute real-time metrics: account registration details (Full Name, verified Email Address, password hashes, and optional mobile contacts); business assets (Farm / Company Name, shop IDs); live poultry logs (daily feed consumption, FCR coefficients, age, total counts, weight statistics, vaccine completions, and mortality tracks); and financial files (customer books, credit balances, offline inventory ledger sheets, and PDF transaction records).
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">2. Processing Rationale</h4>
                    <p className="mt-1 text-xs">
                      Your inputs are parsed solely to produce on-screen charts, compile digital invoices, optimize livestock mortality trends, issue threshold low-stock warnings, and draft direct WhatsApp business receipts. Under no condition is your information used for AI training, profile monetization, or external database brokerage.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">3. Storage, Lifespan & Encryption</h4>
                    <p className="mt-1 text-xs">
                      All live operations sync to secure cloud database storage on isolated authenticated sectors. Client-side caching utilizes native high-speed browser mechanisms strictly mapped by security tokens. Transactions persist securely until you explicitly execute the local Account Wiping feature. No anonymous or unencrypted files can list outer directory paths.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">4. Disclaimers: Subprocessors & Cloud Storage Providers</h4>
                    <div className="mt-2 space-y-2 text-xs">
                      <p><strong>• Firebase Auth & Database (Firestore):</strong> Authentication credentials and database entities are strictly guarded by identity verification tokens. Data requests are validated rules-side to block identity spoofing.</p>
                      <p><strong>• Cloudflare Network Services:</strong> Standard edge security filters safeguard platform connections against template injection and ReDoS exhaustion attacks.</p>
                      <p><strong>• Stripe & Payment Partners:</strong> All transaction keys are secure and hosted exclusively through certified gateways. No card details or routing credentials ever hit our servers.</p>
                      <p><strong>• Analytics:</strong> Standard performance parameters are collected strictly under explicit cookies opt-in (Phase 10).</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">5. Self-Service Deletion & Data Portability</h4>
                    <p className="mt-1 text-xs">
                      You can instantly export your local databases to a standardized portable format. Additionally, you can request a manual total cloud erase by sending a verification notice to our Dhanbad operations desk or using the Account Settings self-deletion block.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TERMS OF SERVICE */}
            {activeTab === 'terms' && (
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2.5 text-stone-950">
                  <Scale className="text-orange-600 shrink-0" size={18} />
                  <h3 className="font-bold text-base tracking-tight">Section B: System Operating Terms & Acceptable Use Policy</h3>
                </div>
                <p className="font-semibold text-stone-600">
                  Please read our Terms of Service prior to deploying or using our agricultural tracking modules.
                </p>

                <div className="space-y-4 font-medium text-stone-600">
                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">1. Acceptable Farm Activities</h4>
                    <p className="mt-1 text-xs">
                      This application may only be deployed by poultry, caprine, or aquaculture farmers for active commercial livestock recording, accounting ledgers, and standard invoice drafts. Any unauthorized payload fuzzing, code manipulation, template compilation hacking, or denial-of-wallet queries will trigger absolute key ban.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">2. Operator Responsibilities</h4>
                    <p className="mt-1 text-xs">
                      You are sole owner of your account handles. It is your responsibility to maintain robust passwords (minimum 8 and maximum 128 characters) and prevent leakage of OTP tokens. Local off-grid states rely on client devices; clearing browser caches manually before connecting to internet links deletes unsynced assets.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">3. Limits of Calculation & Mortality Metrics</h4>
                    <p className="mt-1 text-xs">
                      All livestock estimates (FCR metrics, average animal weights, weight gain patterns, low-feed reminders, batch timelines) are structured tools based on standard agricultural mathematics. You must perform offline visual inspections before applying chemical treatments or purchasing massive feeds. Chiranjeev Das does not assume liabilities for active veterinary outcomes or feed margin deficits.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">4. Invoicing, Local Taxes & Regional Rules</h4>
                    <p className="mt-1 text-xs">
                      Digital receipts autoconfigured with GST/HSN codes are based on parameters input by you. You carry complete liability for computing right tax amounts. All arbitrations are subject strictly to the local legal jurisdiction of Dhanbad courts (Jharkhand, India).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REFUND POLICY */}
            {activeTab === 'refunds' && (
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2.5 text-stone-950">
                  <Receipt className="text-orange-600 shrink-0" size={18} />
                  <h3 className="font-bold text-base tracking-tight">Section C: Subscription Refund & Cancellation Policy</h3>
                </div>
                <p className="font-semibold text-stone-600">
                  We maintain simple, transparent, and fair billing rules. No hidden charges.
                </p>

                <div className="space-y-4 font-medium text-stone-600">
                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">1. Elite 7-Day Refund Guarantee</h4>
                    <p className="mt-1 text-xs">
                      If you upgrade your farm ledger to Business Suite or Enterprise tiers and find the features do not suit your operational workflow, you can demand a 100% full refund within 7 calendar days of your initial purchase date. No questions asked.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">2. Requesting a Refund</h4>
                    <p className="mt-1 text-xs">
                      To file your reimbursement request, simply send a copy of your verified transaction hash along with your registered mobile phone number to <strong>cvidyasolutions@gmail.com</strong>. Our billing desk in Dhanbad will review and process your query within 3 business days. Approved refunds are wired straight back to the original funding resource in 5-7 bank business days.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">3. Non-Refundable Scenarios</h4>
                    <p className="mt-1 text-xs">
                      Refund windows close after 7 days from the initial transaction date. Renewal fees are eligible for refund only if a calendar cancellation notice was filed before the renewal execution date. Accounts closed for violating acceptable use policies are not eligible for refund.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BILLING & TRIAL */}
            {activeTab === 'billing' && (
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-2.5 text-stone-950">
                  <Info className="text-orange-600 shrink-0" size={18} />
                  <h3 className="font-bold text-base tracking-tight">Section D: Trial Subscriptions & Dynamic Billing System</h3>
                </div>
                <p className="font-semibold text-stone-600">
                  Understand your trial durations, auto-renewals, and direct control channels clearly.
                </p>

                <div className="space-y-4 font-medium text-stone-600">
                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">1. Trial Duration & Conditions</h4>
                    <p className="mt-1 text-xs">
                      Our <strong>Starter Plan</strong> trial provides access to premium tracking for exactly <strong>14 days</strong> from initial sign-up. <strong>No credit card or payment key</strong> is ever requested to activate this trial block.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">2. Post-Trial Grace Mechanism</h4>
                    <p className="mt-1 text-xs">
                      At the end of the 14-day trial, your dashboard does not execute any automated collection or charges. Instead, access to premium logs is paused, and your farm records are safely kept in read-only format. You may degrade back to standard free limits or proceed with explicit premium activation.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-stone-150 shadow-sm">
                    <h4 className="font-black text-stone-900 text-xs uppercase tracking-wider text-orange-600">3. Auto-Renewals Disclosures</h4>
                    <p className="mt-1 text-xs">
                      Hourly, weekly, or monthly subscription packages run on clear auto-renewal cycles. Renewal dates, frequencies, and exact billing figures are shown on the checkout screen prior to payment consent. No dark patterns are used; you can cancel upcoming cycles at any time with one click from your subscription settings panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Details Section */}
            <div className="p-4 bg-stone-100 rounded-2xl border border-stone-200 flex items-start gap-4">
              <PhoneCall size={20} className="text-orange-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <h5 className="font-bold text-stone-905 text-xs uppercase tracking-wider">Compliance Officer Contact Information</h5>
                <p className="text-stone-500 text-xs mt-1 leading-normal font-medium">
                  Chiranjeev Das (Dhanbad, Jharkhand, India)
                  <br />
                  Emergency Core Hotline: +91 92885 17027 | Emails: cvidyasolutions@gmail.com / chiranjeev0058@gmail.com
                </p>
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="bg-stone-50 border-t border-stone-100 p-5 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest font-mono">
              FARMFRESH COMPLIANCE GATEWAY • V4
            </span>
            <Button
              onClick={onClose}
              className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold py-2.5 px-8 transition-colors font-mono uppercase tracking-widest"
            >
              Acknowledge & Confirm
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
