import { ArrowRightLeft, User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Tableau de bord', href: '/dashboard' },
    { name: 'Nouveau transfert', href: '/transfer' },
    { name: 'Historique', href: '/history' },
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
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">TransferApp</span>
        </Link>

        {/* Desktop Navigation */}
        <NavLinks />

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {user && (
            <>
              {/* Mobile menu trigger */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <div className="py-6">
                    <div className="flex items-center space-x-2 mb-8">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <ArrowRightLeft className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold">TransferApp</span>
                    </div>
                    <NavLinks mobile onClose={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:block">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;