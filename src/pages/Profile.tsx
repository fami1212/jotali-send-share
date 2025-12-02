import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { useNavigate } from 'react-router-dom';

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  avatar_url: string;
  is_verified: boolean;
}

const countries = [
  { value: 'Morocco', label: 'Maroc' },
  { value: 'Senegal', label: 'Sénégal' },
  { value: 'Mali', label: 'Mali' },
  { value: 'Burkina Faso', label: 'Burkina Faso' },
  { value: 'Ivory Coast', label: 'Côte d\'Ivoire' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Benin', label: 'Bénin' },
  { value: 'Togo', label: 'Togo' }
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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
      console.error('Error:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, phone, country })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success("Profil mis à jour");
      loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }

    setIsLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user.id);

      toast.success("Photo mise à jour");
      loadProfile();
    } catch (error: any) {
      toast.error("Erreur lors de l'upload");
    }

    setIsUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="hidden md:block"><Navbar /></div>
      
      <div className="container mx-auto px-4 py-6 max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
          <p className="text-slate-500 text-sm">Gérez vos informations</p>
        </div>

        {/* Avatar Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-blue-500 text-white text-xl">
                  {firstName.charAt(0)}{lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                size="icon"
                variant="outline"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {firstName} {lastName}
              </h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
              
              <div className="flex items-center gap-1 mt-2">
                <Shield className={`w-4 h-4 ${profile?.is_verified ? 'text-green-500' : 'text-amber-500'}`} />
                <span className={`text-xs ${profile?.is_verified ? 'text-green-600' : 'text-amber-600'}`}>
                  {profile?.is_verified ? 'Vérifié' : 'Non vérifié'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Informations personnelles</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={user?.email || ''} disabled className="pl-10 bg-slate-50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 XX XX XX XX"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pays</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Mise à jour..." : "Sauvegarder"}
            </Button>
          </form>
        </Card>

        {/* Logout */}
        <Card className="p-4">
          <Button 
            variant="outline" 
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
