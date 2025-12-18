import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, Upload, MessageSquare, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import UploadProofDialog from '@/components/UploadProofDialog';
import AnimatedElement from '@/components/AnimatedElement';
import { AnimatedList, AnimatedItem } from '@/components/AnimatedList';

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
  created_at: string;
  proof_verified?: boolean | null;
  proof_image_url?: string | null;
  recipients?: {
    name: string;
    phone: string;
    country: string;
  };
}

const History = () => {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showUploadProof, setShowUploadProof] = useState(false);
  const [selectedProofId, setSelectedProofId] = useState<string>();

  useEffect(() => {
    if (user) loadTransfers();
  }, [user]);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter]);

  const loadTransfers = async () => {
    try {
      const { data } = await supabase
        .from('transfers')
        .select(`*, recipients (name, phone, country)`)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (data) {
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.recipients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTransfers(filtered);
  };

  const getStatusInfo = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
      awaiting_admin: { label: 'En traitement', color: 'bg-blue-100 text-blue-700' },
      approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
      completed: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
      cancelled: { label: 'Annulé', color: 'bg-slate-100 text-slate-700' }
    };
    return statuses[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
  };

  const getTransferType = (t: Transfer) => t.from_currency === 'MAD' ? 'Envoi' : 'Retrait';

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency === 'CFA' ? 'F' : currency);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="hidden md:block"><Navbar /></div>
      
      <div className="container mx-auto px-4 py-6 max-w-lg md:max-w-4xl">
        {/* Header */}
        <AnimatedElement delay={0} direction="down">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Historique</h1>
            <p className="text-slate-500 text-sm">Vos transferts d'argent</p>
          </div>
        </AnimatedElement>

        {/* Filters */}
        <AnimatedElement delay={1}>
          <Card className="p-4 mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="awaiting_admin">En traitement</SelectItem>
                  <SelectItem value="completed">Terminés</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || statusFilter !== 'all') && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">{filteredTransfers.length} résultat(s)</span>
                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                  <X className="w-4 h-4 mr-1" /> Réinitialiser
                </Button>
              </div>
            )}
          </Card>
        </AnimatedElement>

        {/* Transfers List */}
        {filteredTransfers.length > 0 ? (
          <AnimatedList className="space-y-3">
            {filteredTransfers.map((transfer) => {
              const statusInfo = getStatusInfo(transfer.status);
              const isEnvoi = transfer.from_currency === 'MAD';
              
              return (
                <AnimatedItem key={transfer.id}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isEnvoi ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {isEnvoi ? (
                          <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{getTransferType(transfer)}</p>
                            <p className="text-xs text-slate-500">{transfer.reference_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(transfer.created_at)}</p>
                          </div>
                        </div>

                        {transfer.recipients && (
                          <p className="text-sm text-slate-600 mb-2">
                            → {transfer.recipients.name} ({transfer.recipients.country})
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge className={`${statusInfo.color} border-0`}>
                            {statusInfo.label}
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedTransfer(transfer)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {!transfer.proof_image_url && ['pending', 'awaiting_admin'].includes(transfer.status) && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedProofId(transfer.id);
                                  setShowUploadProof(true);
                                }}
                              >
                                <Upload className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openChat(transfer.id)}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        ) : (
          <AnimatedElement delay={2}>
            <Card className="p-8 text-center">
              <p className="text-slate-500">Aucun transfert trouvé</p>
            </Card>
          </AnimatedElement>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
          </DialogHeader>
          
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-500">Montant reçu</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(selectedTransfer.converted_amount, selectedTransfer.to_currency)}
                  </p>
                </div>
                
                <Badge className={`${getStatusInfo(selectedTransfer.status).color} border-0 w-full justify-center py-2`}>
                  {getStatusInfo(selectedTransfer.status).label}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Référence</span>
                  <span className="font-mono font-medium">{selectedTransfer.reference_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium">{getTransferType(selectedTransfer)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Montant envoyé</span>
                  <span className="font-medium">{formatCurrency(selectedTransfer.amount, selectedTransfer.from_currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Frais</span>
                  <span className="font-medium">{formatCurrency(selectedTransfer.fees || 0, selectedTransfer.from_currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Total payé</span>
                  <span className="font-medium">{formatCurrency(selectedTransfer.total_amount, selectedTransfer.from_currency)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Méthode</span>
                  <span className="font-medium capitalize">{selectedTransfer.transfer_method.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium">{formatDate(selectedTransfer.created_at)}</span>
                </div>
                
                {selectedTransfer.recipients && (
                  <div className="py-2">
                    <p className="text-slate-500 mb-1">Bénéficiaire</p>
                    <p className="font-medium">{selectedTransfer.recipients.name}</p>
                    <p className="text-slate-600">{selectedTransfer.recipients.phone}</p>
                    <p className="text-slate-600">{selectedTransfer.recipients.country}</p>
                  </div>
                )}

                {selectedTransfer.proof_image_url && (
                  <div className="py-2">
                    <p className="text-slate-500 mb-2">Preuve de paiement</p>
                    <img 
                      src={selectedTransfer.proof_image_url} 
                      alt="Preuve" 
                      className="rounded-lg max-h-48 object-cover w-full"
                    />
                    {selectedTransfer.proof_verified !== null && (
                      <Badge className={`mt-2 ${selectedTransfer.proof_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0`}>
                        {selectedTransfer.proof_verified ? 'Vérifiée' : 'Rejetée'}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => openChat(selectedTransfer.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
                {!selectedTransfer.proof_image_url && ['pending', 'awaiting_admin'].includes(selectedTransfer.status) && (
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setSelectedProofId(selectedTransfer.id);
                      setShowUploadProof(true);
                      setSelectedTransfer(null);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Envoyer preuve
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UploadProofDialog 
        open={showUploadProof} 
        onOpenChange={setShowUploadProof}
        preselectedTransferId={selectedProofId}
        onSuccess={loadTransfers}
      />

      <BottomNavigation />
    </div>
  );
};

export default History;
