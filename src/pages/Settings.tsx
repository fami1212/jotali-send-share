import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, Shield, Smartphone } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
  });

  const handleNotificationChange = (type: 'email' | 'push' | 'sms') => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    toast({
      title: "Paramètres mis à jour",
      description: "Vos préférences de notification ont été enregistrées.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl pb-24 md:pb-8">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold mb-2">Paramètres ⚙️</h1>
          <p className="text-sm text-muted-foreground">Gérez vos préférences</p>
        </div>
        
        <h1 className="text-3xl font-bold mb-8 hidden md:block">Paramètres</h1>

        {/* Notifications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications par email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les mises à jour par email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les notifications sur votre appareil
                </p>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={() => handleNotificationChange('push')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les alertes importantes par SMS
                </p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={() => handleNotificationChange('sms')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Protégez votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <Smartphone className="w-4 h-4 mr-2" />
              Configurer l'authentification à deux facteurs
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Changer le mot de passe
            </Button>
          </CardContent>
        </Card>
      </main>

      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default Settings;
