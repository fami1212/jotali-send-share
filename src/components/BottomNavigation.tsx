import { Home, ArrowRightLeft, Clock, Users, Settings, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const navItems = [
    {
      icon: Home,
      label: 'Accueil',
      path: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      icon: ArrowRightLeft,
      label: 'Transfert',
      path: '/transfer',
      active: location.pathname === '/transfer'
    },
    {
      icon: Clock,
      label: 'Historique',
      path: '/history',
      active: location.pathname === '/history'
    },
    {
      icon: Upload,
      label: 'Preuves',
      path: '/upload-proof',
      active: location.pathname === '/upload-proof'
    },
    {
      icon: Users,
      label: 'Contacts',
      path: '/recipients',
      active: location.pathname === '/recipients'
    },
    {
      icon: Settings,
      label: 'Paramètres',
      path: '/settings',
      active: location.pathname === '/settings'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t-2 border-primary/10 z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-6 gap-1 px-2 py-2 safe-area-bottom">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 relative ${
              item.active 
                ? 'text-primary scale-105' 
                : 'text-muted-foreground hover:text-foreground hover:scale-105'
            }`}
          >
            {item.active && (
              <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-xl animate-pulse" />
            )}
            <div className={`relative ${item.active ? 'transform -translate-y-0.5' : ''}`}>
              <item.icon 
                className={`w-5 h-5 mb-1 transition-all duration-300 ${
                  item.active ? 'text-primary stroke-[2.5]' : 'stroke-[2]'
                }`} 
              />
            </div>
            <span className={`text-[10px] font-semibold leading-tight relative ${
              item.active ? 'text-primary' : ''
            }`}>
              {item.label}
            </span>
            {item.active && (
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-primary rounded-full" />
            )}
          </Link>
        ))}
      </div>
      
      {/* Admin indicator */}
      {isAdmin && (
        <div className="absolute -top-2 right-3">
          <div className="bg-gradient-primary text-white text-[10px] px-2.5 py-1 rounded-full shadow-glow font-semibold">
            Admin
          </div>
        </div>
      )}
    </nav>
  );
};

export default BottomNavigation;