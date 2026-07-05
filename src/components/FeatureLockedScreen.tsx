import React from 'react';
import { ShieldAlert, ArrowLeft, Settings2, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface FeatureLockedScreenProps {
  featureName: string;
  role: string;
  onBackToOverview: () => void;
  onGoToAdmin: () => void;
}

export default function FeatureLockedScreen({ 
  featureName, 
  role, 
  onBackToOverview, 
  onGoToAdmin 
}: FeatureLockedScreenProps) {
  const isAdmin = role?.toLowerCase() === 'admin';

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
      <Card className="max-w-md w-full border-red-200/60 shadow-xl shadow-red-50/50 bg-white rounded-3xl overflow-hidden relative border">
        {/* Top alerting border indicator */}
        <div className="h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 w-full animate-pulse" />
        
        <CardContent className="p-8 text-center space-y-6">
          {/* Pulsing Shield Icon Container */}
          <div className="mx-auto w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border border-red-100 relative group animate-bounce-subtle">
            <div className="absolute inset-0 rounded-full bg-red-400/10 animate-ping" />
            <ShieldAlert size={40} className="text-red-500 relative z-10" />
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
              <Lock size={12} className="stroke-[3]" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-red-500 uppercase bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              HARD SECURITY GUARD ACTIVE
            </span>
            <h3 className="text-xl font-bold text-stone-900 tracking-tight mt-2">
              {featureName} Module Locked
            </h3>
            <p className="text-stone-500 text-xs leading-relaxed max-w-sm mx-auto">
              This system feature and its associated functions have been suspended or disabled in the 
              <strong> App Control Center</strong> by the Operations Administrator.
            </p>
          </div>

          {/* Secure System Box */}
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-[11px] text-stone-600 font-medium">
                <strong>Data Sovereignty Guard:</strong> All reading, posting, creating, and modifying procedures for this module are strictly blocked.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-[11px] text-stone-600 font-medium">
                <strong>Re-activation:</strong> This feature will instantly resume operations when the switch is toggled active.
              </p>
            </div>
          </div>

          {/* Action Callbacks */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Button 
              onClick={onBackToOverview}
              className="w-full rounded-xl bg-stone-900 hover:bg-stone-850 text-white shadow-sm h-11 text-xs font-bold gap-2"
            >
              <ArrowLeft size={14} />
              Return to Dashboard
            </Button>
            
            {isAdmin && (
              <Button 
                onClick={onGoToAdmin}
                variant="outline"
                className="w-full rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 h-11 text-xs font-bold gap-2"
              >
                <Settings2 size={14} />
                Manage Feature Toggles
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
