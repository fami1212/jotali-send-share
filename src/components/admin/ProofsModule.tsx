import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  Download,
  MessageSquare,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Proof {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  proof_image_url: string;
  proof_verified?: boolean | null;
  proof_admin_comment?: string | null;
  created_at: string;
  client_name: string;
  client_email: string;
}

interface ProofsModuleProps {
  proofs: Proof[];
  loading: boolean;
  onRefresh: () => void;
}

const ProofsModule = ({ proofs, loading, onRefresh }: ProofsModuleProps) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [validateOpen, setValidateOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);

  const filteredProofs = proofs.filter(p => {
    const matchesSearch = 
      p.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'pending') return matchesSearch && p.proof_verified === null;
    if (filter === 'verified') return matchesSearch && p.proof_verified === true;
    if (filter === 'rejected') return matchesSearch && p.proof_verified === false;
    
    return matchesSearch;
  });

  const getProofBadge = (verified: boolean | null) => {
    if (verified === null) return <Badge variant="secondary">En attente</Badge>;
    if (verified === true) return <Badge className="bg-green-100 text-green-800">Validée</Badge>;
    return <Badge variant="destructive">Rejetée</Badge>;
  };

  const viewProof = async (proof: Proof) => {
    try {
      const { data } = await supabase.storage
        .from('transfer-proofs')
        .createSignedUrl(proof.proof_image_url, 300);

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
        setSelectedProof(proof);
        setImageOpen(true);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'image');
    }
  };

  const downloadProof = async (proof: Proof) => {
    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .download(proof.proof_image_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preuve-${proof.reference_number}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const openValidateDialog = (proof: Proof) => {
    setSelectedProof(proof);
    setComment('');
    setValidateOpen(true);
  };

  const validateProof = async (isValid: boolean) => {
    if (!selectedProof) return;
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const updates: any = {
        proof_verified: isValid,
        proof_verified_at: new Date().toISOString(),
        proof_verified_by: user.id,
      };

      if (comment) {
        updates.proof_admin_comment = comment;
      }

      if (isValid) {
        updates.status = 'approved';
      }

      const { error } = await supabase
        .from('transfers')
        .update(updates)
        .eq('id', selectedProof.id);

      if (error) throw error;

      // Add comment to proof_comments table
      if (comment) {
        await supabase.from('proof_comments').insert({
          transfer_id: selectedProof.id,
          user_id: user.id,
          comment,
          is_admin: true,
        });
      }

      toast.success(isValid ? 'Preuve validée' : 'Preuve rejetée');
      setValidateOpen(false);
      setComment('');
      onRefresh();
    } catch (error) {
      toast.error('Erreur lors de la validation');
    } finally {
      setUpdating(false);
    }
  };

  const stats = {
    pending: proofs.filter(p => p.proof_verified === null).length,
    verified: proofs.filter(p => p.proof_verified === true).length,
    rejected: proofs.filter(p => p.proof_verified === false).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">En attente</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          <div className="text-xs text-muted-foreground">Validées</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-muted-foreground">Rejetées</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence, nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filtre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="verified">Validées</SelectItem>
            <SelectItem value="rejected">Rejetées</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Proofs List */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
          {loading ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredProofs.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">Aucune preuve trouvée</div>
          ) : (
            filteredProofs.map((proof) => (
              <Card key={proof.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm text-muted-foreground">{proof.reference_number}</div>
                      <div className="font-medium">{proof.client_name}</div>
                    </div>
                    {getProofBadge(proof.proof_verified)}
                  </div>

                  {/* Amount */}
                  <div className="text-sm">
                    <span className="font-bold">{proof.amount.toLocaleString()} {proof.from_currency}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-bold text-primary">{proof.to_currency}</span>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(proof.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </div>

                  {/* Comment */}
                  {proof.proof_admin_comment && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <span className="text-muted-foreground">Commentaire: </span>
                      {proof.proof_admin_comment}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={() => viewProof(proof)}>
                      <Eye className="w-4 h-4 mr-1" />Voir
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadProof(proof)}>
                      <Download className="w-4 h-4 mr-1" />Télécharger
                    </Button>
                    {proof.proof_verified === null && (
                      <Button size="sm" onClick={() => openValidateDialog(proof)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Valider
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Image Dialog */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preuve de paiement - {selectedProof?.reference_number}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="Preuve" className="max-h-[70vh] object-contain rounded-lg" />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={validateOpen} onOpenChange={setValidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la preuve</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <strong>Référence:</strong> {selectedProof?.reference_number}<br />
              <strong>Client:</strong> {selectedProof?.client_name}
            </div>
            <Textarea
              placeholder="Commentaire (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setValidateOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => validateProof(false)} disabled={updating} className="w-full sm:w-auto">
              <XCircle className="w-4 h-4 mr-1" />Rejeter
            </Button>
            <Button onClick={() => validateProof(true)} disabled={updating} className="w-full sm:w-auto">
              <CheckCircle className="w-4 h-4 mr-1" />Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProofsModule;
