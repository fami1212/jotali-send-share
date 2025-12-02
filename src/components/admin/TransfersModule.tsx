import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  User,
  Send,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import TransferChat from '@/components/TransferChat';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  converted_amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  transfer_type: string;
  transfer_method: string;
  created_at: string;
  user_id: string;
  proof_image_url?: string | null;
  proof_verified?: boolean | null;
  admin_notes?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  recipient_name?: string;
  recipient_number?: string;
  recipient_country?: string;
  unread_count: number;
  last_message?: string;
}

interface TransfersModuleProps {
  transfers: Transfer[];
  loading: boolean;
  onRefresh: () => void;
}

const TransfersModule = ({ transfers, loading, onRefresh }: TransfersModuleProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [sendNumberOpen, setSendNumberOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = 
      t.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      t.client_name.toLowerCase().includes(search.toLowerCase()) ||
      t.client_email.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      awaiting_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      awaiting_admin: 'À valider',
      approved: 'Approuvé',
      completed: 'Terminé',
      rejected: 'Rejeté',
      cancelled: 'Annulé',
    };
    return (
      <Badge className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const updateStatus = async () => {
    if (!selectedTransfer || !newStatus) return;
    setUpdating(true);
    
    try {
      const updates: any = { status: newStatus };
      if (adminNotes) updates.admin_notes = adminNotes;
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('transfers')
        .update(updates)
        .eq('id', selectedTransfer.id);

      if (error) throw error;

      toast.success('Statut mis à jour');
      setStatusDialogOpen(false);
      setNewStatus('');
      setAdminNotes('');
      onRefresh();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const sendWaveNumber = async () => {
    if (!selectedTransfer || !waveNumber.trim()) return;
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const message = `✅ Votre transfert est prêt!\n\nNuméro ${selectedTransfer.transfer_method}: ${waveNumber}\n\nMontant: ${selectedTransfer.converted_amount.toLocaleString()} ${selectedTransfer.to_currency}`;

      await supabase.from('messages').insert({
        transfer_id: selectedTransfer.id,
        sender_id: user.id,
        message,
        is_admin: true,
      });

      await supabase.from('transfers').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', selectedTransfer.id);

      toast.success('Numéro envoyé et transfert complété');
      setSendNumberOpen(false);
      setWaveNumber('');
      onRefresh();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setUpdating(false);
    }
  };

  const stats = {
    pending: transfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length,
    inProgress: transfers.filter(t => t.status === 'approved').length,
    completed: transfers.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">À traiter</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-muted-foreground">En cours</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Terminés</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence, nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="awaiting_admin">À valider</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Transfers List */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-3 pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun transfert trouvé</div>
          ) : (
            filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={transfer.transfer_type === 'send' ? 'default' : 'secondary'}>
                        {transfer.transfer_type === 'send' ? (
                          <><ArrowUpRight className="w-3 h-3 mr-1" />Envoi</>
                        ) : (
                          <><ArrowDownLeft className="w-3 h-3 mr-1" />Retrait</>
                        )}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">{transfer.reference_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(transfer.status)}
                      {transfer.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {transfer.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{transfer.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{transfer.client_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{transfer.client_phone || 'Non renseigné'}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                    <div className="text-center">
                      <div className="text-lg font-bold">{transfer.amount.toLocaleString()} {transfer.from_currency}</div>
                      <div className="text-xs text-muted-foreground">Envoyé</div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{transfer.converted_amount.toLocaleString()} {transfer.to_currency}</div>
                      <div className="text-xs text-muted-foreground">Reçu</div>
                    </div>
                  </div>

                  {/* Recipient */}
                  {transfer.recipient_name && (
                    <div className="text-sm bg-accent/50 rounded-lg p-2">
                      <div className="font-medium">Bénéficiaire: {transfer.recipient_name}</div>
                      <div className="text-muted-foreground">N°: {transfer.recipient_number || 'N/A'} • {transfer.recipient_country}</div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setDetailsOpen(true); }}>
                      <Eye className="w-4 h-4 mr-1" />Détails
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setChatOpen(true); }}>
                      <MessageSquare className="w-4 h-4 mr-1" />Chat
                      {transfer.unread_count > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1">{transfer.unread_count}</Badge>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setNewStatus(transfer.status); setStatusDialogOpen(true); }}>
                      <Clock className="w-4 h-4 mr-1" />Statut
                    </Button>
                    {(transfer.status === 'approved' || transfer.status === 'awaiting_admin') && (
                      <Button size="sm" onClick={() => { setSelectedTransfer(transfer); setSendNumberOpen(true); }}>
                        <Send className="w-4 h-4 mr-1" />Envoyer N°
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Référence</div>
                  <div className="font-medium">{selectedTransfer.reference_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Statut</div>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="font-medium">{selectedTransfer.transfer_type === 'send' ? 'Envoi' : 'Retrait'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Méthode</div>
                  <div className="font-medium capitalize">{selectedTransfer.transfer_method}</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium mb-2">Client</div>
                <div className="text-sm space-y-1">
                  <div><strong>Nom:</strong> {selectedTransfer.client_name}</div>
                  <div><strong>Email:</strong> {selectedTransfer.client_email}</div>
                  <div><strong>Téléphone:</strong> {selectedTransfer.client_phone || 'Non renseigné'}</div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="text-sm font-medium mb-2">Montants</div>
                <div className="text-sm space-y-1">
                  <div><strong>Envoyé:</strong> {selectedTransfer.amount.toLocaleString()} {selectedTransfer.from_currency}</div>
                  <div><strong>Reçu:</strong> {selectedTransfer.converted_amount.toLocaleString()} {selectedTransfer.to_currency}</div>
                </div>
              </div>

              {selectedTransfer.recipient_name && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium mb-2">Bénéficiaire</div>
                    <div className="text-sm space-y-1">
                      <div><strong>Nom:</strong> {selectedTransfer.recipient_name}</div>
                      <div><strong>Numéro:</strong> {selectedTransfer.recipient_number || 'N/A'}</div>
                      <div><strong>Pays:</strong> {selectedTransfer.recipient_country}</div>
                    </div>
                  </div>
                </>
              )}

              {selectedTransfer.admin_notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium mb-2">Notes admin</div>
                    <div className="text-sm text-muted-foreground">{selectedTransfer.admin_notes}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
          {selectedTransfer && (
            <TransferChat 
              transferId={selectedTransfer.id} 
              isAdmin={true}
              onClose={() => setChatOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Nouveau statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="awaiting_admin">À valider</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes (optionnel)"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Annuler</Button>
            <Button onClick={updateStatus} disabled={updating}>
              {updating ? 'Mise à jour...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Number Dialog */}
      <Dialog open={sendNumberOpen} onOpenChange={setSendNumberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le numéro {selectedTransfer?.transfer_method}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={`Numéro ${selectedTransfer?.transfer_method || 'Wave/OM'}`}
              value={waveNumber}
              onChange={(e) => setWaveNumber(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Le numéro sera envoyé au client et le transfert sera marqué comme complété.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendNumberOpen(false)}>Annuler</Button>
            <Button onClick={sendWaveNumber} disabled={updating || !waveNumber.trim()}>
              {updating ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransfersModule;
