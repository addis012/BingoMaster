import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  // Cartela management
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  
  // Winner checking
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  const [showWinnerResult, setShowWinnerResult] = useState(false);
  const [winnerResult, setWinnerResult] = useState({ isWinner: false, cartela: 0, message: "", pattern: "", winningCells: [] as number[] });
  
  // Animation states
  const [isShuffling, setIsShuffling] = useState(false);
  const [showCartelaPreview, setShowCartelaPreview] = useState(false);
  const [previewCartela, setPreviewCartela] = useState<number | null>(null);
  
  // Timer reference for instant pause control
  const numberCallTimer = useRef<NodeJS.Timeout | null>(null);
  
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

  // Calculate amounts based on selected cartelas and profit margin
  const calculateAmounts = () => {
    const totalCartelas = selectedCartelas.size;
    const amountPerCartela = parseFloat(gameAmount) || 20;
    const totalCollected = totalCartelas * amountPerCartela;
    // Use admin's actual profit margin from adminData, not shopData
    const profitMargin = (adminData?.profitMargin || 10) / 100;
    const winnerAmount = totalCollected * (1 - profitMargin);
    const profitAmount = totalCollected * profitMargin;
    
    return {
      totalCollected,
      winnerAmount,
      profitAmount,
      totalCartelas
    };
  };

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
    } else {
      // Clear all game state when no active game
      setActiveGameId(null);
      setGameActive(false);
      setGameFinished(false);
      setCalledNumbers([]);
      setLastCalledNumber(null);
      setBookedCartelas(new Set());
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
      setCalledNumbers([]); // Ensure no numbers are pre-marked
      setLastCalledNumber(null);
      setBookedCartelas(new Set(selectedCartelas));
      // Keep selectedCartelas for validation during the game
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
      setCalledNumbers([]); // Clear any previous numbers when starting
      setLastCalledNumber(null);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      
      // Play game start sound
      try {
        const audio = new Audio('/attached_assets/game started_1750069128880.mp3');
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
      
      // Play number audio if available and no other audio is playing
      if (newNumber && !audioPlaying) {
        const letter = getLetterForNumber(newNumber);
        setAudioPlaying(true);
        
        // Set a fallback timeout to reset audio state in case audio events fail
        const audioResetTimer = setTimeout(() => {
          setAudioPlaying(false);
        }, 2500); // Reset audio state after 2.5 seconds max
        
        try {
          const audio = new Audio(`/attached_assets/${letter}${newNumber}.mp3`);
          audio.volume = 0.8;
          audio.onended = () => {
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
          };
          audio.onerror = () => {
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
          };
          audio.play().catch(() => {
            console.log(`Audio for ${letter}${newNumber} not available`);
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
          });
        } catch (error) {
          console.log('Audio playback error');
          clearTimeout(audioResetTimer);
          setAudioPlaying(false);
        }
      }
      
      // Always set timer for next number call (don't depend on audio state)
      if (gameActive && !gameFinished && !gamePaused) {
        numberCallTimer.current = setTimeout(() => {
          if (gameActive && !gameFinished && !gamePaused && activeGameId) {
            callNumberMutation.mutate();
          }
        }, 3000);
      }
    }
  });

  // Reset game mutation - only clears data when manually starting new game
  const resetGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/complete`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to reset game');
      return response.json();
    },
    onSuccess: () => {
      // Only reset state when manually starting new game, not during winner declaration
      if (!gameFinished) {
        setGameActive(false);
        setGameFinished(false);
        setCalledNumbers([]);
        setLastCalledNumber(null);
        setActiveGameId(null);
        setBookedCartelas(new Set());
      }
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Reset",
        description: "Game has been completed and reset"
      });
    }
  });

  // Check winner function - can be called anytime even when paused
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

    if (!selectedCartelas.has(cartelaNum)) {
      // Show red popup for not booked cartela
      setWinnerResult({
        isWinner: false,
        cartela: cartelaNum,
        message: "This cartela was not selected for this game",
        pattern: "",
        winningCells: []
      });
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowWinnerResult(false);
      }, 3000);
      return;
    }

    // Get cartela pattern and check for win
    const cartelaPattern = getFixedCartelaPattern(cartelaNum);
    const isWinner = checkBingoWin(cartelaPattern, calledNumbers);
    
    if (!isWinner.isWinner) {
      // NOT A WINNER - Show red popup and resume game
      setWinnerResult({
        isWinner: false,
        cartela: cartelaNum,
        message: "This Cartela Did Not Win",
        pattern: "",
        winningCells: []
      });
      
      // Clear any existing timer to prevent audio overlap
      if (numberCallTimer.current) {
        clearTimeout(numberCallTimer.current);
        numberCallTimer.current = null;
      }
      
      // Play loser sound with proper state management
      if (!audioPlaying) {
        setAudioPlaying(true);
        setTimeout(() => {
          try {
            const audio = new Audio('/attached_assets/losser_1750069128883.mp3');
            audio.volume = 0.8;
            audio.onended = () => setAudioPlaying(false);
            audio.onerror = () => setAudioPlaying(false);
            audio.play().catch(() => {
              console.log('Loser sound not available');
              setAudioPlaying(false);
            });
          } catch (error) {
            console.log('Loser audio playback error');
            setAudioPlaying(false);
          }
        }, 500);
      }
      
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      
    } else {
      // IS A WINNER - Pause game completely and show green popup
      setGamePaused(true);
      setGameActive(false);
      setGameFinished(true);
      
      setWinnerResult({
        isWinner: true,
        cartela: cartelaNum,
        message: "Congratulations! This Cartela Has Won!",
        pattern: isWinner.pattern || "",
        winningCells: isWinner.winningCells || []
      });
      
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      
      // Submit winner to backend and complete the game
      try {
        await fetch(`/api/games/${activeGameId}/declare-winner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            winnerCartelaNumber: cartelaNum,
            totalPlayers: selectedCartelas.size,
            entryFeePerPlayer: parseFloat(gameAmount),
            allCartelaNumbers: Array.from(selectedCartelas),
            calledNumbers: calledNumbers,
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
          const audio = new Audio('/attached_assets/winner_1750069128882.mp3');
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

  // Pause game function - instantly stops number calling
  const pauseGame = () => {
    setGamePaused(true);
    // Clear the timer immediately to stop number calling
    if (numberCallTimer.current) {
      clearTimeout(numberCallTimer.current);
      numberCallTimer.current = null;
    }
  };

  // Resume game function - continues number calling
  const resumeGame = () => {
    setGamePaused(false);
    // Resume calling numbers if game is still active
    if (gameActive && !gameFinished && activeGameId) {
      callNumberMutation.mutate();
    }
  };

  // Check for BINGO win patterns
  function checkBingoWin(cartelaPattern: number[][], calledNumbers: number[]): { isWinner: boolean; pattern?: string; winningCells?: number[] } {
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
        const winningCells = [];
        for (let col = 0; col < 5; col++) {
          winningCells.push(row * 5 + col);
        }
        return { isWinner: true, pattern: `Horizontal Row ${row + 1}`, winningCells };
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
        const winningCells = [];
        for (let row = 0; row < 5; row++) {
          winningCells.push(row * 5 + col);
        }
        return { isWinner: true, pattern: `Vertical ${letters[col]} Column`, winningCells };
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
      const winningCells = [];
      for (let i = 0; i < 5; i++) {
        winningCells.push(i * 5 + i);
      }
      return { isWinner: true, pattern: "Diagonal (Top-Left to Bottom-Right)", winningCells };
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
      const winningCells = [];
      for (let i = 0; i < 5; i++) {
        winningCells.push(i * 5 + (4 - i));
      }
      return { isWinner: true, pattern: "Diagonal (Top-Right to Bottom-Left)", winningCells };
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

                  
                  {/* Winner Amount Calculation Display */}
                  {selectedCartelas.size > 0 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm font-medium text-green-800 mb-2">Amount Calculations:</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Total Collected:</span>
                          <span className="font-medium">{calculateAmounts().totalCollected.toFixed(2)} Birr</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Winner Amount:</span>
                          <span className="font-bold">{calculateAmounts().winnerAmount.toFixed(2)} Birr</span>
                        </div>

                      </div>
                    </div>
                  )}
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
                      onClick={() => {
                        // Manually reset all state for new game
                        setGameActive(false);
                        setGameFinished(false);
                        setCalledNumbers([]);
                        setLastCalledNumber(null);
                        setActiveGameId(null);
                        setBookedCartelas(new Set());
                        setSelectedCartelas(new Set());
                        setWinnerResult({ isWinner: false, cartela: 0, message: "", pattern: "", winningCells: [] });
                        setShowWinnerResult(false);
                        queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      New Game
                    </Button>
                  ) : gameActive ? (
                    <Button 
                      onClick={() => {
                        if (gamePaused) {
                          resumeGame();
                        } else {
                          pauseGame();
                        }
                      }}
                      className={gamePaused ? "bg-green-500 hover:bg-green-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
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
                  onClick={() => {
                    // Immediately pause the game to stop number calling
                    pauseGame();
                    setShowWinnerChecker(true);
                  }}
                  disabled={!activeGameId}
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

      {/* Winner Result Dialog - Horizontal Layout */}
      <Dialog open={showWinnerResult} onOpenChange={setShowWinnerResult}>
        <DialogContent className={`max-w-4xl w-full ${winnerResult.isWinner ? "border-green-500" : "border-red-500"}`}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className={`text-xl ${winnerResult.isWinner ? "text-green-600" : "text-red-600"}`}>
              {winnerResult.isWinner ? "🎉 WINNER FOUND!" : "❌ NOT A WINNER"}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowWinnerResult(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              ✕
            </Button>
          </DialogHeader>
          
          {winnerResult.isWinner ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left side - Winner info and amount */}
              <div className="space-y-4 bg-green-50 p-6 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-xl font-bold text-green-600 mb-2">
                    Congratulations! This Cartela Has Won!
                  </div>
                  <div className="text-lg font-bold text-green-700 mb-2">
                    Cartela #{winnerResult.cartela}
                  </div>
                  <div className="text-md text-green-600 mb-4">
                    Winning Pattern: {winnerResult.pattern}
                  </div>
                </div>
                
                {/* Winner Amount Display */}
                <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-800 mb-2">💰 Winner Amount:</div>
                    <div className="text-2xl font-bold text-green-700">
                      {calculateAmounts().winnerAmount.toFixed(2)} Birr
                    </div>

                  </div>
                </div>
              </div>

              {/* Right side - Cartela grid */}
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center mb-4">
                  <div className="text-md font-medium text-green-700 mb-2">Cartela Grid:</div>
                  <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
                    {/* Header */}
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">B</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">I</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">N</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">G</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">O</div>
                    
                    {/* Cartela pattern */}
                    {getFixedCartelaPattern(winnerResult.cartela).flat().map((num, index) => {
                      const isWinningCell = winnerResult.winningCells?.includes(index);
                      const isCalled = num !== 0 && calledNumbers.includes(num);
                      const isFree = index === 12;
                      
                      return (
                        <div key={index} className={`text-center text-sm p-2 border-2 rounded ${
                          isWinningCell 
                            ? 'bg-yellow-300 border-yellow-500 font-bold shadow-lg animate-pulse' 
                            : isFree
                              ? 'bg-yellow-200 border-yellow-300 font-medium' 
                              : isCalled
                                ? 'bg-green-200 border-green-400'
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                          {isFree ? 'FREE' : num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="space-y-4 bg-red-50 p-6 rounded-lg max-w-md mx-auto">
                <div className="text-4xl mb-4">❌</div>
                <div className="text-xl font-bold text-red-600">
                  This Cartela Did Not Win
                </div>
                <div className="text-lg font-bold text-red-700">
                  Cartela #{winnerResult.cartela}
                </div>
                <div className="text-md text-red-600">
                  {winnerResult.message}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-center gap-4">
            <Button 
              onClick={() => {
                setShowWinnerResult(false);
                setAudioPlaying(false); // Reset audio state
                // Reset and resume game immediately if not a winner
                if (!winnerResult.isWinner && gamePaused) {
                  setGamePaused(false);
                  // Resume calling numbers immediately
                  setTimeout(() => {
                    if (activeGameId && gameActive && !gameFinished) {
                      callNumberMutation.mutate();
                    }
                  }, 100); // Minimal delay to ensure state is updated
                }
              }}
              className={`px-8 py-2 ${winnerResult.isWinner ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
            >
              {winnerResult.isWinner ? "Close & Complete Game" : "Continue Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}