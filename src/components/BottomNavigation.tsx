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
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-t border-white/20 dark:border-slate-700/50" />
      
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

      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[56px]"
            >
              {/* Active indicator background */}
              {isActive && (
                <motion.div
                  layoutId="activeNavBg"
                  className="absolute inset-1 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon with animation */}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -2 : 0
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative z-10"
              >
                <item.icon 
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive 
                      ? 'stroke-[2.5]' 
                      : 'text-slate-400 dark:text-slate-500 stroke-[1.5]'
                  }`}
                  style={isActive ? {
                    stroke: 'url(#navGradient)',
                  } : undefined}
                />
              </motion.div>
              
              {/* Label */}
              <motion.span 
                animate={{ opacity: isActive ? 1 : 0.6 }}
                className={`text-[10px] mt-1 font-semibold relative z-10 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.label}
              </motion.span>

              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[56px] group"
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="relative z-10"
          >
            <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-500 stroke-[1.5] transition-colors" />
          </motion.div>
          <span className="text-[10px] mt-1 font-semibold text-red-400 group-hover:text-red-500 transition-colors">
            Sortir
          </span>
        </button>
      </div>

      {/* SVG Gradient definition for icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="navGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
    </nav>
  );
};

export default BottomNavigation;