import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  currencyFilter: string;
  setCurrencyFilter: (value: string) => void;
  methodFilter: string;
  setMethodFilter: (value: string) => void;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  activeFiltersCount: number;
}

const AdminFilters = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  currencyFilter,
  setCurrencyFilter,
  methodFilter,
  setMethodFilter,
  dateFilter,
  setDateFilter,
  onRefresh,
  onExport,
  activeFiltersCount
}: AdminFiltersProps) => {
  return (
    <div className="bg-card p-4 rounded-lg shadow mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Recherche */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher par référence, client, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="awaiting_admin">En attente admin</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Devise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes devises</SelectItem>
              <SelectItem value="MAD">MAD → CFA</SelectItem>
              <SelectItem value="CFA">CFA → MAD</SelectItem>
            </SelectContent>
          </Select>

          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Méthode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes méthodes</SelectItem>
              <SelectItem value="bank">Virement bancaire</SelectItem>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes périodes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="urgent">Urgents (&gt;24h)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={onRefresh} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onExport} title="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activeFiltersCount} filtre(s) actif(s)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setCurrencyFilter('all');
              setMethodFilter('all');
              setDateFilter('all');
              setSearchQuery('');
            }}
          >
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminFilters;
