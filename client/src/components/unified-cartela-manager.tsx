import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit3, Trash2, Plus, Upload, Download, Search, Grid3X3, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Cartela {
  id: number;
  cartelaNumber: number;
  shopId: number;
  adminId: number;
  name: string;
  numbers: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UnifiedCartelaManagerProps {
  shopId: number;
  adminId: number;
}

export function UnifiedCartelaManager({ shopId, adminId }: UnifiedCartelaManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCartela, setEditingCartela] = useState<Cartela | null>(null);
  const [bulkData, setBulkData] = useState('');
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cartelas
  const { data: cartelas = [], isLoading } = useQuery({
    queryKey: ['/api/cartelas', shopId],
    queryFn: async () => {
      const response = await fetch(`/api/cartelas/${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch cartelas');
      return response.json();
    }
  });

  // Create cartela mutation
  const createMutation = useMutation({
    mutationFn: async (cartelaData: any) => {
      const response = await fetch('/api/cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartelaData)
      });
      if (!response.ok) throw new Error('Failed to create cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', shopId] });
      toast({ title: 'Success', description: 'Cartela created successfully' });
    }
  });

  // Update cartela mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/cartelas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', shopId] });
      toast({ title: 'Success', description: 'Cartela updated successfully' });
      setEditingCartela(null);
    }
  });

  // Delete cartela mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cartelas/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', shopId] });
      toast({ title: 'Success', description: 'Cartela deleted successfully' });
    }
  });

  // Bulk upsert mutation
  const bulkUpsertMutation = useMutation({
    mutationFn: async (cartelasData: string) => {
      const response = await fetch('/api/cartelas/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, adminId, cartelas: cartelasData })
      });
      if (!response.ok) throw new Error('Failed to bulk upsert cartelas');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', shopId] });
      toast({
        title: 'Bulk Update Complete',
        description: `Updated: ${result.updated}, Added: ${result.added}, Skipped: ${result.skipped}`
      });
      setBulkData('');
    }
  });

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cartelas/migrate-fixed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, adminId })
      });
      if (!response.ok) throw new Error('Failed to migrate fixed cartelas');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', shopId] });
      toast({
        title: 'Migration Complete',
        description: `Migrated: ${result.migrated}, Skipped: ${result.skipped}`
      });
    }
  });

  // Filter cartelas based on search
  const filteredCartelas = cartelas.filter((cartela: Cartela) =>
    cartela.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cartela.cartelaNumber.toString().includes(searchTerm) ||
    cartela.numbers.includes(searchTerm)
  );

  // Parse cartela numbers for display
  const parseCartelaNumbers = (numbersString: string) => {
    return numbersString.split(',').map(n => n.trim());
  };

  // Render cartela grid
  const renderCartelaGrid = (cartela: Cartela) => {
    const numbers = parseCartelaNumbers(cartela.numbers);
    const grid = [];
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const index = row * 5 + col;
        const value = numbers[index] || '';
        const isFree = index === 12 && value.toLowerCase() === 'free';
        
        grid.push(
          <div
            key={`${row}-${col}`}
            className={`h-8 w-8 border flex items-center justify-center text-xs font-medium ${
              isFree
                ? 'bg-green-100 border-green-400 text-green-800'
                : 'bg-white border-gray-300 text-gray-800'
            }`}
          >
            {isFree ? '★' : value}
          </div>
        );
      }
    }
    
    return <div className="grid grid-cols-5 gap-1 w-fit">{grid}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cartela Management</h2>
          <p className="text-gray-600">Manage all cartelas for your shop</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => migrationMutation.mutate()}
            disabled={migrationMutation.isPending}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Migrate Fixed Cartelas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">All Cartelas</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search cartelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredCartelas.length} cartelas
            </Badge>
          </div>

          {/* Cartelas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCartelas.map((cartela: Cartela) => (
              <Card key={cartela.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cartela.name}</CardTitle>
                    <Badge variant="outline">#{cartela.cartelaNumber}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {renderCartelaGrid(cartela)}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedCartela(cartela)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{cartela.name}</DialogTitle>
                            <DialogDescription>
                              Cartela #{cartela.cartelaNumber}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-center py-4">
                            {renderCartelaGrid(cartela)}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCartela(cartela)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Cartela</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {cartela.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(cartela.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Cartela Manager</CardTitle>
              <CardDescription>
                Add or update multiple cartelas at once. Format: CartelaNumber:num1,num2,...,num25
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Example:
1:15,22,37,56,65,2,27,41,52,68,7,17,free,23,65,43,45,65,54,34,56,54,56,76,78
2:5,19,38,51,64,3,24,42,58,69,12,18,free,26,62,4,46,63,55,33,1,53,47,65,71`}
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="flex justify-between">
                <div className="text-sm text-gray-600">
                  Enter one cartela per line. Center position (13th number) must be "free".
                </div>
                <Button
                  onClick={() => bulkUpsertMutation.mutate(bulkData)}
                  disabled={!bulkData.trim() || bulkUpsertMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Process Cartelas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingCartela && (
        <Dialog open={!!editingCartela} onOpenChange={() => setEditingCartela(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {editingCartela.name}</DialogTitle>
              <DialogDescription>
                Update cartela information and numbers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingCartela.name}
                  onChange={(e) => setEditingCartela({
                    ...editingCartela,
                    name: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Numbers (comma-separated, 25 values)</label>
                <Textarea
                  value={editingCartela.numbers}
                  onChange={(e) => setEditingCartela({
                    ...editingCartela,
                    numbers: e.target.value
                  })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCartela(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate({
                    id: editingCartela.id,
                    updates: {
                      name: editingCartela.name,
                      numbers: editingCartela.numbers
                    }
                  })}
                  disabled={updateMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}