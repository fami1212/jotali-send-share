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
import BottomNavigation from '@/components/BottomNavigation';

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
        .update({
          first_name: firstName,
          last_name: lastName,  
          phone,
          country,
        })
        .eq('user_id', user.id);

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

  const uploadAvatar = async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);

    try {
      const avatarUrl = await uploadAvatar(file);
      
      if (avatarUrl) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Photo de profil mise à jour",
          description: "Votre nouvelle photo a été sauvegardée",
        });

        loadProfile();
      }
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la photo",
        variant: "destructive",
      });
    }

    setIsUploadingAvatar(false);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="hidden md:block">
          <Navbar />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement du profil...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden md:block">
        <Navbar />
      </div>
      
      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Mon profil 👤
            </h1>
            <p className="text-slate-600">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>

          <div className="space-y-6">
            {/* Avatar Section */}
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-medium border-0 rounded-2xl">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 shadow-medium">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl bg-gradient-primary text-white">
                      {firstName.charAt(0)}{lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-8 h-8 p-0"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    {firstName} {lastName}
                  </h3>
                  <p className="text-slate-600">{user?.email}</p>
                  
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
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-medium border-0 rounded-2xl">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">Informations personnelles</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-700">Prénom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="pl-10 border-2 border-slate-200 bg-white text-slate-800"
                          placeholder="Votre prénom"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-700">Nom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="pl-10 border-2 border-slate-200 bg-white text-slate-800"
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

                <Button type="submit" disabled={isLoading} className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-medium">
                  {isLoading ? "Mise à jour..." : "Sauvegarder les modifications"}
                </Button>
              </form>
            </Card>

            {/* Security Section */}
            <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-medium border-0 rounded-2xl">
              <h2 className="text-xl font-semibold mb-4 text-slate-800">Sécurité</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="font-medium text-slate-800">Mot de passe</h4>
                    <p className="text-sm text-slate-600">
                      Dernière modification il y a plus de 30 jours
                    </p>
                  </div>
                  <Button variant="outline" className="border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary">
                    Changer le mot de passe
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="font-medium text-slate-800">Authentification à deux facteurs</h4>
                    <p className="text-sm text-slate-600">
                      Sécurisez votre compte avec 2FA
                    </p>
                  </div>
                  <Button variant="outline" className="border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary">
                    Activer 2FA
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Profile;