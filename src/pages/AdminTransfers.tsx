import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, MessageSquare, Image as ImageIcon, Check, X, Send, AlertCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TransferChat from "@/components/TransferChat";

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  status: string;
  transfer_method: string;
  transfer_type: string;
  created_at: string;
  proof_image_url: string | null;
  proof_verified: boolean | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  recipient_name: string | null;
  recipient_number: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
  has_unvalidated_proof: boolean;
}

const AdminTransfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("action_needed");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [proofComment, setProofComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTransfers();

    const transfersChannel = supabase
      .channel('admin-transfers-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => loadTransfers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadTransfers())
      .subscribe();

    return () => {
      supabase.removeChannel(transfersChannel);
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
        setLoading(false);
        return;
      }

      // Load profiles
      const userIds = [...new Set(transfersData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Load recipients
      const recipientIds = transfersData.map(t => t.recipient_id).filter(Boolean);
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, transfer_number')
        .in('id', recipientIds);
      const recipientMap = new Map((recipients || []).map(r => [r.id, r]));

      // Load messages stats for each transfer
      const enrichedTransfers = await Promise.all(
        transfersData.map(async (transfer) => {
          const profile = profileMap.get(transfer.user_id);
          const recipient = transfer.recipient_id ? recipientMap.get(transfer.recipient_id) : null;

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message, created_at')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count (messages from user not read by admin)
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('transfer_id', transfer.id)
            .eq('is_admin', false)
            .eq('read', false);

          return {
            id: transfer.id,
            reference_number: transfer.reference_number,
            amount: transfer.amount,
            from_currency: transfer.from_currency,
            to_currency: transfer.to_currency,
            converted_amount: transfer.converted_amount,
            status: transfer.status,
            transfer_method: transfer.transfer_method,
            transfer_type: transfer.transfer_type,
            created_at: transfer.created_at,
            proof_image_url: transfer.proof_image_url,
            proof_verified: transfer.proof_verified,
            client_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'N/A',
            client_email: profile?.email || 'N/A',
            client_phone: profile?.phone || 'N/A',
            recipient_name: recipient?.name || null,
            recipient_number: recipient?.transfer_number || null,
            last_message: lastMsg?.message || null,
            last_message_time: lastMsg?.created_at || null,
            unread_count: unreadCount || 0,
            has_unvalidated_proof: !!transfer.proof_image_url && transfer.proof_verified === null,
          };
        })
      );

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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.client_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === "action_needed") {
      filtered = filtered.filter(t => 
        t.has_unvalidated_proof || 
        t.status === 'pending' || 
        t.status === 'awaiting_admin'
      );
    } else if (statusFilter === "in_progress") {
      filtered = filtered.filter(t => t.status === 'approved');
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(t => t.status === 'completed' || t.status === 'rejected');
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
      setSelectedTransfer(null);
      loadTransfers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidateProof = async (verified: boolean) => {
    if (!selectedTransfer) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transfers')
        .update({
          proof_verified: verified,
          proof_verified_at: new Date().toISOString(),
          proof_admin_comment: proofComment || null,
          status: verified ? 'approved' : 'pending'
        })
        .eq('id', selectedTransfer.id);

      if (error) throw error;
      toast.success(verified ? "Preuve validée ✓" : "Preuve rejetée");
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
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'awaiting_admin': return 'bg-info/10 text-info border-info/20';
      case 'approved': return 'bg-success/10 text-success border-success/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
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
    <div className="space-y-4 pb-20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">À valider</p>
                <p className="text-2xl font-bold text-warning">
                  {transfers.filter(t => t.has_unvalidated_proof || t.status === 'pending' || t.status === 'awaiting_admin').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold text-info">
                  {transfers.filter(t => t.status === 'approved').length}
                </p>
              </div>
              <Send className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Terminés</p>
                <p className="text-2xl font-bold text-success">
                  {transfers.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <Check className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action_needed">À valider ({transfers.filter(t => t.has_unvalidated_proof || t.status === 'pending' || t.status === 'awaiting_admin').length})</SelectItem>
                <SelectItem value="in_progress">En cours ({transfers.filter(t => t.status === 'approved').length})</SelectItem>
                <SelectItem value="completed">Terminés ({transfers.filter(t => t.status === 'completed' || t.status === 'rejected').length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun transfert à afficher</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((transfer) => (
            <Card key={transfer.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base md:text-lg">{transfer.reference_number}</CardTitle>
                      <Badge className={getStatusColor(transfer.status)}>
                        {getStatusText(transfer.status)}
                      </Badge>
                      <Badge variant={transfer.transfer_type === 'send' ? 'default' : 'secondary'}>
                        {transfer.transfer_type === 'send' ? '📤 Envoi' : '📥 Retrait'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transfer.created_at), 'dd/MM/yyyy • HH:mm', { locale: fr })}
                    </p>
                  </div>
                  
                  {/* Notification badges */}
                  <div className="flex gap-2">
                    {transfer.has_unvalidated_proof && (
                      <Badge variant="destructive" className="animate-pulse">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Preuve
                      </Badge>
                    )}
                    {transfer.unread_count > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {transfer.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Compact info grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Client</p>
                    <p className="font-semibold">{transfer.client_name}</p>
                    <p className="text-xs text-muted-foreground">{transfer.client_email}</p>
                    <p className="text-xs text-muted-foreground">{transfer.client_phone}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Montant</p>
                    <p className="font-bold text-lg">{transfer.amount} {transfer.from_currency}</p>
                    <p className="text-xs text-success">→ {transfer.converted_amount} {transfer.to_currency}</p>
                    <p className="text-xs text-muted-foreground capitalize">{transfer.transfer_method}</p>
                  </div>

                  {transfer.transfer_type === 'send' && transfer.recipient_name && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Bénéficiaire</p>
                      <p className="font-semibold">{transfer.recipient_name}</p>
                      <p className="text-xs text-muted-foreground">{transfer.recipient_number}</p>
                    </div>
                  )}
                </div>

                {/* Last message preview */}
                {transfer.last_message && (
                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <p className="text-muted-foreground">Dernier message:</p>
                    <p className="truncate">{transfer.last_message}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {transfer.proof_image_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setShowProofDialog(true);
                      }}
                      className={transfer.has_unvalidated_proof ? "border-destructive text-destructive" : ""}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir preuve
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTransfer(transfer);
                      setShowChatDialog(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Chat
                  </Button>

                  {(transfer.status === 'approved' || transfer.status === 'awaiting_admin') && (
                    <Button
                      size="sm"
                      onClick={() => updateTransferStatus(transfer.id, 'completed')}
                      disabled={actionLoading}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                  )}

                  {transfer.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateTransferStatus(transfer.id, 'rejected')}
                      variant="destructive"
                      disabled={actionLoading}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proof Dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validation de la preuve - {selectedTransfer?.reference_number}</DialogTitle>
          </DialogHeader>
          
          {selectedTransfer?.proof_image_url && (
            <div className="space-y-4">
              <img 
                src={selectedTransfer.proof_image_url} 
                alt="Preuve de paiement" 
                className="w-full rounded-lg border"
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Commentaire (optionnel)</label>
                <Textarea
                  value={proofComment}
                  onChange={(e) => setProofComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleValidateProof(true)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Valider la preuve
                </Button>
                <Button
                  onClick={() => handleValidateProof(false)}
                  variant="destructive"
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

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-2xl h-[80vh] p-0">
          {selectedTransfer && (
            <TransferChat 
              transferId={selectedTransfer.id} 
              onClose={() => setShowChatDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTransfers;
