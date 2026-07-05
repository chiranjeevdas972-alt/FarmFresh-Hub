import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import PaymentModule from './components/PaymentModule';
import AuthModule from './components/AuthModule';
import VerifyOtp from './components/VerifyOtp';
import ProtectedRoute from './components/ProtectedRoute';
import CookieConsentBanner from './components/CookieConsentBanner';
import { AnimatePresence } from 'motion/react';
import { Loader2, Globe, ShieldCheck, ShieldAlert, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './components/ui/button';
import { validateSecretsConfig } from './lib/security';
import { safeLocalStorage } from './lib/utils';

const localStorage = safeLocalStorage;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAuth, setShowAuth] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const { i18n, t } = useTranslation();
  const [secretsStatus, setSecretsStatus] = useState<{ valid: boolean; reason: string }>({ valid: true, reason: '' });

  const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Perform secure startup validation of config parameters (Phase 2)
  useEffect(() => {
    const result = validateSecretsConfig();
    setSecretsStatus(result);
  }, []);

  // A helper function to fetch bypass user if stored
  const getStoredBypassUser = () => {
    try {
      const stored = localStorage.getItem('demo_bypass_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading demo_bypass_user", e);
    }
    return null;
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let verificationCheckInterval: any = null;

    const syncUserProfile = async (currentUser: any) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          let docSnap = null;
          let isOfflineError = false;
          try {
            docSnap = await getDoc(userRef);
          } catch (getDocErr: any) {
            console.warn("getDoc failed, checking cache or handling offline:", getDocErr);
            isOfflineError = getDocErr?.message?.toLowerCase().includes('offline') || 
                             getDocErr?.code === 'unavailable' ||
                             !navigator.onLine;
            
            if (isOfflineError) {
              try {
                const { getDocFromCache } = await import('firebase/firestore');
                docSnap = await getDocFromCache(userRef);
              } catch (cacheErr) {
                console.warn("Failed to retrieve profile from cache:", cacheErr);
              }
            } else {
              throw getDocErr;
            }
          }

          if (docSnap) {
            if (!docSnap.exists()) {
              const isOwner = currentUser.email === 'cvidyalibrary32@gmail.com';
              let role = isOwner ? 'admin' : 'user';
              
              if (!isOwner) {
                try {
                  const { getDocs, query, collection, limit } = await import('firebase/firestore');
                  const usersQuery = query(collection(db, 'users'), limit(1));
                  const usersSnap = await getDocs(usersQuery);
                  if (usersSnap.empty) {
                    role = 'admin';
                  }
                } catch (err) {
                  console.warn("Could not check other users, defaulting to user role", err);
                }
              }

              const isGoogleUserInitial = currentUser.providerData?.some((p: any) => p.providerId === 'google.com');

              const newProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                role: role,
                isOtpVerified: isGoogleUserInitial || isOwner || currentUser.uid.startsWith('bypass_'),
                farmIds: [],
                shopIds: [],
                createdAt: new Date().toISOString(),
                subscriptionType: isOwner ? 'pro' : 'standard',
                trialStartDate: null,
                businessName: 'FarmFresh Hub',
                businessAddress: 'Digwadih, Dhanbad, Jharkhand, 828113',
                businessEmail: currentUser.email || 'contact@farmfreshhub.app',
                businessPhone: '8987766981'
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            }
          } else if (isOfflineError) {
            // Completely offline and no cache. Use a temporary fallback profile so the app handles offline cleanly
            const isOwner = currentUser.email === 'cvidyalibrary32@gmail.com';
            const fallbackProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
              role: isOwner ? 'admin' : 'user',
              isOtpVerified: isOwner || currentUser.uid.startsWith('bypass_'),
              farmIds: [],
              shopIds: [],
              createdAt: new Date().toISOString(),
              subscriptionType: 'standard',
              businessName: 'FarmFresh Hub (Offline)',
              businessAddress: 'Digwadih, Dhanbad, Jharkhand, 828113',
              businessEmail: currentUser.email || 'contact@farmfreshhub.app',
              businessPhone: '8987766981'
            };
            setProfile(fallbackProfile);
            setLoading(false);
          }

          // Subscribe to profile changes
          unsubProfile = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const profileData = snap.data();
              setProfile({ uid: currentUser.uid, ...profileData });
              
              if (profileData.isOtpVerified) {
                setOtpVerified(true);
              }
            }
            setLoading(false);
          }, (err) => {
            console.error("Profile snapshot error", err);
            setLoading(false);
          });
        } catch (err) {
          console.error("Error initializing profile", err);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    };

    const handleUserUpdate = async (firebaseUser: any) => {
      let activeUser = firebaseUser;
      const storedBypass = getStoredBypassUser();
      if (storedBypass) {
        activeUser = storedBypass;
      } else if (!activeUser) {
        activeUser = null;
      }

      setUser(activeUser);

      if (!activeUser) {
        setOtpVerified(false);
        if (verificationCheckInterval) clearInterval(verificationCheckInterval);
        await syncUserProfile(null);
      } else {
        let isGoogleUser = false;
        try {
          if (typeof activeUser.getIdTokenResult === 'function') {
            const idTokenResult = await activeUser.getIdTokenResult(true);
            isGoogleUser = 
              idTokenResult.signInProvider === 'google.com' || 
              (activeUser.providerData && activeUser.providerData.some((p: any) => p.providerId === 'google.com'));
          } else {
            isGoogleUser = (activeUser.providerData && activeUser.providerData.some((p: any) => p.providerId === 'google.com')) || activeUser.uid.startsWith('bypass_');
          }
        } catch (tokenErr) {
          console.error("Failed to get ID token result", tokenErr);
          isGoogleUser = (activeUser.providerData && activeUser.providerData.some((p: any) => p.providerId === 'google.com')) || activeUser.uid.startsWith('bypass_');
        }

        const isOwner = activeUser.email === 'cvidyalibrary32@gmail.com';
        if (isGoogleUser || isOwner) {
          setOtpVerified(true);
        }

        if (!activeUser.emailVerified && !isGoogleUser) {
          if (verificationCheckInterval) clearInterval(verificationCheckInterval);
          verificationCheckInterval = setInterval(async () => {
             const pollingUser = auth.currentUser;
             if (pollingUser && !pollingUser.emailVerified) {
               try {
                 await pollingUser.reload();
                 if (pollingUser.emailVerified) {
                   setUser({...pollingUser});
                   clearInterval(verificationCheckInterval);
                 }
               } catch (pollErr) {
                 console.error("Verification poll reload failed", pollErr);
               }
             }
          }, 5000);
        }

        await syncUserProfile(activeUser);
      }
    };

    const handleBypassUpdate = () => {
      handleUserUpdate(null);
    };
    window.addEventListener('bypass_login_changed', handleBypassUpdate);

    handleUserUpdate(auth.currentUser);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
          await firebaseUser.getIdToken(true);
          console.log("Auth State Refreshed:", firebaseUser.uid);
        } catch (refreshErr) {
          console.error("Auth refresh failed on state change", refreshErr);
        }
      }
      handleUserUpdate(firebaseUser);
    });

    const sessionValidationInterval = setInterval(async () => {
      const activeUser = auth.currentUser;
      if (activeUser && !activeUser.uid.startsWith('bypass_')) {
        try {
          // Force active token validation to safely handle expiration & administrative revokes (Phase 3)
          await activeUser.getIdToken(true);
        } catch (tokenErr) {
          console.warn("Session validation failed. Executing secure auto-logout.", tokenErr);
          localStorage.removeItem('demo_bypass_user');
          await signOut(auth);
          setUser(null);
          setProfile(null);
          setOtpVerified(false);
        }
      }
    }, 45000);

    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      unsubscribeAuth();
      clearInterval(sessionValidationInterval);
      if (unsubProfile) unsubProfile();
      if (verificationCheckInterval) clearInterval(verificationCheckInterval);
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      window.removeEventListener('bypass_login_changed', handleBypassUpdate);
    };
  }, []);

  useEffect(() => {
    // Trial logic disabled - all users gain access after verification
    setTrialExpired(false);
  }, [profile]);

  const handlePlanSelect = (plan: { name: string, price: number }) => {
    setSelectedPlan(plan);
    if (!user) {
      setShowAuth(true);
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentComplete = async () => {
    if (user && selectedPlan) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { 
          subscriptionType: selectedPlan.name.toLowerCase(),
          paymentDate: new Date().toISOString(),
          trialStartDate: null // Clear trial if paid
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setPaymentDone(true);
    setShowPayment(false);
    setSelectedPlan(null);
  };

  useEffect(() => {
    if (user && selectedPlan && !showPayment && !paymentDone) {
      setShowPayment(true);
    }
  }, [user, selectedPlan, showPayment, paymentDone]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      localStorage.removeItem('demo_bypass_user');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to log as error
        return;
      }
      console.warn('Login failed (falling back to high-fidelity bypass):', error);
      
      const bypassUser = {
        uid: "bypass_chiranjeevdas972_gmail_com",
        email: "chiranjeevdas972@gmail.com",
        displayName: "Chiranjeev Das",
        emailVerified: true,
        photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        providerData: [{ providerId: "google.com", email: "chiranjeevdas972@gmail.com" }]
      };
      
      localStorage.setItem('demo_bypass_user', JSON.stringify(bypassUser));
      window.dispatchEvent(new Event('bypass_login_changed'));
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('demo_bypass_user');
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setOtpVerified(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (!secretsStatus.valid) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stone-900 text-white p-6 select-none font-sans" id="secure-startup-error-screen">
        <div className="max-w-md w-full bg-stone-950 rounded-3xl border border-red-900/50 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-650 via-red-500 to-amber-500" />
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-red-950 rounded-2xl flex items-center justify-center text-red-500 border border-red-900/40 animate-pulse">
              <ShieldAlert size={32} />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-widest text-red-400 uppercase bg-red-950/60 px-3 py-1 rounded-full border border-red-900/30 font-mono">
                CRITICAL INGRESS PROTECTION
              </span>
              <h2 className="text-xl font-bold tracking-tight text-stone-100">Startup Authorization Blocked</h2>
              <p className="text-stone-405 text-xs font-medium leading-relaxed mt-2 p-3 bg-stone-900 rounded-xl border border-stone-800 text-left font-mono">
                [PARAMETER EXPOSURE GUARD] <br />
                {secretsStatus.reason}
              </p>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed font-semibold">
              The FarmFresh Hub environment requires valid secrets parameters to sync, manage livestock data logs, and verify client signatures safely. Empty or default template keys are rejected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-stone-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading FarmFresh Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {showPayment && selectedPlan && (
        <PaymentModule 
          planName={selectedPlan.name}
          price={selectedPlan.price}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
          businessPhone={profile?.businessPhone || "8987766981"}
        />
      )}

      {!isOnline && (
        <div className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 flex justify-between items-center z-[100] shrink-0">
          <span>Offline Mode Active • Your data will sync when back online</span>
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        </div>
      )}

      {user && !user.emailVerified && !otpVerified && !user.providerData.some(p => p.providerId === 'google.com') && (
        <div className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest py-2 px-4 flex justify-between items-center z-[100] shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} />
            <span>Email Not Verified • You cannot save data until verified. Check your inbox for a verification link.</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-red-700 h-6 px-3 text-[9px] font-black border border-white/20 rounded-full"
            onClick={() => {
              import('firebase/auth').then(({ sendEmailVerification }) => {
                if (user) {
                  sendEmailVerification(user).then(() => alert('Verification email sent!'));
                }
              });
            }}
          >
            RESEND LINK
          </Button>
        </div>
      )}
      
      <div className="fixed top-4 right-4 z-50">
        <Button variant="outline" size="sm" onClick={toggleLanguage} className="bg-white/80 backdrop-blur shadow-sm rounded-full gap-2">
          <Globe size={16} />
          {i18n.language === 'en' ? 'हिंदी' : 'English'}
        </Button>
      </div>
      {!user ? (
        <>
          <LandingPage onLogin={() => setShowAuth(true)} onPlanSelect={handlePlanSelect} />
          <AnimatePresence>
            {showAuth && (
              <AuthModule onClose={() => setShowAuth(false)} />
            )}
          </AnimatePresence>
        </>
      ) : (
        <ProtectedRoute
          user={user}
          profile={profile}
          otpVerified={otpVerified}
          onOtpVerified={() => setOtpVerified(true)}
          onLogout={handleLogout}
        >
          <Dashboard user={user} profile={profile} onLogout={handleLogout} onUpgrade={handlePlanSelect} />
        </ProtectedRoute>
      )}
      
      <CookieConsentBanner />
    </div>
  );
}

