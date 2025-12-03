import { useState, useEffect } from 'react';
import { LogOut, Menu, X, Shield, Settings as SettingsIcon, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationCenter } from './NotificationCenter';
import jotaliLogo from '@/assets/jotali-logo.jpg';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(!!data);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard' },
    { name: 'Nouveau transfert', href: '/transfer' },
    { name: 'Historique', href: '/history' },
    { name: 'Bénéficiaires', href: '/recipients' },
  ];

  const NavLinks = ({ mobile = false, onClose = () => {} }) => (
    <div className={`${mobile ? 'flex flex-col space-y-4' : 'hidden md:flex items-center space-x-6'}`}>
      {navigation.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          onClick={onClose}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            location.pathname === item.href 
              ? 'text-primary border-b-2 border-primary pb-1' 
              : 'text-muted-foreground'
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  );

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-3">
          <img 
            src={jotaliLogo} 
            alt="Jotali Services"
            className="h-10 w-10 rounded-xl object-cover shadow-md"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Jotali Services
          </span>
        </Link>

        {/* Desktop Navigation */}
        <NavLinks />

        {/* User Menu & Notifications */}
        <div className="flex items-center space-x-3">
          {user && (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
              <NotificationCenter />
              
              {/* Desktop Logout Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </Button>
              
              {/* Mobile Menu */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg md:hidden z-50">
            <div className="container mx-auto px-4 py-4 space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-accent rounded-md"
                >
                  {item.name}
                </Link>
              ))}
              
              <hr className="my-4" />
              
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>👤 Profil</span>
              </Link>

              <Link 
                to="/settings" 
                className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Paramètres</span>
              </Link>
              
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md text-orange-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  <span>Administration</span>
                </Link>
              )}
              
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 w-full justify-start px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;