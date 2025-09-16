import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  avatar_url: string;
  is_verified: boolean;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setCountry(data.country || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsLoading(true);

    try {
      const profileData = {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        country,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert([profileData]);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });

      loadProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du profil",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Mon profil
            </h1>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>

          <div className="space-y-6">
            {/* Avatar Section */}
            <Card className="p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {firstName} {lastName}
                  </h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  
                  <div className="flex items-center mt-2">
                    {profile?.is_verified ? (
                      <div className="flex items-center text-success">
                        <Shield className="w-4 h-4 mr-1" />
                        <span className="text-sm">Compte vérifié</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-warning">
                        <Shield className="w-4 h-4 mr-1" />
                        <span className="text-sm">Compte non vérifié</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Profile Form */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Informations personnelles</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        placeholder="Votre prénom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-10"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      placeholder="+212 6 XX XX XX XX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Sélectionner votre pays" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morocco">Maroc</SelectItem>
                        <SelectItem value="Senegal">Sénégal</SelectItem>
                        <SelectItem value="Mali">Mali</SelectItem>
                        <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                        <SelectItem value="Ivory Coast">Côte d'Ivoire</SelectItem>
                        <SelectItem value="Niger">Niger</SelectItem>
                        <SelectItem value="Benin">Bénin</SelectItem>
                        <SelectItem value="Togo">Togo</SelectItem>
                        <SelectItem value="Guinea-Bissau">Guinée-Bissau</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Mise à jour..." : "Sauvegarder les modifications"}
                </Button>
              </form>
            </Card>

            {/* Security Section */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Sécurité</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Mot de passe</h4>
                    <p className="text-sm text-muted-foreground">
                      Dernière modification il y a plus de 30 jours
                    </p>
                  </div>
                  <Button variant="outline">
                    Changer le mot de passe
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Authentification à deux facteurs</h4>
                    <p className="text-sm text-muted-foreground">
                      Sécurisez votre compte avec 2FA
                    </p>
                  </div>
                  <Button variant="outline">
                    Activer 2FA
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;