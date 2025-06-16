import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { FIXED_CARTELAS, getCartelaNumbers, getFixedCartelaPattern } from "@/data/fixed-cartelas";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lastCalledNumber, setLastCalledNumber] = useState<number | null>(null);
  const [gameAmount, setGameAmount] = useState("20");
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  
  // Cartela management
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  
  // Winner checking
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  const [showWinnerResult, setShowWinnerResult] = useState(false);
  const [winnerResult, setWinnerResult] = useState({ isWinner: false, cartela: 0, message: "", pattern: "" });
  
  // Animation states
  const [isShuffling, setIsShuffling] = useState(false);
  const [showCartelaPreview, setShowCartelaPreview] = useState(false);
  const [previewCartela, setPreviewCartela] = useState<number | null>(null);
  
  // Active game query
  const { data: activeGame } = useQuery({
    queryKey: ['/api/games/active'],
    refetchInterval: 2000
  });

  // Shop data query
  const { data: shopData } = useQuery({
    queryKey: ['/api/shops', user?.shopId],
    enabled: !!user?.shopId
  });

  // Game history query for admin connection
  const { data: gameHistory } = useQuery({
    queryKey: ['/api/analytics/shop', user?.shopId],
    enabled: !!user?.shopId,
    refetchInterval: 10000 // Refresh every 10 seconds for live updates
  });

  // Admin credit balance query
  const { data: adminData } = useQuery({
    queryKey: ['/api/users', shopData?.adminId],
    queryFn: async () => {
      if (!shopData?.adminId) return null;
      const response = await fetch(`/api/users/${shopData.adminId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!shopData?.adminId,
    refetchInterval: 30000 // Check admin balance every 30 seconds
  });

  // Sync with active game data
  useEffect(() => {
    if (activeGame) {
      setActiveGameId((activeGame as any).id);
      setGameActive((activeGame as any).status === 'active');
      setGameFinished((activeGame as any).status === 'completed');
      
      // Convert string array to number array for proper number tracking
      const gameCalledNumbers = ((activeGame as any).calledNumbers || []).map((n: string) => parseInt(n));
      setCalledNumbers(gameCalledNumbers);
      setBookedCartelas(new Set((activeGame as any).cartelas || []));
      
      const lastNumber = gameCalledNumbers.slice(-1)[0];
      setLastCalledNumber(lastNumber || null);
    }
  }, [activeGame]);

  // Helper function to get letter for number
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "?";
  };

  // Shuffle animation with sound
  const shuffleNumbers = () => {
    if (!activeGameId) return;
    
    setIsShuffling(true);
    
    // Play money counter sound effect for shuffle
    try {
      const audio = new Audio('/attached_assets/money-counter-95830_1750063611267.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {
        console.log('Money counter sound not available');
      });
    } catch (error) {
      console.log('Audio playback error for shuffle sound');
    }
    
    setTimeout(() => {
      setIsShuffling(false);
    }, 2500);
  };

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(gameAmount),
          cartelas: Array.from(selectedCartelas)
        })
      });
      if (!response.ok) throw new Error('Failed to create game');
      return response.json();
    },
    onSuccess: (data) => {
      setActiveGameId(data.id);
      setGameActive(false);
      setGameFinished(false);
      setCalledNumbers([]);
      setLastCalledNumber(null);
      setBookedCartelas(new Set(selectedCartelas));
      setSelectedCartelas(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Created",
        description: `Game created with ${Array.from(selectedCartelas).length} cartelas`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create game",
        variant: "destructive"
      });
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/start`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to start game');
      return response.json();
    },
    onSuccess: (data) => {
      setGameActive(true);
      setActiveGameId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      
      // Play game start sound
      try {
        const audio = new Audio('/attached_assets/start voice_1749898419925.MP3');
        audio.volume = 0.8;
        audio.play().catch(() => {
          console.log('Start game sound not available');
        });
      } catch (error) {
        console.log('Start audio playback error');
      }
      
      toast({
        title: "Game Started",
        description: "Bingo game is now active - start calling numbers!"
      });
      
      // Automatically start calling numbers after a short delay
      setTimeout(() => {
        callNumberMutation.mutate();
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Start game error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    }
  });

  // Call number mutation
  const callNumberMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/numbers`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to call number');
      return response.json();
    },
    onSuccess: (data) => {
      // Convert string array to number array for proper tracking
      const updatedNumbers = (data.calledNumbers || []).map((n: string) => parseInt(n));
      setCalledNumbers(updatedNumbers);
      const newNumber = data.calledNumber;
      setLastCalledNumber(newNumber);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      
      // Play number audio if available
      if (newNumber) {
        const letter = getLetterForNumber(newNumber);
        try {
          const audio = new Audio(`/attached_assets/${letter}${newNumber}.mp3`);
          audio.volume = 0.8;
          audio.play().catch(() => {
            console.log(`Audio for ${letter}${newNumber} not available`);
          });
        } catch (error) {
          console.log('Audio playback error');
        }
        
        // Auto-call next number after 4 seconds if game is still active and not paused
        if (gameActive && !gameFinished && !gamePaused) {
          setTimeout(() => {
            if (gameActive && !gameFinished && !gamePaused && activeGameId) {
              callNumberMutation.mutate();
            }
          }, 4000);
        }
      }
    }
  });

  // Reset game mutation
  const resetGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/complete`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to reset game');
      return response.json();
    },
    onSuccess: () => {
      setGameActive(false);
      setGameFinished(false);
      setCalledNumbers([]);
      setLastCalledNumber(null);
      setActiveGameId(null);
      setBookedCartelas(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Reset",
        description: "Game has been completed and reset"
      });
    }
  });

  // Check winner function
  const checkWinner = async () => {
    const cartelaNum = parseInt(winnerCartelaNumber);
    
    if (!cartelaNum || cartelaNum < 1 || cartelaNum > 75) {
      toast({
        title: "Invalid Cartela",
        description: "Please enter a cartela number between 1 and 75",
        variant: "destructive"
      });
      return;
    }

    if (!bookedCartelas.has(cartelaNum)) {
      setWinnerResult({
        isWinner: false,
        cartela: cartelaNum,
        message: "This cartela was not booked for this game",
        pattern: ""
      });
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      return;
    }

    // Get cartela pattern and check for win
    const cartelaPattern = getFixedCartelaPattern(cartelaNum);
    const isWinner = checkBingoWin(cartelaPattern, calledNumbers);
    
    setWinnerResult({
      isWinner: isWinner.isWinner,
      cartela: cartelaNum,
      message: isWinner.isWinner ? "BINGO! Winner found!" : "Not a winner yet",
      pattern: isWinner.pattern || ""
    });
    
    setShowWinnerResult(true);
    setShowWinnerChecker(false);
    
    if (isWinner.isWinner) {
      setGameActive(false);
      setGameFinished(true);
      
      // Submit winner to backend and complete the game
      try {
        await fetch(`/api/games/${activeGameId}/declare-winner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartelaNumber: cartelaNum,
            pattern: isWinner.pattern
          })
        });
        
        // Mark game as completed to save to history
        await fetch(`/api/games/${activeGameId}/complete`, {
          method: 'PATCH'
        });
        
        // Invalidate all related queries to update admin dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/shop'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/trends'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/profit-distribution'] });
        
        // Play winner sound
        try {
          const audio = new Audio('/attached_assets/winner voice_1749898419926.MP3');
          audio.volume = 0.8;
          audio.play().catch(() => {
            console.log('Winner sound not available');
          });
        } catch (error) {
          console.log('Winner audio playback error');
        }
        
        toast({
          title: "Winner Confirmed!",
          description: `Cartela #${cartelaNum} wins with ${isWinner.pattern}`,
          duration: 5000
        });
        
      } catch (error) {
        console.error('Failed to declare winner:', error);
        toast({
          title: "Error",
          description: "Failed to process winner. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Check for BINGO win patterns
  function checkBingoWin(cartelaPattern: number[][], calledNumbers: number[]): { isWinner: boolean; pattern?: string } {
    if (cartelaPattern.length !== 5) return { isWinner: false };
    
    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      let hasAllNumbers = true;
      for (let col = 0; col < 5; col++) {
        const num = cartelaPattern[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          hasAllNumbers = false;
          break;
        }
      }
      if (hasAllNumbers) {
        return { isWinner: true, pattern: `Horizontal Row ${row + 1}` };
      }
    }
    
    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      let hasAllNumbers = true;
      for (let row = 0; row < 5; row++) {
        const num = cartelaPattern[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          hasAllNumbers = false;
          break;
        }
      }
      if (hasAllNumbers) {
        const letters = ['B', 'I', 'N', 'G', 'O'];
        return { isWinner: true, pattern: `Vertical ${letters[col]} Column` };
      }
    }
    
    // Check diagonal (top-left to bottom-right)
    let hasAllNumbers = true;
    for (let i = 0; i < 5; i++) {
      const num = cartelaPattern[i][i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        hasAllNumbers = false;
        break;
      }
    }
    if (hasAllNumbers) {
      return { isWinner: true, pattern: "Diagonal (Top-Left to Bottom-Right)" };
    }
    
    // Check diagonal (top-right to bottom-left)
    hasAllNumbers = true;
    for (let i = 0; i < 5; i++) {
      const num = cartelaPattern[i][4 - i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        hasAllNumbers = false;
        break;
      }
    }
    if (hasAllNumbers) {
      return { isWinner: true, pattern: "Diagonal (Top-Right to Bottom-Left)" };
    }
    
    return { isWinner: false };
  }

  // Check if admin has low credit balance
  const adminCreditBalance = parseFloat((adminData as any)?.creditBalance || '0');
  const showLowCreditWarning = adminData && adminCreditBalance < 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Low Credit Warning */}
      {showLowCreditWarning && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                <strong>⚠ Admin Low Credit Balance</strong>
                <br />
                Shop admin balance is low ({adminCreditBalance.toFixed(2)} ETB). Contact admin to add more credits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bingo Play</h1>
            <p className="text-sm text-gray-600">
              {user?.username} - employee
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Collected</div>
              <div className="font-bold">
                {activeGameId ? 
                  `${(bookedCartelas.size * parseFloat(gameAmount)).toFixed(2)} Birr` : 
                  `${(selectedCartelas.size * parseFloat(gameAmount)).toFixed(2)} Birr`
                }
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Winner Gets</div>
              <div className="font-bold text-green-600">
                {(() => {
                  const totalAmount = activeGameId ? 
                    bookedCartelas.size * parseFloat(gameAmount) : 
                    selectedCartelas.size * parseFloat(gameAmount);
                  const profitMargin = ((shopData as any)?.profitMargin || 20) / 100;
                  const winnerAmount = totalAmount * (1 - profitMargin);
                  return `${winnerAmount.toFixed(2)} Birr`;
                })()}
              </div>
            </div>
            <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white">
              Log Out
            </Button>
          </div>
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          Shop Profit Margin: {((shopData as any)?.profitMargin || 20).toFixed(2)}%
        </div>
      </div>

      <div className="flex">
        {/* Left Panel */}
        <div className="w-80 p-4">
          {/* Current Number Display */}
          <Card className="mb-4">
            <CardContent className="p-6 text-center">
              {activeGameId && lastCalledNumber ? (
                <>
                  <div className="flex justify-center items-center space-x-2 mb-2">
                    <div className="w-12 h-12 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">
                      {getLetterForNumber(lastCalledNumber)}
                    </div>
                    <div className="w-12 h-12 bg-gray-800 text-white font-bold text-xl flex items-center justify-center rounded">
                      {lastCalledNumber}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {isShuffling ? "CALLING..." : `${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}`}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-xs font-bold">CALLING...</span>
                  </div>
                  <p className="text-xs text-gray-600">Generate Number</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Game Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Game Amount (Birr)</Label>
                  <Input
                    type="number"
                    value={gameAmount}
                    onChange={(e) => setGameAmount(e.target.value)}
                    disabled={gameActive}
                    className="mt-1"
                  />
                </div>

                {/* Selected Cartelas */}
                <div>
                  <Label className="text-sm font-medium">Selected Cartelas</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Array.from(selectedCartelas).map(num => (
                      <Badge key={num} className="bg-blue-500 text-white">
                        #{num}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedCartelas.size} cartelas
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setShowCartelaSelector(true)}
                    disabled={gameActive}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Select
                  </Button>
                  <Button 
                    onClick={() => setSelectedCartelas(new Set())}
                    disabled={gameActive}
                    variant="outline"
                  >
                    Reset
                  </Button>
                  
                  {!activeGameId ? (
                    <Button 
                      onClick={() => createGameMutation.mutate()}
                      disabled={selectedCartelas.size === 0 || createGameMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {createGameMutation.isPending ? "Creating..." : "Create Game"}
                    </Button>
                  ) : !gameActive && !gameFinished ? (
                    <Button 
                      onClick={() => startGameMutation.mutate()}
                      disabled={startGameMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {startGameMutation.isPending ? "Starting..." : "Start Game"}
                    </Button>
                  ) : gameFinished ? (
                    <Button 
                      onClick={() => resetGameMutation.mutate()}
                      disabled={resetGameMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {resetGameMutation.isPending ? "Creating..." : "New Game"}
                    </Button>
                  ) : gameActive ? (
                    <Button 
                      onClick={() => {
                        if (gamePaused) {
                          // Resume game and trigger next number call
                          setGamePaused(false);
                          setTimeout(() => {
                            if (activeGameId && gameActive && !gameFinished) {
                              callNumberMutation.mutate();
                            }
                          }, 1000);
                        } else {
                          // Pause game
                          setGamePaused(true);
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {gamePaused ? "Resume Game" : "Pause Game"}
                    </Button>
                  ) : null}
                  
                  {gameActive ? (
                    <Button 
                      onClick={() => resetGameMutation.mutate()}
                      disabled={resetGameMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {resetGameMutation.isPending ? "Ending..." : "End Game"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={shuffleNumbers}
                      disabled={isShuffling || !activeGameId}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      {isShuffling ? "..." : "Shuffle"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - BINGO Board */}
        <div className="flex-1 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Called Numbers Board</CardTitle>
              <p className="text-center text-sm text-gray-600">
                Numbers Called: {calledNumbers.length}
              </p>
            </CardHeader>
            <CardContent>
              {/* Horizontal BINGO Board */}
              <div className="space-y-2">
                {/* B Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    B
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 1).map(num => (
                      <div 
                        key={num} 
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* I Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    I
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 16).map(num => (
                      <div 
                        key={num} 
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* N Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    N
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 31).map(num => (
                      <div 
                        key={num} 
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* G Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    G
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 46).map(num => (
                      <div 
                        key={num} 
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-yellow-500 text-white' 
                            : 'bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* O Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    O
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 61).map(num => (
                      <div 
                        key={num} 
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-gray-100 text-gray-700 border'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Check Winner Button */}
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => setShowWinnerChecker(true)}
                  disabled={!gameActive || calledNumbers.length < 5}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-8"
                >
                  Check Winner
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cartela Selector Dialog */}
      <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Fixed Cartelas (1-75)</DialogTitle>
            <DialogDescription>
              Choose from 75 official fixed cartelas. Selected: {selectedCartelas.size} cartelas
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-10 gap-3 p-4">
            {FIXED_CARTELAS.map((cartela) => (
              <div key={cartela.Board} className="text-center">
                <div
                  className={`p-2 border rounded cursor-pointer text-center mb-1 ${
                    selectedCartelas.has(cartela.Board)
                      ? 'bg-red-400 text-white border-red-500'
                      : bookedCartelas.has(cartela.Board)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => {
                    if (!bookedCartelas.has(cartela.Board)) {
                      const newSelected = new Set(selectedCartelas);
                      if (newSelected.has(cartela.Board)) {
                        newSelected.delete(cartela.Board);
                      } else {
                        newSelected.add(cartela.Board);
                      }
                      setSelectedCartelas(newSelected);
                    }
                  }}
                >
                  {cartela.Board}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs py-1 h-6"
                  onClick={() => {
                    setPreviewCartela(cartela.Board);
                    setShowCartelaPreview(true);
                  }}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center p-4 border-t">
            <span>Selected: {selectedCartelas.size} cartelas</span>
            <Button onClick={() => setShowCartelaSelector(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cartela Preview Dialog */}
      <Dialog open={showCartelaPreview} onOpenChange={setShowCartelaPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cartela #{previewCartela} Preview</DialogTitle>
            <DialogDescription>
              Fixed cartela pattern with predefined numbers
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
              
              {/* Cartela Grid */}
              <div className="grid grid-cols-5 gap-1">
                {(() => {
                  const cartela = FIXED_CARTELAS.find(c => c.Board === previewCartela);
                  if (!cartela) return null;
                  
                  const grid = [];
                  for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                      let value;
                      switch (col) {
                        case 0: value = cartela.B[row]; break;
                        case 1: value = cartela.I[row]; break;
                        case 2: value = cartela.N[row]; break;
                        case 3: value = cartela.G[row]; break;
                        case 4: value = cartela.O[row]; break;
                      }
                      
                      grid.push(
                        <div key={`${row}-${col}`} className="h-8 bg-gray-100 border rounded flex items-center justify-center text-sm font-medium">
                          {value === "FREE" ? "★" : value}
                        </div>
                      );
                    }
                  }
                  return grid;
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Winner Checker Dialog */}
      <Dialog open={showWinnerChecker} onOpenChange={setShowWinnerChecker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Winner</DialogTitle>
            <DialogDescription>
              Enter the cartela number to verify if it's a winner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cartelaNumber">Cartela Number</Label>
              <Input
                id="cartelaNumber"
                type="number"
                value={winnerCartelaNumber}
                onChange={(e) => setWinnerCartelaNumber(e.target.value)}
                placeholder="Enter cartela number (1-75)"
                min="1"
                max="75"
              />
            </div>
            <Button onClick={checkWinner} className="w-full">
              Check Winner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winner Result Dialog */}
      <Dialog open={showWinnerResult} onOpenChange={setShowWinnerResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Winner Check Result</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            {winnerResult.isWinner ? (
              <div className="space-y-4">
                <div className="text-6xl mb-4">🎉</div>
                <div className="text-xl font-bold text-green-600">
                  Cartela #{winnerResult.cartela}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  BINGO! WINNER!
                </div>
                <div className="text-lg text-gray-600">
                  Pattern: {winnerResult.pattern}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl mb-4">❌</div>
                <div className="text-xl font-bold text-red-600">
                  Cartela #{winnerResult.cartela}
                </div>
                <div className="text-2xl font-bold text-red-600">
                  Not a Winner
                </div>
                <div className="text-gray-600 mt-4">
                  Game continues...
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}