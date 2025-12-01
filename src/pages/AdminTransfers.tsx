import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, Check, X, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  exchange_rate: number;
  status: string;
  transfer_method: string;
  created_at: string;
  proof_image_url: string | null;
  proof_verified: boolean | null;
  proof_admin_comment: string | null;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  recipients: {
    name: string;
    phone: string;
    country: string;
  } | null;
}

const AdminTransfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofComment, setProofComment] = useState("");
  const [showProofDialog, setShowProofDialog] = useState(false);

  useEffect(() => {
    loadTransfers();

    // Subscribe to updates
    const channel = supabase
      .channel('admin-transfers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfers'
        },
        () => {
          loadTransfers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter]);

  const loadTransfers = async () => {
    try {
      const { data: transfersData, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!transfersData) {
        setTransfers([]);
        return;
      }

      // Get user profiles
      const userIds = [...new Set(transfersData.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Get recipients
      const recipientIds = transfersData
        .map((t: any) => t.recipient_id)
        .filter(Boolean);
      
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country')
        .in('id', recipientIds);

      const recipientMap = new Map(
        (recipients || []).map(r => [r.id, r])
      );

      // Combine data
      const enrichedTransfers = transfersData.map((transfer: any) => {
        const profile = profileMap.get(transfer.user_id);
        const recipient = transfer.recipient_id ? recipientMap.get(transfer.recipient_id) : null;
        
        return {
          ...transfer,
          profiles: {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            phone: profile?.phone || ''
          },
          recipients: recipient ? {
            name: recipient.name,
            phone: recipient.phone,
            country: recipient.country
          } : null
        };
      });

      setTransfers(enrichedTransfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${t.profiles.first_name} ${t.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTransfers(filtered);
  };

  const updateTransferStatus = async (transferId: string, status: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transfers')
        .update({ status })
        .eq('id', transferId);

      if (error) throw error;
      toast.success(`Statut mis à jour: ${getStatusText(status)}`);
      loadTransfers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  const verifyProof = async (transferId: string, verified: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transfers')
        .update({
          proof_verified: verified,
          proof_verified_at: new Date().toISOString(),
          proof_admin_comment: proofComment || null,
          status: verified ? 'approved' : 'rejected'
        })
        .eq('id', transferId);

      if (error) throw error;
      toast.success(verified ? "Preuve approuvée" : "Preuve rejetée");
      setShowProofDialog(false);
      setProofComment("");
      loadTransfers();
    } catch (error) {
      console.error('Error verifying proof:', error);
      toast.error("Erreur lors de la vérification");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'awaiting_admin': return 'bg-info/10 text-info';
      case 'approved': return 'bg-success/10 text-success';
      case 'completed': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'awaiting_admin': return 'Attente admin';
      case 'approved': return 'Approuvé';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence, nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="awaiting_admin">Attente admin</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="self-center">
            {filteredTransfers.length} transfert(s)
          </Badge>
        </div>
      </Card>

      {/* Transfers List */}
      <Card className="p-4">
        <ScrollArea className="h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileText className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun transfert trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransfers.map((transfer) => (
                <Card key={transfer.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{transfer.reference_number}</h3>
                          <Badge className={getStatusColor(transfer.status)}>
                            {getStatusText(transfer.status)}
                          </Badge>
                          {transfer.proof_image_url && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              Preuve
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Client:</span>
                        <p className="font-medium">
                          {transfer.profiles.first_name} {transfer.profiles.last_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium truncate">{transfer.profiles.email}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Montant:</span>
                        <p className="font-medium">
                          {transfer.amount} {transfer.from_currency} → {transfer.converted_amount} {transfer.to_currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Méthode:</span>
                        <p className="font-medium capitalize">{transfer.transfer_method}</p>
                      </div>
                      {transfer.recipients && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Bénéficiaire:</span>
                            <p className="font-medium">{transfer.recipients.name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pays:</span>
                            <p className="font-medium">{transfer.recipients.country}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {transfer.status === 'awaiting_admin' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateTransferStatus(transfer.id, 'approved')}
                            disabled={actionLoading}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateTransferStatus(transfer.id, 'rejected')}
                            disabled={actionLoading}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </>
                      )}
                      {transfer.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateTransferStatus(transfer.id, 'completed')}
                          disabled={actionLoading}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Marquer terminé
                        </Button>
                      )}
                      {transfer.proof_image_url && transfer.proof_verified === null && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setShowProofDialog(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Vérifier preuve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTransfer(transfer)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Proof Verification Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vérifier la preuve</DialogTitle>
          </DialogHeader>
          {selectedTransfer?.proof_image_url && (
            <div className="space-y-4">
              <img
                src={selectedTransfer.proof_image_url}
                alt="Preuve"
                className="w-full rounded-lg"
              />
              <Textarea
                placeholder="Commentaire (optionnel)..."
                value={proofComment}
                onChange={(e) => setProofComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => verifyProof(selectedTransfer.id, true)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => verifyProof(selectedTransfer.id, false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Details Dialog */}
      <Dialog open={!!selectedTransfer && !showProofDialog} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Référence</span>
                  <p className="font-medium">{selectedTransfer.reference_number}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge className={getStatusColor(selectedTransfer.status)}>
                    {getStatusText(selectedTransfer.status)}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Client</span>
                  <p className="font-medium">
                    {selectedTransfer.profiles.first_name} {selectedTransfer.profiles.last_name}
                  </p>
                  <p className="text-sm">{selectedTransfer.profiles.email}</p>
                  <p className="text-sm">{selectedTransfer.profiles.phone}</p>
                </div>
                {selectedTransfer.recipients && (
                  <div>
                    <span className="text-sm text-muted-foreground">Bénéficiaire</span>
                    <p className="font-medium">{selectedTransfer.recipients.name}</p>
                    <p className="text-sm">{selectedTransfer.recipients.phone}</p>
                    <p className="text-sm">{selectedTransfer.recipients.country}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Montant envoyé</span>
                  <p className="font-medium">{selectedTransfer.amount} {selectedTransfer.from_currency}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Montant reçu</span>
                  <p className="font-medium">{selectedTransfer.converted_amount} {selectedTransfer.to_currency}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Taux</span>
                  <p className="font-medium">{selectedTransfer.exchange_rate}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Méthode</span>
                  <p className="font-medium capitalize">{selectedTransfer.transfer_method}</p>
                </div>
              </div>
              {selectedTransfer.proof_image_url && (
                <div>
                  <span className="text-sm text-muted-foreground">Preuve de paiement</span>
                  <img
                    src={selectedTransfer.proof_image_url}
                    alt="Preuve"
                    className="w-full rounded-lg mt-2"
                  />
                  {selectedTransfer.proof_admin_comment && (
                    <p className="text-sm mt-2 p-2 bg-muted rounded">
                      {selectedTransfer.proof_admin_comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTransfers;
