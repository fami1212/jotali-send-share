import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, FileImage } from 'lucide-react';
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
  exchange_rate: number;
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
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    try {
      // Call the is_admin function using RPC
      const { data, error } = await supabase.rpc('is_admin', { 
        user_id_input: user.id 
      });

      if (error) throw error;

      if (data === true) {
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
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les privilèges administrateur",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  };

  const loadTransfers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user profiles separately
      const userIds = [...new Set(data?.map(t => t.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Get recipients
      const recipientIds = [...new Set(data?.map(t => t.recipient_id).filter(Boolean) || [])];
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id, name, phone, country')
        .in('id', recipientIds);

      if (recipientsError) {
        console.error('Error loading recipients:', recipientsError);
      }

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
    } finally {
      setIsLoading(false);
    }
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
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm shadow-medium border-0 hover:shadow-strong transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800">
                          {transfer.reference_number}
                        </h3>
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {transfer.transfer_type === 'transfer' ? 'Envoi' : 
                           transfer.transfer_type === 'withdrawal' ? 'Retrait' :
                           transfer.transfer_type === 'exchange' ? 'Échange' : 'Transfert'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Client: </span>
                          <span className="font-semibold text-slate-800">
                            {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Bénéficiaire: </span>
                          <span className="font-semibold text-slate-800">
                            {transfer.recipients?.name || 'Retrait personnel'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-left lg:text-right bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">Montant envoyé</p>
                      <p className="text-2xl font-bold text-slate-800 mb-2">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: transfer.from_currency === 'CFA' ? 'XOF' : 'MAD',
                        }).format(transfer.amount)}
                      </p>
                      <p className="text-xs text-slate-500">Montant reçu</p>
                      <p className="text-lg font-semibold text-green-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: transfer.to_currency === 'CFA' ? 'XOF' : 'MAD',
                        }).format(transfer.converted_amount)}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Taux: {transfer.exchange_rate}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {transfer.recipients?.phone || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Pays</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {transfer.recipients?.country || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Méthode</p>
                      <p className="font-semibold text-slate-800 text-sm capitalize">
                        {transfer.transfer_method === 'bank' ? 'Virement bancaire' : 'Wave'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date de création</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {new Date(transfer.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {transfer.notes && (
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-xs text-slate-500 mb-1">Notes du client</p>
                      <p className="text-sm font-medium text-slate-800">{transfer.notes}</p>
                    </div>
                  )}

                  {transfer.admin_notes && (
                    <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                      <p className="text-xs text-slate-500 mb-1">Notes administrateur</p>
                      <p className="text-sm font-medium text-slate-800">{transfer.admin_notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    {transfer.proof_image_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            <FileImage className="w-4 h-4 mr-2" />
                            Voir la preuve de paiement
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
                              className="max-w-full max-h-96 object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    <Dialog open={selectedTransfer?.id === transfer.id} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setAdminNotes(transfer.admin_notes || '');
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Gérer ce transfert
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
                          
                          <div className="flex flex-col gap-2">
                            {transfer.status === 'awaiting_admin' && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateTransferStatus(transfer.id, 'approved', adminNotes)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
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
                              </div>
                            )}
                            
                            {transfer.status === 'approved' && (
                              <Button
                                onClick={() => updateTransferStatus(transfer.id, 'completed', adminNotes)}
                                className="w-full bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marquer comme terminé
                              </Button>
                            )}

                            {transfer.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateTransferStatus(transfer.id, 'approved', adminNotes)}
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approuver
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => updateTransferStatus(transfer.id, 'cancelled', adminNotes)}
                                  className="flex-1"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Annuler
                                </Button>
                              </div>
                            )}
                            
                            {(transfer.status === 'approved') && (
                              <Button
                                variant="outline"
                                onClick={() => updateTransferStatus(transfer.id, 'cancelled', adminNotes)}
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Annuler le transfert
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
              <Card className="bg-white/95 backdrop-blur-sm p-12 text-center shadow-medium border-0">
                <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun transfert trouvé</h3>
                <p className="text-sm text-slate-500">
                  {statusFilter !== 'all' 
                    ? 'Essayez de modifier le filtre de statut'
                    : 'Aucun transfert en attente de traitement'}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;