import { LayoutDashboard, Users, FileCheck, TrendingUp, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface AdminBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminBottomNav = ({ activeTab, onTabChange }: AdminBottomNavProps) => {
  const navItems = [
    {
      id: 'transfers',
      icon: LayoutDashboard,
      label: 'Transferts',
    },
    {
      id: 'proofs',
      icon: FileCheck,
      label: 'Preuves',
    },
    {
      id: 'messages',
      icon: MessageSquare,
      label: 'Messages',
    },
    {
      id: 'stats',
      icon: TrendingUp,
      label: 'Stats',
    },
    {
      id: 'rates',
      icon: Users,
      label: 'Taux',
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t-2 border-primary/10 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-5 gap-1 px-2 py-2 safe-area-bottom">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors duration-200 ${
              activeTab === item.id
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            <item.icon 
              className={`w-5 h-5 mb-1 ${
                activeTab === item.id ? 'text-primary stroke-[2.5]' : 'stroke-[2]'
              }`} 
            />
            <span className={`text-[10px] font-semibold leading-tight ${
              activeTab === item.id ? 'text-primary' : ''
            }`}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
      
      <div className="absolute -top-2 right-3">
        <div className="bg-gradient-primary text-white text-[10px] px-2.5 py-1 rounded-full shadow-glow font-semibold">
          Admin
        </div>
      </div>
    </nav>
  );
};

export default AdminBottomNav;
