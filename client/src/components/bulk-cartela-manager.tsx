import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FIXED_CARTELAS, getCartelaNumbers } from '@/data/fixed-cartelas';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log("BulkCartelaManager rendered with:", { shopId, adminId, cardsData });

  // Fetch existing custom cartelas
  const { data: customCartelas, isLoading } = useQuery({
    queryKey: [`/api/custom-cartelas/${shopId}`],
    queryFn: async () => {
      const response = await fetch(`/api/custom-cartelas/${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch custom cartelas');
      return response.json();
    },
  });

  // Create custom cartela mutation
  const createCartelaMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      cartelaNumber: number;
      pattern: number[][];
      shopId: number;
      adminId: number;
    }) => {
      console.log("Creating cartela with data:", data);
      const response = await apiRequest('POST', '/api/custom-cartelas', data);
      console.log("Create response:", response);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("Create mutation successful, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/custom-cartelas", shopId] });
    },
    onError: (error) => {
      console.error("Create mutation error:", error);
    },
  });

  // Delete custom cartela mutation
  const deleteCartelaMutation = useMutation({
    mutationFn: async (cartelaId: number) => {
      const response = await apiRequest('DELETE', `/api/custom-cartelas/${cartelaId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-cartelas", shopId] });
    },
  });

  const handleSaveCards = async () => {
    if (!cardsData.trim()) {
      toast({
        title: "Error",
        description: "Please enter cards data",
        variant: "destructive",
      });
      return;
    }

    console.log("Starting to save cards...", cardsData);

    try {
      const lines = cardsData.trim().split('\n').filter(line => line.trim());
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      console.log("Processing lines:", lines);

      for (const line of lines) {
        console.log("Processing line:", line);
        try {
          const [cardNumStr, numbersStr] = line.split(':');
          console.log("Split result:", { cardNumStr, numbersStr });
          
          if (!cardNumStr || !numbersStr) {
            console.log("Invalid format detected");
            errors.push(`Invalid format: ${line}`);
            errorCount++;
            continue;
          }

          const cardNumber = parseInt(cardNumStr.trim());
          console.log("Card number parsed:", cardNumber);
          
          if (isNaN(cardNumber)) {
            console.log("Invalid card number");
            errors.push(`Invalid card number: ${cardNumStr}`);
            errorCount++;
            continue;
          }

          console.log("Processing numbers string:", numbersStr);
          const numbers = numbersStr.split(',').map(n => {
            const num = n.trim().toLowerCase();
            if (num === 'free') return 0;
            const parsed = parseInt(num);
            if (isNaN(parsed)) throw new Error(`Invalid number: ${n}`);
            return parsed;
          });
          
          console.log("Numbers parsed:", numbers);

          if (numbers.length !== 25) {
            console.log(`Invalid length: ${numbers.length}, expected 25`);
            errors.push(`Card ${cardNumber}: Must have exactly 25 numbers, got ${numbers.length}. Numbers: ${numbersStr}`);
            errorCount++;
            continue;
          }

          console.log("Length validation passed");

          // Validate individual numbers are within BINGO range
          let hasInvalidNumbers = false;
          for (const num of numbers) {
            if (num !== 0 && (num < 1 || num > 75)) {
              console.log(`Invalid number found: ${num}`);
              errors.push(`Card ${cardNumber}: Number ${num} is outside valid BINGO range (1-75)`);
              hasInvalidNumbers = true;
            }
          }
          
          if (hasInvalidNumbers) {
            console.log("Has invalid numbers, skipping");
            errorCount++;
            continue;
          }

          console.log("Number range validation passed");

          // Convert flat array to 5x5 grid
          const pattern: number[][] = [];
          for (let i = 0; i < 5; i++) {
            pattern.push(numbers.slice(i * 5, (i + 1) * 5));
          }

          console.log("Pattern created:", pattern);

          // Validate BINGO column ranges
          const columnRanges = [
            { min: 1, max: 15, name: 'B' },   // B column
            { min: 16, max: 30, name: 'I' },  // I column
            { min: 31, max: 45, name: 'N' },  // N column
            { min: 46, max: 60, name: 'G' },  // G column
            { min: 61, max: 75, name: 'O' }   // O column
          ];

          console.log("Starting column validation");

          let validPattern = true;
          for (let col = 0; col < 5; col++) {
            for (let row = 0; row < 5; row++) {
              const num = pattern[row][col];
              if (num === 0 && row === 2 && col === 2) continue; // FREE space
              
              const range = columnRanges[col];
              if (num < range.min || num > range.max) {
                errors.push(`Card ${cardNumber}: Number ${num} in ${range.name} column must be between ${range.min}-${range.max}`);
                validPattern = false;
                break;
              }
            }
            if (!validPattern) break;
          }

          if (!validPattern) {
            errorCount++;
            continue;
          }

          // Check if cartela already exists (either fixed or custom)
          const existingCustom = customCartelas?.find((c: CustomCartela) => c.cartelaNumber === cardNumber);
          
          if (cardNumber >= 1 && cardNumber <= 200 && !existingCustom) {
            // This would override a fixed cartela, create custom one
            await createCartelaMutation.mutateAsync({
              name: `Custom Card ${cardNumber}`,
              cartelaNumber: cardNumber,
              pattern,
              shopId,
              adminId,
            });
          } else if (existingCustom) {
            // Update existing custom cartela
            const response = await apiRequest('PATCH', `/api/custom-cartelas/${existingCustom.id}`, {
              name: `Custom Card ${cardNumber}`,
              pattern,
            });
            if (!response.ok) throw new Error('Failed to update cartela');
          } else {
            // Create new custom cartela
            await createCartelaMutation.mutateAsync({
              name: `Custom Card ${cardNumber}`,
              cartelaNumber: cardNumber,
              pattern,
              shopId,
              adminId,
            });
          }

          console.log(`Successfully processed card ${cardNumber}`);
          successCount++;
        } catch (error) {
          console.error("Card processing error:", error);
          errors.push(`Card parsing error: ${error}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Cards Saved Successfully",
          description: `Saved ${successCount} cards successfully${errorCount > 0 ? `. ${errorCount} errors occurred.` : '.'}`,
        });
        setCardsData('');
        queryClient.invalidateQueries({ queryKey: [`/api/custom-cartelas/${shopId}`] });
      } else {
        toast({
          title: "Save Failed",
          description: errors.slice(0, 3).join('. ') + (errors.length > 3 ? '...' : ''),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save cards",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCard = async (cartelaId: number) => {
    try {
      await deleteCartelaMutation.mutateAsync(cartelaId);
      toast({
        title: "Card Deleted",
        description: "Card has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setCardsData('');
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/custom-cartelas", shopId] });
  };

  // Get current cartela list that employees see
  const getCurrentCartelaList = () => {
    const allCartelas = [];
    
    // Add fixed cartelas (1-200)
    for (let i = 1; i <= 200; i++) {
      const numbers = getCartelaNumbers(i);
      allCartelas.push({
        number: i,
        type: 'Fixed',
        numbers: numbers,
        source: 'System'
      });
    }
    
    // Add custom cartelas
    if (customCartelas) {
      customCartelas.forEach((cartela: CustomCartela) => {
        allCartelas.push({
          number: cartela.cartelaNumber,
          type: 'Custom',
          numbers: cartela.pattern.flat(),
          source: 'Admin'
        });
      });
    }
    
    return allCartelas.sort((a, b) => a.number - b.number);
  };

  const cartelaList = getCurrentCartelaList();

  return (
    <div className="space-y-6">
      {/* Bulk Cards Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bingo Cards Management</span>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>Manage your bingo cards by entering them in the format below. Each line represents one card.</p>
            <div>
              <strong>Format:</strong> cardNumber:number1,number2,number3,...
            </div>
            <div>
              <strong>Example:</strong>
            </div>
            <div className="bg-gray-50 p-2 rounded font-mono text-xs">
              2:5,19,38,51,64,3,24,42,58,69,12,18,free,26,62,4,46,63,55,33,1,53,47,65,71
            </div>
            <div className="text-red-600">
              <strong>Note:</strong> Each card must have exactly 25 numbers representing a 5x5 grid.
            </div>
          </div>

          <div>
            <label htmlFor="cardsData" className="block text-sm font-medium mb-2">
              Cards Data
            </label>
            <Textarea
              id="cardsData"
              value={cardsData}
              onChange={(e) => {
                console.log("Textarea onChange:", e.target.value);
                setCardsData(e.target.value);
              }}
              placeholder="Enter cards data in the format:&#10;cardNumber:number1,number2,number3,..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                console.log("=== SAVE BUTTON CLICKED ===");
                console.log("Event:", e);
                console.log("cardsData:", cardsData);
                console.log("cardsData length:", cardsData.length);
                console.log("Button disabled state:", !cardsData.trim() || createCartelaMutation.isPending);
                console.log("createCartelaMutation.isPending:", createCartelaMutation.isPending);
                handleSaveCards();
              }}
              disabled={!cardsData.trim() || createCartelaMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createCartelaMutation.isPending ? "Saving..." : "Save Cards"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Cartela List - What Employees See */}
      <Card>
        <CardHeader>
          <CardTitle>Current Cartela List ({cartelaList.length} total)</CardTitle>
          <div className="text-sm text-gray-600">
            This shows all cartelas that employees can select from when creating games
          </div>
        </CardHeader>
        <CardContent>
          {cartelaList.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline">
                  Fixed: {cartelaList.filter(c => c.type === 'Fixed').length}
                </Badge>
                <Badge variant="outline">
                  Custom: {cartelaList.filter(c => c.type === 'Custom').length}
                </Badge>
              </div>

              {/* Cartela Grid */}
              <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                {cartelaList.map((cartela) => (
                  <div key={`${cartela.type}-${cartela.number}`} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Cartela #{cartela.number}</span>
                        <Badge 
                          variant={cartela.type === 'Fixed' ? 'secondary' : 'default'}
                          className={cartela.type === 'Custom' ? 'bg-blue-100 text-blue-800' : ''}
                        >
                          {cartela.type}
                        </Badge>
                      </div>
                      {cartela.type === 'Custom' && (
                        <Button
                          onClick={() => {
                            const customCartela = customCartelas?.find((c: CustomCartela) => c.cartelaNumber === cartela.number);
                            if (customCartela) handleDeleteCard(customCartela.id);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Mini Bingo Grid */}
                    <div className="grid grid-cols-5 gap-1 text-xs">
                      <div className="text-center font-bold text-blue-600 py-1 bg-blue-50">B</div>
                      <div className="text-center font-bold text-red-600 py-1 bg-red-50">I</div>
                      <div className="text-center font-bold text-green-600 py-1 bg-green-50">N</div>
                      <div className="text-center font-bold text-yellow-600 py-1 bg-yellow-50">G</div>
                      <div className="text-center font-bold text-purple-600 py-1 bg-purple-50">O</div>
                      
                      {cartela.numbers.map((num, idx) => (
                        <div key={idx} className="text-center py-1 border border-gray-200 text-xs">
                          {num === 0 ? 'FREE' : num}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No cartelas found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}