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
    <nav className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t border-border/40 z-50 md:hidden shadow-strong">
      <div className="grid grid-cols-6 gap-0.5 px-1 py-1.5 safe-area-bottom">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-all duration-200 ${
              item.active 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <item.icon className={`w-[18px] h-[18px] mb-0.5 ${item.active ? 'text-primary' : ''}`} />
            <span className={`text-[10px] font-medium leading-tight ${item.active ? 'text-primary' : ''}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
      
      {/* Admin indicator */}
      {isAdmin && (
        <div className="absolute -top-2 right-2">
          <div className="bg-gradient-primary text-white text-[10px] px-2 py-0.5 rounded-full shadow-medium">
            Admin
          </div>
        </div>
      )}
    </nav>
  );
};

export default BottomNavigation;