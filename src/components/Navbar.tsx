import { useState, useEffect } from 'react';
import { ArrowRightLeft, User, LogOut, Menu, X, Shield, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationCenter } from './NotificationCenter';

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
    { name: 'Preuves', href: '/upload-proof' },
    { name: 'Bénéficiaires', href: '/recipients' },
  ];

  const NavLinks = ({ mobile = false, onClose = () => {} }) => (
    <div className={`${mobile ? 'flex flex-col space-y-4' : 'hidden md:flex items-center space-x-8'}`}>
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
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center shadow-medium">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Koligo</span>
        </Link>

        {/* Desktop Navigation */}
        <NavLinks />

        {/* User Menu & Notifications */}
        <div className="flex items-center space-x-2">
          {user && (
            <>
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors text-sm font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                  <Link
                    to="/admin/proofs"
                    className="hidden md:flex items-center space-x-1 px-3 py-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Preuves</span>
                  </Link>
                </>
              )}
              <NotificationCenter />
              <span className="text-sm text-muted-foreground hidden md:block">
                Bonjour, {user.email}
              </span>
              
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
                <User className="w-4 h-4" />
                <span>Profil</span>
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
                <>
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md text-orange-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Administration</span>
                  </Link>
                  <Link 
                    to="/admin/proofs" 
                    className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent rounded-md text-purple-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Gestion des preuves</span>
                  </Link>
                </>
              )}
              
              <Button 
                variant="ghost" 
                className="flex items-center space-x-2 w-full justify-start px-3 py-2 text-sm hover:bg-accent"
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