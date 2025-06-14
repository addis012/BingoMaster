import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { FIXED_CARTELAS, getCartelaNumbers, formatCartelaDisplay } from "@/data/fixed-cartelas";

interface FixedBingoDashboardProps {
  onLogout: () => void;
}

export default function FixedBingoDashboard({ onLogout }: FixedBingoDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [lastCalledNumber, setLastCalledNumber] = useState<number | null>(null);
  const [gameAmount, setGameAmount] = useState("20");
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [shopData, setShopData] = useState<any>(null);
  
  // Cartela selection
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [previewCartela, setPreviewCartela] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Winner checking
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  const [showWinnerResult, setShowWinnerResult] = useState(false);
  const [winnerResult, setWinnerResult] = useState({ isWinner: false, cartela: 0, message: "", pattern: "" });
  const [wasGameActiveBeforeCheck, setWasGameActiveBeforeCheck] = useState(false);
  
  // Game mechanics
  const [isShuffling, setIsShuffling] = useState(false);
  const autoCallInterval = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef({ calledNumbers: [], finished: false });

  // Backend mutations
  const createGameMutation = useMutation({
    mutationFn: async (gameData: { shopId: number; employeeId: number }) => {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameData),
      });
      if (!response.ok) throw new Error("Failed to create game");
      return response.json();
    },
  });

  const declareWinnerMutation = useMutation({
    mutationFn: async ({ gameId, winnerId, winnerCartela }: { gameId: number; winnerId: number; winnerCartela: number }) => {
      const response = await fetch(`/api/games/${gameId}/declare-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, winnerCartela }),
      });
      if (!response.ok) throw new Error("Failed to declare winner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: async ({ gameId, playerData }: { gameId: number; playerData: any }) => {
      const response = await fetch(`/api/games/${gameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playerData),
      });
      if (!response.ok) throw new Error("Failed to add player");
      return response.json();
    },
  });

  // Helper functions
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "?";
  };

  const toggleCartelaSelection = (num: number) => {
    const newSelected = new Set(selectedCartelas);
    if (newSelected.has(num)) {
      newSelected.delete(num);
    } else {
      newSelected.add(num);
    }
    setSelectedCartelas(newSelected);
  };

  const previewCartelaByNumber = (cartelaNumber: number) => {
    const cartela = FIXED_CARTELAS.find(c => c.Board === cartelaNumber);
    if (cartela) {
      setPreviewCartela(cartela);
      setShowPreview(true);
    }
  };

  const bookSelectedCartelas = () => {
    if (selectedCartelas.size === 0) return;
    
    setBookedCartelas(new Set([...Array.from(bookedCartelas), ...Array.from(selectedCartelas)]));
    setSelectedCartelas(new Set());
    setShowCartelaSelector(false);
  };

  const startGame = async () => {
    if (bookedCartelas.size === 0) {
      return;
    }

    try {
      // Create backend game if starting fresh
      if (!activeGameId && calledNumbers.length === 0) {
        const gameData = {
          shopId: user?.shopId || 1,
          employeeId: user?.id || 1,
          status: "waiting",
          entryFee: gameAmount,
        };
        
        const game = await createGameMutation.mutateAsync(gameData);
        setActiveGameId(game.id);
        
        console.log(`✅ BACKEND GAME CREATED: Game ID ${game.id} for ${bookedCartelas.size} cartelas`);
        
        // CRITICAL: Create player records for all booked cartelas - send cartela IDs not individual numbers
        if (bookedCartelas.size > 0) {
          console.log('📝 Creating player records for', bookedCartelas.size, 'fixed cartelas');
          
          // Send cartela board numbers (1-75) instead of individual bingo numbers
          const cartelaNumbers = Array.from(bookedCartelas);
          
          const playerData = {
            playerName: "Player",
            cartelaNumbers: cartelaNumbers, // Send cartela IDs (1-75)
            entryFee: gameAmount
          };
          
          console.log('📝 Player data being sent:', {
            ...playerData,
            selectedCartelas: cartelaNumbers,
            totalCartelas: cartelaNumbers.length
          });
          
          try {
            const result = await addPlayerMutation.mutateAsync({
              gameId: game.id,
              playerData: playerData
            });
            console.log('✅ Created player records for fixed cartelas:', cartelaNumbers);
            console.log('✅ Financial tracking will now show accurate cartela counts');
          } catch (playerError) {
            console.error('❌ Failed to create player records:', playerError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to create backend game:", error);
    }

    setGameActive(true);
    setGameFinished(false);
    
    // Only clear numbers if starting fresh game (no called numbers yet)
    if (calledNumbers.length === 0) {
      setCalledNumbers([]);
      setLastCalledNumber(null);
      gameStateRef.current = { calledNumbers: [], finished: false };
    }
    
    // Start auto-calling
    startAutoCalling();
  };

  const startAutoCalling = () => {
    if (autoCallInterval.current) {
      clearInterval(autoCallInterval.current);
    }

    autoCallInterval.current = setInterval(() => {
      if (gameStateRef.current.finished || gameStateRef.current.calledNumbers.length >= 75) {
        if (autoCallInterval.current) {
          clearInterval(autoCallInterval.current);
        }
        setGameActive(false);
        setGameFinished(true);
        return;
      }

      const availableNumbers = [];
      for (let i = 1; i <= 75; i++) {
        if (!gameStateRef.current.calledNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length === 0) {
        if (autoCallInterval.current) {
          clearInterval(autoCallInterval.current);
        }
        setGameActive(false);
        setGameFinished(true);
        return;
      }

      const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      const newCalledNumbers = [...gameStateRef.current.calledNumbers, newNumber];
      
      gameStateRef.current.calledNumbers = newCalledNumbers;
      setCalledNumbers(newCalledNumbers);
      setLastCalledNumber(newNumber);
      
      // Play Amharic audio
      try {
        const audioFileName = `${getLetterForNumber(newNumber)}${newNumber}.mp3`;
        const audio = new Audio(`/attached_assets/${audioFileName}`);
        audio.volume = 0.7;
        audio.play().catch(() => {
          console.log(`Audio file not found for ${audioFileName}`);
        });
      } catch (error) {
        console.log(`Audio playback error for ${getLetterForNumber(newNumber)}${newNumber}`);
      }
      
      console.log(`🔊 Calling: ${getLetterForNumber(newNumber)}-${newNumber}`);
    }, 3000);
  };

  const pauseGame = () => {
    if (autoCallInterval.current) {
      clearInterval(autoCallInterval.current);
    }
    setGameActive(false);
  };

  const resumeGame = () => {
    if (!gameFinished && bookedCartelas.size > 0) {
      setGameActive(true);
      startAutoCalling();
    }
  };

  const resetGame = () => {
    if (autoCallInterval.current) {
      clearInterval(autoCallInterval.current);
    }
    setGameActive(false);
    setGameFinished(false);
    setCalledNumbers([]);
    setLastCalledNumber(null);
    setBookedCartelas(new Set());
    setActiveGameId(null);
    gameStateRef.current = { calledNumbers: [], finished: false };
  };

  const shuffleNumbers = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setIsShuffling(false);
    }, 1000);
  };

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
      toast({
        title: "Cartela Not Selected",
        description: "This cartela was not selected for this game",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the proper winner verification API
      const response = await fetch(`/api/games/${activeGameId}/check-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cartelaNumber: cartelaNum,
          calledNumbers: calledNumbers
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to verify winner");
      }
      
      const result = await response.json();
      console.log('🔍 FRONTEND RECEIVED:', {
        result,
        isWinner: result.isWinner,
        isWinnerType: typeof result.isWinner,
        message: result.message,
        winningPattern: result.winningPattern
      });
      
      // Show winner verification popup with proper message
      setWinnerResult({ 
        isWinner: result.isWinner, 
        cartela: cartelaNum,
        message: result.message,
        pattern: result.winningPattern
      });
      setShowWinnerChecker(false);
      setWinnerCartelaNumber("");
      setShowWinnerResult(true);
      
      // If it's a winner, declare and save to game history
      if (result.isWinner) {
        try {
          const declareResponse = await fetch(`/api/games/${activeGameId}/declare-winner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              winnerCartelaNumber: cartelaNum,
              totalPlayers: bookedCartelas.size,
              entryFeePerPlayer: gameAmount,
              allCartelaNumbers: Array.from(bookedCartelas),
              calledNumbers: calledNumbers
            }),
          });
          
          if (declareResponse.ok) {
            console.log('Winner successfully logged to game history');
            setGameFinished(true);
            setGameActive(false);
            if (autoCallInterval.current) {
              clearInterval(autoCallInterval.current);
            }
          }
        } catch (declareError) {
          console.error("Failed to declare winner:", declareError);
        }
      } else {
        // If not a winner, auto-resume after 3 seconds
        setTimeout(() => {
          setShowWinnerResult(false);
          if (wasGameActiveBeforeCheck && !gameFinished) {
            resumeGame();
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to check winner:", error);
      toast({
        title: "Error",
        description: "Failed to verify winner. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch shop data for profit margin
  useEffect(() => {
    const fetchShopData = async () => {
      if (user?.shopId) {
        try {
          const response = await fetch(`/api/shops/${user.shopId}`);
          if (response.ok) {
            const data = await response.json();
            setShopData(data);
          }
        } catch (error) {
          console.error("Failed to fetch shop data:", error);
        }
      }
    };
    
    fetchShopData();
  }, [user?.shopId]);

  // Calculate winner payout based on admin-configurable profit margin
  const calculateWinnerPayout = (collectedAmount: number): number => {
    if (!shopData?.profitMargin) return collectedAmount * 0.7; // fallback to 30% profit
    
    const margin = parseFloat(shopData.profitMargin) || 0;
    const adminProfit = (collectedAmount * margin) / 100;
    return collectedAmount - adminProfit;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval.current) {
        clearInterval(autoCallInterval.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bingo Play</h1>
            <p className="text-gray-600">{user?.username} - {user?.role}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-xl font-bold text-gray-900">{bookedCartelas.size * parseInt(gameAmount)} Birr</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Winner Gets</p>
              <p className="text-xl font-bold text-green-600">{Math.floor(calculateWinnerPayout(bookedCartelas.size * parseInt(gameAmount)))} Birr</p>
            </div>
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
            >
              Log Out
            </Button>
          </div>
        </div>
        
        {shopData && (
          <div className="mt-2 text-sm text-gray-500 text-center">
            Shop Profit Margin: {shopData.profitMargin || 0}%
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Current Number & Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {/* Current Number Display */}
                <div className="text-center mb-6">
                  <div className="flex justify-center items-center space-x-2 mb-2">
                    <div className="w-12 h-12 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">
                      {lastCalledNumber ? getLetterForNumber(lastCalledNumber) : "N"}
                    </div>
                    <div className="w-12 h-12 bg-gray-800 text-white font-bold text-xl flex items-center justify-center rounded">
                      {lastCalledNumber || "35"}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {lastCalledNumber ? `${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}` : "N-35"}
                  </p>
                </div>

                {/* Main Action Button */}
                <div className="text-center mb-6">
                  <div className="w-32 h-32 mx-auto bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold border-4 border-blue-200 shadow-lg">
                    {gameActive ? "CALLING..." : "CALLING..."}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Generate Number</p>
                </div>

                {/* Game Settings */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="gameAmount" className="text-sm font-medium">Game Amount (Birr)</Label>
                    <Input
                      id="gameAmount"
                      type="number"
                      value={gameAmount}
                      onChange={(e) => setGameAmount(e.target.value)}
                      disabled={gameActive}
                      min="1"
                      step="1"
                      className="mt-1"
                    />
                  </div>

                  {/* Selected Cartelas Display */}
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Selected Cartelas</span>
                      {bookedCartelas.size > 0 && (
                        <span className="text-xs text-blue-600">{bookedCartelas.size} cartelas</span>
                      )}
                    </div>
                    {bookedCartelas.size > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {Array.from(bookedCartelas).sort((a, b) => a - b).slice(0, 10).map(num => (
                          <Badge key={num} variant="default" className="text-xs bg-green-600 text-white">
                            #{num}
                          </Badge>
                        ))}
                        {bookedCartelas.size > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{bookedCartelas.size - 10}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No cartelas selected yet</p>
                    )}
                  </div>
                </div>

                {/* Compact Action Buttons - Minimized */}
                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 py-1 text-xs"
                      >
                        Select
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Select Fixed Cartelas (1-75)</DialogTitle>
                        <DialogDescription>
                          Choose from 75 official fixed cartelas. Selected: {selectedCartelas.size} cartelas
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-10 gap-2 p-4">
                        {FIXED_CARTELAS.map(cartela => {
                          const num = cartela.Board;
                          const isBooked = bookedCartelas.has(num);
                          const isSelected = selectedCartelas.has(num);
                          return (
                            <div key={num} className="flex flex-col items-center space-y-1">
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                disabled={isBooked}
                                className={`h-12 w-12 ${
                                  isBooked 
                                    ? 'bg-red-500 text-white opacity-50' 
                                    : isSelected 
                                      ? 'bg-blue-600 text-white' 
                                      : 'hover:bg-blue-100'
                                }`}
                                onClick={() => toggleCartelaSelection(num)}
                              >
                                {num}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-12 text-xs p-0 hover:bg-gray-200"
                                onClick={() => previewCartelaByNumber(num)}
                              >
                                View
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between p-4">
                        <Button variant="outline" onClick={() => setShowCartelaSelector(false)}>
                          Close
                        </Button>
                        <Button 
                          onClick={bookSelectedCartelas}
                          disabled={selectedCartelas.size === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Book {selectedCartelas.size} Cartelas
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white py-1 text-xs"
                    onClick={resetGame}
                  >
                    Reset
                  </Button>

                  {gameActive ? (
                    <Button
                      onClick={pauseGame}
                      className="bg-orange-600 hover:bg-orange-700 text-white py-1 text-xs"
                    >
                      Pause
                    </Button>
                  ) : calledNumbers.length > 0 && !gameFinished ? (
                    <Button
                      onClick={resumeGame}
                      className="bg-green-600 hover:bg-green-700 text-white py-1 text-xs"
                    >
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={startGame}
                      disabled={bookedCartelas.size === 0}
                      className="bg-green-600 hover:bg-green-700 text-white py-1 text-xs"
                    >
                      Start
                    </Button>
                  )}

                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white py-1 text-xs"
                    onClick={shuffleNumbers}
                    disabled={isShuffling}
                  >
                    {isShuffling ? "..." : "Shuffle"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - BINGO Board */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-xl font-bold">
                  Called Numbers Board
                </CardTitle>
                <p className="text-center text-sm text-gray-600">
                  Numbers Called: {calledNumbers.length}
                </p>
              </CardHeader>
              <CardContent className="px-6">
                {/* BINGO Board - Horizontal Layout with Bold Numbers */}
                <div className="space-y-2">
                  {/* B Row */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">B</div>
                    <div className="flex space-x-2">
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(num => (
                        <div
                          key={num}
                          className={`w-10 h-10 text-center font-bold text-lg flex items-center justify-center rounded ${
                            calledNumbers.includes(num)
                              ? 'bg-green-600 text-white'
                              : isShuffling 
                                ? 'bg-gray-300 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* I Row */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">I</div>
                    <div className="flex space-x-2">
                      {[16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(num => (
                        <div
                          key={num}
                          className={`w-10 h-10 text-center font-bold text-lg flex items-center justify-center rounded ${
                            calledNumbers.includes(num)
                              ? 'bg-green-600 text-white'
                              : isShuffling 
                                ? 'bg-gray-300 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* N Row */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">N</div>
                    <div className="flex space-x-2">
                      {[31,32,33,34,35,36,37,38,39,40,41,42,43,44,45].map(num => (
                        <div
                          key={num}
                          className={`w-10 h-10 text-center font-bold text-lg flex items-center justify-center rounded ${
                            calledNumbers.includes(num)
                              ? 'bg-green-600 text-white'
                              : isShuffling 
                                ? 'bg-gray-300 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* G Row */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">G</div>
                    <div className="flex space-x-2">
                      {[46,47,48,49,50,51,52,53,54,55,56,57,58,59,60].map(num => (
                        <div
                          key={num}
                          className={`w-10 h-10 text-center font-bold text-lg flex items-center justify-center rounded ${
                            calledNumbers.includes(num)
                              ? 'bg-green-600 text-white'
                              : isShuffling 
                                ? 'bg-gray-300 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* O Row */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">O</div>
                    <div className="flex space-x-2">
                      {[61,62,63,64,65,66,67,68,69,70,71,72,73,74,75].map(num => (
                        <div
                          key={num}
                          className={`w-10 h-10 text-center font-bold text-lg flex items-center justify-center rounded ${
                            calledNumbers.includes(num)
                              ? 'bg-green-600 text-white'
                              : isShuffling 
                                ? 'bg-gray-300 animate-pulse'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Winner Check Button - Only button under the board */}
                <div className="flex justify-center mt-4">
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6"
                    disabled={!gameActive}
                    onClick={() => {
                      // Pause game immediately when check winner is clicked
                      setWasGameActiveBeforeCheck(gameActive);
                      if (gameActive) {
                        pauseGame();
                      }
                      setShowWinnerChecker(true);
                    }}
                  >
                    Check Winner
                  </Button>
                  
                  <Dialog open={showWinnerChecker} onOpenChange={setShowWinnerChecker}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Check Winner Cartela</DialogTitle>
                        <DialogDescription>
                          Enter the cartela number to check if it's a valid winner.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          type="number"
                          placeholder="Enter cartela number (1-100)"
                          value={winnerCartelaNumber}
                          onChange={(e) => setWinnerCartelaNumber(e.target.value)}
                          min="1"
                          max="100"
                        />
                        <div className="flex justify-between">
                          <Button variant="outline" onClick={() => setShowWinnerChecker(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={checkWinner}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Check Winner
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Winner Result Modal */}
        <Dialog open={showWinnerResult} onOpenChange={setShowWinnerResult}>
          <DialogContent className="max-w-md">
            <div className="text-center py-8">
              {winnerResult.isWinner ? (
                <div className="space-y-4">
                  <div className="text-6xl mb-4">🎉</div>
                  <div className="text-xl font-bold text-green-600">
                    Cartela Number: {winnerResult.cartela}
                  </div>
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                    Winner <span className="text-green-600">✓</span>
                  </div>
                  {winnerResult.pattern && (
                    <div className="text-lg text-gray-700">
                      Pattern: {winnerResult.pattern}
                    </div>
                  )}
                  <div className="text-gray-600 mt-4">
                    Prize: {Math.floor(bookedCartelas.size * parseInt(gameAmount) * 0.7)} Birr
                  </div>
                  <Button 
                    onClick={() => setShowWinnerResult(false)}
                    className="bg-green-600 hover:bg-green-700 text-white mt-4"
                  >
                    Continue
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl mb-4">❌</div>
                  <div className="text-xl font-bold text-red-600">
                    Cartela Number: {winnerResult.cartela}
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    Not a Winner
                  </div>
                  <div className="text-gray-600 mt-4">
                    Game will continue automatically in 3 seconds...
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: "33%"}}></div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Cartela Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cartela #{previewCartela?.Board} Preview</DialogTitle>
              <DialogDescription>
                Fixed cartela pattern - these numbers are always the same for this cartela
              </DialogDescription>
            </DialogHeader>
            {previewCartela && (
              <div className="space-y-4">
                {/* BINGO Header */}
                <div className="grid grid-cols-5 gap-1">
                  {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                    <div key={letter} className="h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold text-lg">
                      {letter}
                    </div>
                  ))}
                </div>
                
                {/* Cartela Grid */}
                <div className="grid grid-cols-5 gap-1">
                  {/* Row 1 */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={`row1-${i}`} className="h-10 border border-gray-300 flex items-center justify-center text-sm font-medium bg-white">
                      {i === 0 ? previewCartela.B[0] : 
                       i === 1 ? previewCartela.I[0] : 
                       i === 2 ? previewCartela.N[0] : 
                       i === 3 ? previewCartela.G[0] : 
                       previewCartela.O[0]}
                    </div>
                  ))}
                  
                  {/* Row 2 */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={`row2-${i}`} className="h-10 border border-gray-300 flex items-center justify-center text-sm font-medium bg-white">
                      {i === 0 ? previewCartela.B[1] : 
                       i === 1 ? previewCartela.I[1] : 
                       i === 2 ? previewCartela.N[1] : 
                       i === 3 ? previewCartela.G[1] : 
                       previewCartela.O[1]}
                    </div>
                  ))}
                  
                  {/* Row 3 (with FREE) */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={`row3-${i}`} className={`h-10 border border-gray-300 flex items-center justify-center text-sm font-medium ${i === 2 ? 'bg-yellow-200 text-yellow-800' : 'bg-white'}`}>
                      {i === 0 ? previewCartela.B[2] : 
                       i === 1 ? previewCartela.I[2] : 
                       i === 2 ? 'FREE' : 
                       i === 3 ? previewCartela.G[2] : 
                       previewCartela.O[2]}
                    </div>
                  ))}
                  
                  {/* Row 4 */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={`row4-${i}`} className="h-10 border border-gray-300 flex items-center justify-center text-sm font-medium bg-white">
                      {i === 0 ? previewCartela.B[3] : 
                       i === 1 ? previewCartela.I[3] : 
                       i === 2 ? previewCartela.N[3] : 
                       i === 3 ? previewCartela.G[3] : 
                       previewCartela.O[3]}
                    </div>
                  ))}
                  
                  {/* Row 5 */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={`row5-${i}`} className="h-10 border border-gray-300 flex items-center justify-center text-sm font-medium bg-white">
                      {i === 0 ? previewCartela.B[4] : 
                       i === 1 ? previewCartela.I[4] : 
                       i === 2 ? previewCartela.N[4] : 
                       i === 3 ? previewCartela.G[4] : 
                       previewCartela.O[4]}
                    </div>
                  ))}
                </div>
                
                <div className="text-center">
                  <Button 
                    onClick={() => setShowPreview(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Close Preview
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}