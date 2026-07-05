import React, { useState, useEffect } from 'react';
import { notificationService, AppNotification } from '../services/notificationService';
import { Bell, X, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { db, auth } from '../lib/firebase';
import { format } from 'date-fns';
import { safeLocalStorage } from '../lib/utils';

const localStorage = safeLocalStorage;

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const getUserId = () => {
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    try {
      const stored = localStorage.getItem('demo_bypass_user');
      if (stored) {
        return JSON.parse(stored).uid;
      }
    } catch (e) {}
    return null;
  };
  const userId = getUserId();

  useEffect(() => {
    if (!userId) return;
    const unsub = notificationService.subscribeToNotifications(userId, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsub();
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full bg-white shadow-sm hover:bg-stone-50 border border-stone-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} className="text-stone-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-2xl border border-stone-200 z-50 overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
            <h3 className="font-bold text-stone-900 text-sm">System Notifications</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X size={14} />
            </Button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-stone-50">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 hover:bg-stone-50 transition-colors cursor-pointer ${!n.read ? 'bg-orange-50/30' : ''}`}
                    onClick={() => n.id && notificationService.markAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1">{getIcon(n.type)}</div>
                      <div className="flex-1">
                        <p className={`text-xs font-bold ${!n.read ? 'text-stone-900' : 'text-stone-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-stone-400 mt-2 font-medium uppercase tracking-wider">
                          {n.timestamp?.toDate ? format(n.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-stone-400 italic text-sm">
                No notifications yet
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 bg-stone-50 border-t border-stone-100 text-center">
              <button className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700">
                View All Alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
