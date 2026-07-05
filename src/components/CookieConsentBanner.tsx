import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Settings, X, Check, Lock, LineChart, Megaphone, Sliders } from 'lucide-react';
import { Button } from './ui/button';
import { safeLocalStorage } from '../lib/utils';

const localStorage = safeLocalStorage;

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: false,
    preferences: true,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('farmfresh_cookie_consent_v2');
    if (!savedConsent) {
      // Small Delay before showing up for clean transition and visual focus
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    localStorage.setItem('farmfresh_cookie_consent_v2', JSON.stringify({
      acceptedAt: new Date().toISOString(),
      choices: allPreferences
    }));
    setShowBanner(false);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    localStorage.setItem('farmfresh_cookie_consent_v2', JSON.stringify({
      acceptedAt: new Date().toISOString(),
      choices: essentialOnly
    }));
    setShowBanner(false);
  };

  const handleSaveCustomized = () => {
    localStorage.setItem('farmfresh_cookie_consent_v2', JSON.stringify({
      acceptedAt: new Date().toISOString(),
      choices: {
        ...preferences,
        essential: true // Always true
      }
    }));
    setShowBanner(false);
    setShowCustomize(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[9999] select-none" 
        id="cookie-consent-container"
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.1 }}
          className="bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 font-sans text-left relative overflow-hidden"
        >
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />

          {/* Heading */}
          <div className="flex items-start gap-3 mt-1">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 tracking-tight flex items-center gap-2">
                Cookie & Tracking Consent
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-1 leading-relaxed">
                FarmFresh Hub respects your session data sovereignty. We utilize optimized secure parameters to manage live accounts, cache offline transactions, and capture basic anonymous telemetry reports.
              </p>
            </div>
          </div>

          {/* Policy Info */}
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-4">
            Under Dhanbad IT Jurisdictions • GDPR Compliant
          </p>

          {/* Expandable Customization Panel */}
          <AnimatePresence>
            {showCustomize && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-stone-100 space-y-3.5"
              >
                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-stone-400" />
                    <div>
                      <p className="text-xs font-bold text-stone-800">Essential Sessions (Required)</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Authentication caches and offline transaction keys.</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#10b981] bg-[#10b981]/15 px-2.5 py-1 rounded-lg">
                    Active
                  </span>
                </div>

                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <LineChart size={14} className="text-stone-400" />
                    <div>
                      <p className="text-xs font-bold text-stone-800">Performance & Analytics</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Anonymous metrics checking active FCR report loading speeds.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    className="w-4 h-4 text-orange-600 border-stone-200 rounded-lg focus:ring-orange-50 cursor-pointer accent-orange-600"
                  />
                </div>

                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Megaphone size={14} className="text-stone-400" />
                    <div>
                      <p className="text-xs font-bold text-stone-800">Marketing & Outreach</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Product alerts about wholesale broker price fluctuations.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                    className="w-4 h-4 text-orange-600 border-stone-200 rounded-lg focus:ring-orange-50 cursor-pointer accent-orange-600"
                  />
                </div>

                <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-stone-400" />
                    <div>
                      <p className="text-xs font-bold text-stone-800">State Preferences</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Allows persistence of language (English/Hindi) selectors.</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={preferences.preferences}
                    onChange={(e) => setPreferences({...preferences, preferences: e.target.checked})}
                    className="w-4 h-4 text-orange-600 border-stone-200 rounded-lg focus:ring-orange-50 cursor-pointer accent-orange-600"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-5 space-y-2.5">
            {!showCustomize ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    className="bg-orange-600 text-white hover:bg-orange-700 rounded-xl font-bold text-xs py-2 px-4 shadow-md shadow-orange-500/10 uppercase tracking-wider"
                  >
                    Accept All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRejectNonEssential}
                    className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs py-2 px-4 uppercase tracking-wider"
                  >
                    Reject Non-Essential
                  </Button>
                </div>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="w-full text-center text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-stone-600 flex items-center justify-center gap-1.5 py-1"
                >
                  <Settings size={12} />
                  Customize Preferences
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <Button
                  onClick={handleSaveCustomized}
                  className="bg-stone-900 text-white hover:bg-stone-800 rounded-xl font-bold text-xs py-2.5 px-4 uppercase tracking-wider"
                >
                  Save Choices
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomize(false)}
                  className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs py-2.5 px-4 uppercase tracking-wider"
                >
                  Go Back
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
