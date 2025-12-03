import { Home, ArrowRightLeft, Clock, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import jotaliLogo from '@/assets/jotali-logo.jpg';

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
    {
      icon: Home,
      label: 'Accueil',
      path: '/dashboard',
    },
    {
      icon: ArrowRightLeft,
      label: 'Transfert',
      path: '/transfer',
    },
    {
      icon: Clock,
      label: 'Historique',
      path: '/history',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 z-50 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between px-4 py-2 pb-safe max-w-md mx-auto">
        {/* Logo - more prominent */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 py-1"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md border-2 border-primary/20">
            <img 
              src={jotaliLogo} 
              alt="Jotali" 
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center py-1 px-4"
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute -inset-2 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ 
                      scale: isActive ? 1.1 : 1,
                      y: isActive ? -2 : 0
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <item.icon 
                      className={`w-5 h-5 relative z-10 transition-colors ${
                        isActive 
                          ? 'text-primary stroke-[2.5]' 
                          : 'text-slate-400 stroke-[1.5]'
                      }`} 
                    />
                  </motion.div>
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-400 stroke-[1.5]" />
          <span className="text-[10px] mt-1 font-medium text-red-400">Sortir</span>
        </button>
      </div>
      
      {/* Admin badge */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-3 right-4"
        >
          <Link to="/admin" className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-3 py-1 rounded-full shadow-lg font-semibold">
            Admin
          </Link>
        </motion.div>
      )}
    </nav>
  );
};

export default BottomNavigation;