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
import { AnimatePresence } from 'motion/react';
import { Loader2, Globe, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './components/ui/button';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAuth, setShowAuth] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const { i18n, t } = useTranslation();

  const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let verificationCheckInterval: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // High-priority: Refresh token and reload to ensure latest session state
        try {
          await firebaseUser.reload();
          await firebaseUser.getIdToken(true);
          console.log("Auth State Refreshed:", firebaseUser.uid);
          console.log("Is Email Verified:", firebaseUser.emailVerified);
          console.log("Provider ID:", firebaseUser.providerData[0]?.providerId);
        } catch (refreshErr) {
          console.error("Auth refresh failed on state change", refreshErr);
        }
      }

      setUser(auth.currentUser);
      
      if (!auth.currentUser) {
        setOtpVerified(false);
        if (verificationCheckInterval) clearInterval(verificationCheckInterval);
      } else {
        const currentUser = auth.currentUser;
        
        // Robust Google User Detection with safety
        let isGoogleUser = false;
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true);
          isGoogleUser = 
            idTokenResult.signInProvider === 'google.com' || 
            currentUser.providerData.some(p => p.providerId === 'google.com');
          
          console.log("Auth Provider Detection:", idTokenResult.signInProvider);
          console.log("Is Google User:", isGoogleUser);
        } catch (tokenErr) {
          console.error("Failed to get ID token result", tokenErr);
          // Fallback to providerData check
          isGoogleUser = currentUser.providerData.some(p => p.providerId === 'google.com');
        }

        const isOwner = currentUser.email === 'cvidyalibrary32@gmail.com';
        if (isGoogleUser || isOwner) {
          setOtpVerified(true);
        }
        
        // Start polling for email verification if not verified and NOT Google user
        if (!currentUser.emailVerified && !isGoogleUser) {
          if (verificationCheckInterval) clearInterval(verificationCheckInterval);
          verificationCheckInterval = setInterval(async () => {
             const pollingUser = auth.currentUser;
             if (pollingUser && !pollingUser.emailVerified) {
               try {
                 await pollingUser.reload();
                 if (pollingUser.emailVerified) {
                   setUser({...pollingUser}); // Trigger re-render
                   clearInterval(verificationCheckInterval);
                 }
               } catch (pollErr) {
                 console.error("Verification poll reload failed", pollErr);
               }
             }
          }, 5000);
        }
      }
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check if document exists
        try {
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
            // Determine role: software owner check
            const isOwner = firebaseUser.email === 'cvidyalibrary32@gmail.com';
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

            const isGoogleUserInitial = firebaseUser.providerData.some(p => p.providerId === 'google.com');

            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              role: role,
              isOtpVerified: isGoogleUserInitial || isOwner,
              farmIds: [],
              shopIds: [],
              createdAt: new Date().toISOString(),
              subscriptionType: isOwner ? 'pro' : 'standard',
              trialStartDate: null,
              businessName: 'FarmFresh Hub',
              businessAddress: 'Digwadih, Dhanbad, Jharkhand, 828113',
              businessEmail: firebaseUser.email || 'contact@farmfreshhub.app',
              businessPhone: '8987766981'
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }

          // Subscribe to profile changes
          unsubProfile = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const profileData = snap.data();
              setProfile(profileData);
              
              // If profile says OTP is verified, update the state
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
    });

    // Online listeners should be added once on mount
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
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
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to log as error
        return;
      }
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setOtpVerified(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

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
    </div>
  );
}

