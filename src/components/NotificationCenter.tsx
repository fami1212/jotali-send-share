import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  transfer_id?: string;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      subscribeToTransferUpdates();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    // For now, we'll simulate notifications based on transfer status changes
    try {
      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (transfers) {
        const mockNotifications: Notification[] = transfers.map(transfer => ({
          id: `notif-${transfer.id}`,
          title: getNotificationTitle(transfer.status, transfer.transfer_type),
          message: getNotificationMessage(transfer.status, transfer.reference_number),
          type: getNotificationType(transfer.status),
          read: false,
          created_at: transfer.updated_at,
          transfer_id: transfer.id
        }));

        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const subscribeToTransferUpdates = () => {
    const channel = supabase
      .channel('transfer-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transfers',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const transfer = payload.new as any;
          const notification: Notification = {
            id: `notif-${transfer.id}-${Date.now()}`,
            title: getNotificationTitle(transfer.status, transfer.transfer_type),
            message: getNotificationMessage(transfer.status, transfer.reference_number),
            type: getNotificationType(transfer.status),
            read: false,
            created_at: new Date().toISOString(),
            transfer_id: transfer.id
          };

          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const getNotificationTitle = (status: string, type: string) => {
    switch (status) {
      case 'approved': return type === 'send' ? 'Envoi approuvé' : 'Transfert approuvé';
      case 'completed': return type === 'send' ? 'Envoi terminé' : 'Transfert terminé';
      case 'rejected': return type === 'send' ? 'Envoi rejeté' : 'Transfert rejeté';
      case 'cancelled': return type === 'send' ? 'Envoi annulé' : 'Transfert annulé';
      default: return 'Mise à jour de statut';
    }
  };

  const getNotificationMessage = (status: string, reference: string) => {
    switch (status) {
      case 'approved':
        return `Votre transfert ${reference} a été approuvé par l'administrateur.`;
      case 'completed':
        return `Votre transfert ${reference} a été terminé avec succès.`;
      case 'rejected':
        return `Votre transfert ${reference} a été rejeté. Consultez les notes de l'administrateur.`;
      case 'cancelled':
        return `Votre transfert ${reference} a été annulé.`;
      default:
        return `Le statut de votre transfert ${reference} a été mis à jour.`;
    }
  };

  const getNotificationType = (status: string): 'info' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'info';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-80">
          {notifications.length > 0 ? (
            <div className="p-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`p-3 mb-2 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};