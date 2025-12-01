import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, Check, X, FileText, User, Phone, Mail, MapPin, ArrowRight, Send, Download } from "lucide-react";
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
  fees: number;
  total_amount: number;
  status: string;
  transfer_method: string;
  transfer_type: string;
  created_at: string;
  completed_at: string | null;
  proof_image_url: string | null;
  proof_verified: boolean | null;
  proof_admin_comment: string | null;
  notes: string | null;
  admin_notes: string | null;
  user_id: string;
  recipient_id: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
  };
  recipients: {
    name: string;
    phone: string;
    country: string;
    transfer_number: string;
  } | null;
}

const AdminTransfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofComment, setProofComment] = useState("");
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    loadTransfers();

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
  }, [transfers, searchTerm, statusFilter, typeFilter]);

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

      const userIds = [...new Set(transfersData.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, country')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const recipientIds = transfersData
        .map((t: any) => t.recipient_id)
        .filter(Boolean);
      
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country, transfer_number')
        .in('id', recipientIds);

      const recipientMap = new Map(
        (recipients || []).map(r => [r.id, r])
      );

      const enrichedTransfers = transfersData.map((transfer: any) => {
        const profile = profileMap.get(transfer.user_id);
        const recipient = transfer.recipient_id ? recipientMap.get(transfer.recipient_id) : null;
        
        return {
          ...transfer,
          profiles: {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
            country: profile?.country || ''
          },
          recipients: recipient ? {
            name: recipient.name,
            phone: recipient.phone,
            country: recipient.country,
            transfer_number: recipient.transfer_number
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

    if (typeFilter !== "all") {
      filtered = filtered.filter(t => t.transfer_type === typeFilter);
    }

    setFilteredTransfers(filtered);
  };

  const updateTransferStatus = async (transferId: string, status: string) => {
    setActionLoading(true);
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('transfers')
        .update(updateData)
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

  const saveAdminNotes = async (transferId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transfers')
        .update({ admin_notes: adminNotes })
        .eq('id', transferId);

      if (error) throw error;
      toast.success("Notes enregistrées");
      loadTransfers();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Erreur lors de l'enregistrement");
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
      setSelectedTransfer(null);
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

  const getTransferTypeText = (type: string) => {
    return type === 'send' ? 'Envoi' : 'Retrait';
  };

  const getTransferTypeColor = (type: string) => {
    return type === 'send' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="send">Envoi</SelectItem>
                  <SelectItem value="withdraw">Retrait</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="self-center justify-center">
                {filteredTransfers.length} transfert(s)
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <ScrollArea className="h-[calc(100vh-250px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun transfert trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{transfer.reference_number}</CardTitle>
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                        <Badge className={getTransferTypeColor(transfer.transfer_type)}>
                          {getTransferTypeText(transfer.transfer_type)}
                        </Badge>
                        {transfer.proof_image_url && (
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            Preuve
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transfer.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Client Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Informations Client</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Nom complet</p>
                        <p className="font-medium">
                          {transfer.profiles.first_name} {transfer.profiles.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm truncate">{transfer.profiles.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{transfer.profiles.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pays</p>
                        <p className="font-medium">{transfer.profiles.country || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Transaction Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Détails Transaction</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant envoyé</p>
                        <p className="font-bold text-lg">
                          {transfer.amount} {transfer.from_currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Montant reçu</p>
                        <p className="font-bold text-lg text-primary">
                          {transfer.converted_amount} {transfer.to_currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taux de change</p>
                        <p className="font-medium">{transfer.exchange_rate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Frais</p>
                        <p className="font-medium">{transfer.fees} {transfer.from_currency}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold">{transfer.total_amount} {transfer.from_currency}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Méthode</p>
                        <p className="font-medium capitalize">{transfer.transfer_method}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Info (only for send) */}
                  {transfer.transfer_type === 'send' && transfer.recipients && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Send className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">Informations Bénéficiaire</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Nom</p>
                            <p className="font-medium">{transfer.recipients.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Téléphone</p>
                            <p className="font-medium">{transfer.recipients.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pays</p>
                            <p className="font-medium">{transfer.recipients.country}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Numéro de transfert</p>
                            <p className="font-medium">{transfer.recipients.transfer_number}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notes */}
                  {transfer.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Note du client</p>
                        <p className="text-sm bg-muted p-2 rounded">{transfer.notes}</p>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <Separator />
                  <div className="flex flex-wrap gap-2">
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
                      Voir tout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Proof Verification Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vérifier la preuve de paiement</DialogTitle>
          </DialogHeader>
          {selectedTransfer?.proof_image_url && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={selectedTransfer.proof_image_url}
                  alt="Preuve"
                  className="w-full rounded-lg border"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => window.open(selectedTransfer.proof_image_url!, '_blank')}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Télécharger
                </Button>
              </div>
              <Textarea
                placeholder="Commentaire admin (optionnel)..."
                value={proofComment}
                onChange={(e) => setProofComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => verifyProof(selectedTransfer.id, true)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approuver la preuve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => verifyProof(selectedTransfer.id, false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeter la preuve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Details Dialog */}
      <Dialog open={!!selectedTransfer && !showProofDialog} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails complets du transfert</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              {/* All transfer info in detail */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Référence</span>
                  <p className="font-semibold text-lg">{selectedTransfer.reference_number}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge className={getStatusColor(selectedTransfer.status)}>
                    {getStatusText(selectedTransfer.status)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Client</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Nom complet</span>
                    <p className="font-medium">
                      {selectedTransfer.profiles.first_name} {selectedTransfer.profiles.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Email</span>
                    <p className="font-medium">{selectedTransfer.profiles.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Téléphone</span>
                    <p className="font-medium">{selectedTransfer.profiles.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Pays</span>
                    <p className="font-medium">{selectedTransfer.profiles.country || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedTransfer.recipients && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Bénéficiaire</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Nom</span>
                        <p className="font-medium">{selectedTransfer.recipients.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Téléphone</span>
                        <p className="font-medium">{selectedTransfer.recipients.phone}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Pays</span>
                        <p className="font-medium">{selectedTransfer.recipients.country}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Numéro de transfert</span>
                        <p className="font-medium">{selectedTransfer.recipients.transfer_number}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Transaction</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge className={getTransferTypeColor(selectedTransfer.transfer_type)}>
                      {getTransferTypeText(selectedTransfer.transfer_type)}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Méthode</span>
                    <p className="font-medium capitalize">{selectedTransfer.transfer_method}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Date création</span>
                    <p className="font-medium">
                      {format(new Date(selectedTransfer.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {selectedTransfer.completed_at && (
                    <div>
                      <span className="text-sm text-muted-foreground">Date finalisation</span>
                      <p className="font-medium">
                        {format(new Date(selectedTransfer.completed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTransfer.proof_image_url && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Preuve de paiement</h3>
                    <img
                      src={selectedTransfer.proof_image_url}
                      alt="Preuve"
                      className="w-full rounded-lg border cursor-pointer"
                      onClick={() => window.open(selectedTransfer.proof_image_url!, '_blank')}
                    />
                    {selectedTransfer.proof_verified !== null && (
                      <Badge className={selectedTransfer.proof_verified ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                        {selectedTransfer.proof_verified ? '✓ Preuve vérifiée' : '✗ Preuve rejetée'}
                      </Badge>
                    )}
                    {selectedTransfer.proof_admin_comment && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Commentaire admin</p>
                        <p className="text-sm bg-muted p-2 rounded">{selectedTransfer.proof_admin_comment}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Notes administrateur</h3>
                <Textarea
                  placeholder="Ajouter des notes internes..."
                  value={adminNotes || selectedTransfer.admin_notes || ''}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
                <Button
                  className="mt-2"
                  onClick={() => saveAdminNotes(selectedTransfer.id)}
                  disabled={actionLoading}
                >
                  Enregistrer les notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTransfers;
