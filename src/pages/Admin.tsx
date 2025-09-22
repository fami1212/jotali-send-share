import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, FileImage, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface Transfer {
  id: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  transfer_type: string;
  transfer_method: string;
  status: string;
  reference_number: string;
  notes?: string;
  proof_image_url?: string;
  admin_notes?: string;
  created_at: string;
  user_id: string;
  recipient_id: string;
  recipients?: {
    name: string;
    phone: string;
    country: string;
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
  } | null;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransfers();
    }
  }, [isAdmin, statusFilter]);

  const checkAdminStatus = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsAdmin(true);
      } else {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les privilèges d'administrateur",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    }
  };

  const loadTransfers = async () => {
    try {
      let query = supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Get user profiles separately
      const userIds = [...new Set(data?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Get recipients
      const recipientIds = [...new Set(data?.map(t => t.recipient_id).filter(Boolean) || [])];
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country')
        .in('id', recipientIds);

      // Merge data
      const enhancedTransfers = data?.map(transfer => ({
        ...transfer,
        profiles: profiles?.find(p => p.user_id === transfer.user_id) || null,
        recipients: recipients?.find(r => r.id === transfer.recipient_id) || null
      })) || [];

      setTransfers(enhancedTransfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des transferts",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const updateTransferStatus = async (transferId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('transfers')
        .update(updateData)
        .eq('id', transferId);

      if (error) {
        throw error;
      }

      toast({
        title: "Statut mis à jour",
        description: "Le statut du transfert a été mis à jour avec succès",
      });

      loadTransfers();
      setSelectedTransfer(null);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error updating transfer:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'awaiting_admin': return 'bg-blue-500/10 text-blue-500';
      case 'approved': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-green-600/10 text-green-600';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'cancelled': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'awaiting_admin': return 'Attente admin';
      case 'approved': return 'Approuvé';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Administration
          </h1>
          <p className="text-muted-foreground">
            Gérer les transferts et demandes des utilisateurs
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les transferts</SelectItem>
              <SelectItem value="awaiting_admin">En attente admin</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="completed">Terminés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="grid gap-4">
            {transfers.map((transfer) => (
              <Card key={transfer.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <h3 className="font-semibold text-lg">
                        {transfer.reference_number}
                      </h3>
                      <Badge className={getStatusColor(transfer.status)}>
                        {getStatusText(transfer.status)}
                      </Badge>
                      <Badge variant="outline">
                        {transfer.transfer_type === 'transfer' ? 'Envoi' : 
                         transfer.transfer_type === 'withdrawal' ? 'Retrait' :
                         transfer.transfer_type === 'exchange' ? 'Échange' : 'Transfert'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Utilisateur:</span> {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                      </div>
                      <div>
                        <span className="font-medium">Bénéficiaire:</span> {transfer.recipients?.name}
                      </div>
                      <div>
                        <span className="font-medium">Montant:</span> {transfer.amount} {transfer.from_currency} → {transfer.converted_amount} {transfer.to_currency}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Créé le: {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </div>

                    {transfer.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span> {transfer.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {transfer.proof_image_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileImage className="w-4 h-4 mr-2" />
                            Preuve
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Preuve de paiement</DialogTitle>
                          </DialogHeader>
                          <div className="flex justify-center">
                            <img 
                              src={`${supabase.storage.from('transfer-proofs').getPublicUrl(transfer.proof_image_url).data.publicUrl}`}
                              alt="Preuve de paiement"
                              className="max-w-full max-h-96 object-contain"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Dialog open={selectedTransfer?.id === transfer.id} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setAdminNotes(transfer.admin_notes || '');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Gérer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Gérer le transfert</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Notes administratives:</label>
                            <Textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Ajouter une note..."
                              className="mt-2"
                            />
                          </div>
                          
                          <div className="flex space-x-2">
                            {transfer.status === 'awaiting_admin' && (
                              <>
                                <Button
                                  onClick={() => updateTransferStatus(transfer.id, 'approved', adminNotes)}
                                  className="flex-1"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approuver
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => updateTransferStatus(transfer.id, 'rejected', adminNotes)}
                                  className="flex-1"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                            
                            {transfer.status === 'approved' && (
                              <Button
                                onClick={() => updateTransferStatus(transfer.id, 'completed', adminNotes)}
                                className="w-full"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marquer terminé
                              </Button>
                            )}
                            
                            {(transfer.status === 'pending' || transfer.status === 'approved') && (
                              <Button
                                variant="outline"
                                onClick={() => updateTransferStatus(transfer.id, 'cancelled', adminNotes)}
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Annuler
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}

            {transfers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucun transfert trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;