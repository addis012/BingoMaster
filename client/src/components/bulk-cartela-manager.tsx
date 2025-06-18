import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye } from 'lucide-react';

interface BulkCartelaManagerProps {
  shopId: number;
  adminId: number;
}

interface CustomCartela {
  id: number;
  name: string;
  cartelaNumber: number;
  pattern: number[][];
  shopId: number;
  adminId: number;
  createdAt: string;
}

export function BulkCartelaManager({ shopId, adminId }: BulkCartelaManagerProps) {
  const [cardsData, setCardsData] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewCartela, setPreviewCartela] = useState<CustomCartela | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing custom cartelas
  const { data: customCartelas } = useQuery({
    queryKey: [`/api/custom-cartelas/${shopId}`],
    enabled: !!shopId,
  });

  const createCartelaMutation = useMutation({
    mutationFn: async (cartela: any) => {
      const response = await fetch('/api/custom-cartelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartela),
      });
      if (!response.ok) throw new Error('Failed to create cartela');
      return response.json();
    },
  });

  const handleSave = async () => {
    if (!cardsData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter cartela data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get fresh cartelas data
      const cartelasResponse = await fetch(`/api/custom-cartelas/${shopId}`);
      const latestCartelas = cartelasResponse.ok ? await cartelasResponse.json() : [];

      const lines = cardsData.trim().split('\n').filter(line => line.trim());
      let successCount = 0;
      let errorCount = 0;
      let updateCount = 0;
      let createCount = 0;
      const errors: string[] = [];
      const processedNumbers = new Set<number>();

      for (const line of lines) {
        try {
          const [cardNumStr, numbersStr] = line.split(':');
          
          if (!cardNumStr || !numbersStr) {
            errors.push(`Invalid format: ${line}`);
            errorCount++;
            continue;
          }

          const cardNumber = parseInt(cardNumStr.trim());
          
          if (isNaN(cardNumber) || cardNumber <= 0) {
            errors.push(`Invalid cartela number: ${cardNumStr}`);
            errorCount++;
            continue;
          }

          // Check for duplicates in this batch
          if (processedNumbers.has(cardNumber)) {
            errors.push(`Duplicate cartela number ${cardNumber} in input`);
            errorCount++;
            continue;
          }
          processedNumbers.add(cardNumber);

          const numbers = numbersStr.split(',').map(n => {
            const num = n.trim().toLowerCase();
            if (num === 'free') return 0;
            const parsed = parseInt(num);
            if (isNaN(parsed)) throw new Error(`Invalid number: ${n}`);
            return parsed;
          });

          if (numbers.length !== 25) {
            errors.push(`Cartela ${cardNumber}: Must have exactly 25 numbers, got ${numbers.length}`);
            errorCount++;
            continue;
          }

          // Validate numbers are within range
          const invalidNumbers = numbers.filter(num => num !== 0 && (num < 1 || num > 75));
          if (invalidNumbers.length > 0) {
            errors.push(`Cartela ${cardNumber}: Invalid numbers ${invalidNumbers.join(', ')} (must be 1-75)`);
            errorCount++;
            continue;
          }

          // Convert to 5x5 pattern
          const pattern: number[][] = [];
          for (let i = 0; i < 5; i++) {
            pattern.push(numbers.slice(i * 5, (i + 1) * 5));
          }

          // Check if cartela already exists
          const existingCustom = latestCartelas.find((c: any) => c.cartelaNumber === cardNumber);
          
          if (existingCustom) {
            // UPDATE existing cartela
            console.log(`UPDATING existing cartela ${cardNumber} (ID: ${existingCustom.id})`);
            const response = await fetch(`/api/custom-cartelas/${existingCustom.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `Custom Card ${cardNumber}`,
                pattern,
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to update cartela ${cardNumber}: ${errorText}`);
            }
            
            updateCount++;
          } else {
            // CREATE new cartela
            console.log(`CREATING new cartela ${cardNumber}`);
            await createCartelaMutation.mutateAsync({
              name: `Custom Card ${cardNumber}`,
              cartelaNumber: cardNumber,
              pattern,
              shopId,
              adminId,
            });
            
            createCount++;
          }

          successCount++;
        } catch (error) {
          console.error("Processing error:", error);
          errors.push(`Cartela ${line.split(':')[0]}: ${error}`);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        await queryClient.invalidateQueries({ queryKey: [`/api/custom-cartelas/${shopId}`] });
        
        toast({
          title: "Cartela Processing Complete",
          description: `${createCount} created, ${updateCount} updated${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
        });
        setCardsData('');
      }
      
      if (errors.length > 0) {
        toast({
          title: "Some cartelas failed",
          description: `${errorCount} cartelas had errors. Check format and try again.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save cartelas",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Cartela Manager</CardTitle>
        <p className="text-sm text-gray-600">
          Add or update multiple cartelas at once. Format: CardNumber: num1,num2,...,num25
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Cartela Data (one per line)
          </label>
          <Textarea
            value={cardsData}
            onChange={(e) => setCardsData(e.target.value)}
            placeholder={`1: 1,16,31,46,61,2,17,32,47,62,3,18,free,48,63,4,19,33,49,64,5,20,34,50,65
2: 6,21,36,51,66,7,22,37,52,67,8,23,free,53,68,9,24,38,54,69,10,25,39,55,70`}
            className="min-h-[200px] font-mono text-sm"
          />
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <div>Current custom cartelas: {customCartelas?.length || 0}</div>
            <div>Re-entering same cartela number will UPDATE existing cartela</div>
          </div>

          {/* Existing Cartelas Preview */}
          {customCartelas && customCartelas.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Existing Custom Cartelas:</h4>
              <div className="grid grid-cols-8 gap-2">
                {customCartelas.map((cartela: CustomCartela) => (
                  <div key={cartela.id} className="text-center">
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-sm font-medium text-green-800">
                      #{cartela.cartelaNumber}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs mt-1 p-0 h-auto"
                      onClick={() => {
                        setPreviewCartela(cartela);
                        setShowPreview(true);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={handleSave}
          disabled={!cardsData.trim() || createCartelaMutation.isPending}
          className="w-full"
        >
          {createCartelaMutation.isPending ? 'Processing...' : 'Save Cartelas'}
        </Button>
      </CardContent>

      {/* Cartela Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cartela #{previewCartela?.cartelaNumber} Preview</DialogTitle>
            <DialogDescription>
              Custom cartela pattern - {previewCartela?.name}
            </DialogDescription>
          </DialogHeader>
          {previewCartela && (
            <div className="space-y-4">
              {/* BINGO Headers */}
              <div className="grid grid-cols-5 gap-1">
                {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                  return (
                    <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-sm`}>
                      {letter}
                    </div>
                  );
                })}
              </div>
              
              {/* Custom Cartela Grid */}
              <div className="grid grid-cols-5 gap-1">
                {previewCartela.pattern.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="h-8 bg-green-50 border border-green-200 rounded flex items-center justify-center text-xs font-medium text-green-800"
                    >
                      {rowIndex === 2 && colIndex === 2 ? "★" : cell}
                    </div>
                  ))
                )}
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Created: {new Date(previewCartela.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}