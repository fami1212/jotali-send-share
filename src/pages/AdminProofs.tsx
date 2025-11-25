import { useState, useEffect } from 'react';
import { Download, Trash2, Eye, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { format } from 'date-fns';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  created_at: string;
  proof_image_url: string | null;
  user_id: string;
  transfer_method: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const AdminProofs = () => {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter]);

  const loadTransfers = async () => {
    try {
      // First get transfers with proof
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfers')
        .select('*')
        .not('proof_image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (transfersError) throw transfersError;

      if (transfersData) {
        // Then get profiles for each transfer
        const transfersWithProfiles = await Promise.all(
          transfersData.map(async (transfer) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, email, phone')
              .eq('user_id', transfer.user_id)
              .single();

            return {
              ...transfer,
              profiles: profileData
            };
          })
        );

        setTransfers(transfersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les preuves",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${t.profiles?.first_name} ${t.profiles?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTransfers(filtered);
  };

  const downloadProof = async (transfer: Transfer) => {
    if (!transfer.proof_image_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .download(transfer.proof_image_url);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preuve-${transfer.reference_number}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: "Preuve téléchargée avec succès",
      });
    } catch (error: any) {
      console.error('Error downloading proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement",
        variant: "destructive",
      });
    }
  };

  const deleteProof = async (transferId: string) => {
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer || !transfer.proof_image_url) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('transfer-proofs')
        .remove([transfer.proof_image_url]);

      if (storageError) throw storageError;

      // Update transfer record
      const { error: updateError } = await supabase
        .from('transfers')
        .update({ proof_image_url: null })
        .eq('id', transferId);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Preuve supprimée avec succès",
      });

      loadTransfers();
      setDeleteTransferId(null);
    } catch (error: any) {
      console.error('Error deleting proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const viewProof = async (transfer: Transfer) => {
    if (!transfer.proof_image_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .createSignedUrl(transfer.proof_image_url, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        setSelectedImage(data.signedUrl);
        setSelectedTransfer(transfer);
      }
    } catch (error: any) {
      console.error('Error viewing proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la visualisation",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      approved: { variant: "default", label: "Approuvé" },
      completed: { variant: "default", label: "Terminé" },
      rejected: { variant: "destructive", label: "Rejeté" },
      cancelled: { variant: "outline", label: "Annulé" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-pulse">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl pb-24 md:pb-6">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Preuves 📎
          </h1>
          <p className="text-slate-600">
            Gérer toutes les preuves
          </p>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Gestion des preuves de paiement
          </h1>
          <p className="text-slate-600">
            Visualisez, téléchargez et gérez toutes les preuves uploadées
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white/95 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-medium border-0 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Rechercher par référence ou utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-2 border-slate-200"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full md:w-auto rounded-xl border-2"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-4"
                >
                  <X className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <div className="text-sm text-slate-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-slate-800">{transfers.length}</div>
          </Card>
          <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <div className="text-sm text-slate-600 mb-1">En attente</div>
            <div className="text-2xl font-bold text-amber-600">
              {transfers.filter(t => t.status === 'pending').length}
            </div>
          </Card>
          <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <div className="text-sm text-slate-600 mb-1">Approuvés</div>
            <div className="text-2xl font-bold text-green-600">
              {transfers.filter(t => t.status === 'approved' || t.status === 'completed').length}
            </div>
          </Card>
          <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <div className="text-sm text-slate-600 mb-1">Rejetés</div>
            <div className="text-2xl font-bold text-red-600">
              {transfers.filter(t => t.status === 'rejected').length}
            </div>
          </Card>
        </div>

        {/* Transfers Grid */}
        {filteredTransfers.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-medium border-0 text-center">
            <p className="text-slate-600">Aucune preuve trouvée</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0 hover:shadow-strong transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">
                      {transfer.reference_number}
                    </span>
                    {getStatusBadge(transfer.status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Client</span>
                      <span className="font-medium text-slate-800">
                        {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Email</span>
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">
                        {transfer.profiles?.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Montant</span>
                      <span className="font-medium text-slate-800">
                        {transfer.amount} {transfer.from_currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Méthode</span>
                      <span className="font-medium text-slate-800">
                        {transfer.transfer_method === 'wave' ? 'Wave' :
                         transfer.transfer_method === 'orange' ? 'Orange Money' : 'Virement'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date</span>
                      <span className="font-medium text-slate-800">
                        {format(new Date(transfer.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => viewProof(transfer)}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      onClick={() => downloadProof(transfer)}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Télécharger
                    </Button>
                    <Button
                      onClick={() => setDeleteTransferId(transfer.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => { setSelectedImage(null); setSelectedTransfer(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Preuve de paiement - {selectedTransfer?.reference_number}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="overflow-auto">
              <img 
                src={selectedImage} 
                alt="Preuve de paiement" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTransferId} onOpenChange={() => setDeleteTransferId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette preuve ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTransferId && deleteProof(deleteTransferId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
};

export default AdminProofs;
