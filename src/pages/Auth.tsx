import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRightLeft, Mail, Lock, User, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) {
      setPasswordStrength(null);
      return;
    }
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const isLongEnough = pwd.length >= 8;

    const strength = [hasUpper, hasLower, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;
    
    if (strength <= 2) setPasswordStrength('weak');
    else if (strength <= 3) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  };

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFirstName = firstName.trim();
    const sanitizedLastName = lastName.trim();

    // Basic client-side validation
    if (!sanitizedEmail || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && (!sanitizedFirstName || !sanitizedLastName)) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(sanitizedEmail, password);
        if (error) {
          const errorMessage = error.message === "Invalid login credentials" 
            ? "Email ou mot de passe incorrect" 
            : error.message || "Erreur de connexion";
          
          toast({
            title: "Erreur de connexion",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        const { error } = await signUp(sanitizedEmail, password, sanitizedFirstName, sanitizedLastName);
        if (error) {
          toast({
            title: "Erreur d'inscription",
            description: error.message || "Impossible de créer le compte",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Inscription réussie",
            description: "Vérifiez votre email pour confirmer votre compte",
          });
          // Reset form
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          setPasswordStrength(null);
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-7 h-7 text-primary" />
            </div>
            <span className="text-3xl font-bold text-white">TransferApp</span>
          </div>
          <p className="text-white/80">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        {/* Auth Form */}
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-strong p-8">
          {!isLogin && (
            <div className="flex items-center gap-2 p-3 bg-info/10 rounded-lg mb-4 text-sm text-info-foreground">
              <Shield className="w-4 h-4" />
              <p>Toutes vos données sont cryptées et protégées</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      placeholder="Prénom"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      placeholder="Nom"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!isLogin) checkPasswordStrength(e.target.value);
                  }}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={72}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && passwordStrength && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        passwordStrength === 'weak' ? 'bg-destructive w-1/3' :
                        passwordStrength === 'medium' ? 'bg-warning w-2/3' :
                        'bg-success w-full'
                      }`}
                    />
                  </div>
                  <span className={`text-xs ${
                    passwordStrength === 'weak' ? 'text-destructive' :
                    passwordStrength === 'medium' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {passwordStrength === 'weak' ? 'Faible' :
                     passwordStrength === 'medium' ? 'Moyen' : 'Fort'}
                  </span>
                </div>
              )}
              {!isLogin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                "Chargement..."
              ) : (
                isLogin ? "Se connecter" : "Créer un compte"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline text-sm"
              >
                {isLogin 
                  ? "Pas encore de compte ? S'inscrire" 
                  : "Déjà un compte ? Se connecter"
                }
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;