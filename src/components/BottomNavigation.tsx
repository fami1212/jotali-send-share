import { Home, ArrowRightLeft, Clock, Users, User, LogOut } from 'lucide-react';
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
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]" />
      
      {/* Admin badge */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 right-4 z-10"
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
      <div className="relative flex items-center justify-between px-3 py-2 pb-safe">
        {/* JOTALI Logo */}
        <Link to="/dashboard" className="flex items-center pl-1">
          <span 
            className="text-xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            JOTALI
          </span>
        </Link>

        {/* Navigation items */}
        <div className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center py-1.5 px-2.5"
              >
                {/* Active indicator background */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavBg"
                    className="absolute inset-0.5 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
                    }}
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
                    className={`w-[18px] h-[18px] transition-all duration-200 ${
                      isActive 
                        ? 'text-blue-500 stroke-[2.5]' 
                        : 'text-slate-400 dark:text-slate-500 stroke-[1.5]'
                    }`}
                  />
                </motion.div>
                
                {/* Label */}
                <span 
                  className={`text-[9px] mt-0.5 font-semibold relative z-10 transition-colors ${
                    isActive 
                      ? 'text-blue-500' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-1.5 px-2 pr-1 group"
        >
          <motion.div whileTap={{ scale: 0.9 }}>
            <LogOut className="w-[18px] h-[18px] text-red-400 group-hover:text-red-500 stroke-[1.5] transition-colors" />
          </motion.div>
          <span className="text-[9px] mt-0.5 font-semibold text-red-400 group-hover:text-red-500 transition-colors">
            Sortir
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;