import { Home, ArrowRightLeft, Clock, Users, Settings, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/dashboard' },
    { icon: ArrowRightLeft, label: 'Envoyer', path: '/transfer' },
    { icon: Clock, label: 'Historique', path: '/history' },
    { icon: Users, label: 'Contacts', path: '/recipients' },
    { icon: Settings, label: 'Paramètres', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]" />
      
      {/* Admin badge */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
        >
          <Link 
            to="/admin" 
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/30 font-semibold"
          >
            <span>🛡️</span>
            Admin
          </Link>
        </motion.div>
      )}

      {/* Navigation content */}
      <div className="relative flex items-center justify-around px-2 py-2 pb-safe">
        {/* Navigation items */}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px]"
            >
              {/* Active indicator background */}
              {isActive && (
                <motion.div
                  layoutId="activeNavBg"
                  className="absolute inset-0.5 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative z-10"
              >
                <item.icon 
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive 
                      ? 'text-primary stroke-[2.5]' 
                      : 'text-muted-foreground stroke-[1.5]'
                  }`}
                />
              </motion.div>
              
              {/* Label */}
              <span 
                className={`text-[10px] mt-1 font-medium relative z-10 transition-colors ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] group"
        >
          <motion.div whileTap={{ scale: 0.9 }}>
            <LogOut className="w-5 h-5 text-destructive/70 group-hover:text-destructive stroke-[1.5] transition-colors" />
          </motion.div>
          <span className="text-[10px] mt-1 font-medium text-destructive/70 group-hover:text-destructive transition-colors">
            Sortir
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
