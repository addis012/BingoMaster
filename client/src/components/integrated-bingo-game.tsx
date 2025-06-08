import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IntegratedBingoGameProps {
  employeeName: string;
  employeeId: number;
  shopId: number;
  onLogout: () => void;
}

export default function IntegratedBingoGame({ employeeName, employeeId, shopId, onLogout }: IntegratedBingoGameProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [lastCalledLetter, setLastCalledLetter] = useState<string>("");
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [cartelaCards, setCartelaCards] = useState<{[key: number]: number[][]}>({});
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [gameAmount, setGameAmount] = useState("30");
  const [winnerFound, setWinnerFound] = useState<string | null>(null);
  const [winnerPattern, setWinnerPattern] = useState<string | null>(null);
  const [showWinnerVerification, setShowWinnerVerification] = useState(false);
  const [verificationCartela, setVerificationCartela] = useState("");
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [totalCollected, setTotalCollected] = useState(0);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [gamePlayersMap, setGamePlayersMap] = useState<Map<number, number>>(new Map());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch shop data for profit margin calculation
  const { data: shopData } = useQuery({
    queryKey: ["/api/shops", shopId],
    enabled: !!shopId,
  });

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          employeeId,
          status: 'waiting',
          entryFee: gameAmount,
          prizePool: "0.00"
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to create game");
      }
      
      return response.json();
    },
    onSuccess: (game) => {
      setActiveGameId(game.id);
      console.log("Game created:", game);
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      return await apiRequest("POST", `/api/games/${gameId}/start`);
    },
    onSuccess: () => {
      console.log("Game started successfully");
    }
  });

  // Add player mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (data: { gameId: number; cartelaNumbers: number[]; playerName: string }) => {
      return await apiRequest("POST", `/api/games/${data.gameId}/players`, {
        playerName: data.playerName,
        cartelaNumbers: data.cartelaNumbers,
        entryFee: gameAmount
      });
    },
    onSuccess: (player, variables) => {
      setGamePlayersMap(prev => new Map(prev.set(variables.cartelaNumbers[0], player.id)));
      console.log("Player added:", player);
    }
  });

  // Update game prize pool mutation
  const updateGameMutation = useMutation({
    mutationFn: async (data: { gameId: number; prizePool: string }) => {
      return await apiRequest("PATCH", `/api/games/${data.gameId}`, {
        prizePool: data.prizePool
      });
    }
  });

  // Declare winner mutation
  const declareWinnerMutation = useMutation({
    mutationFn: async (data: { gameId: number; winnerId: number }) => {
      return await apiRequest("POST", `/api/games/${data.gameId}/declare-winner`, {
        winnerId: data.winnerId
      });
    },
    onSuccess: (result) => {
      toast({
        title: "Game Completed Successfully!",
        description: `Winner gets ${result.financial.prizeAmount} ETB. Admin profit: ${result.financial.adminProfit} ETB. Commission: ${result.financial.superAdminCommission} ETB deducted.`,
      });
      
      // Reset game state
      setActiveGameId(null);
      setGamePlayersMap(new Map());
      setBookedCartelas(new Set());
      setTotalCollected(0);
      setGameActive(false);
      setGameFinished(true);
      
      // Refresh admin dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit/balance"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Get letter for BINGO number
  const getLetterForNumber = (number: number): string => {
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
    return '';
  };

  // Generate a random cartela
  const generateCartela = () => {
    const cartela: number[][] = [];
    const ranges = [
      [1, 15],   // B column
      [16, 30],  // I column
      [31, 45],  // N column  
      [46, 60],  // G column
      [61, 75]   // O column
    ];

    for (let col = 0; col < 5; col++) {
      const column: number[] = [];
      const [min, max] = ranges[col];
      const usedNumbers = new Set<number>();
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          column.push(0); // FREE space
        } else {
          let num;
          do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
          } while (usedNumbers.has(num));
          usedNumbers.add(num);
          column.push(num);
        }
      }
      cartela.push(column);
    }

    // Transpose to get row-major format
    const transposed: number[][] = [];
    for (let row = 0; row < 5; row++) {
      transposed.push([]);
      for (let col = 0; col < 5; col++) {
        transposed[row].push(cartela[col][row]);
      }
    }
    
    return transposed;
  };

  // Generate random cartela number
  const generateCartelaNumber = () => {
    let cartelaNum;
    do {
      cartelaNum = Math.floor(Math.random() * 100) + 1;
    } while (cartelaCards[cartelaNum] || bookedCartelas.has(cartelaNum));
    return cartelaNum;
  };

  // Show cartela selector
  const showCartelaSelectorDialog = () => {
    const cartelaNumber = generateCartelaNumber();
    setSelectedCartela(cartelaNumber);
    setCartelaCards(prev => ({
      ...prev,
      [cartelaNumber]: generateCartela()
    }));
    setShowCartelaSelector(true);
  };

  // Book a cartela for the game
  const bookCartela = async () => {
    if (selectedCartela !== null) {
      try {
        let gameId = activeGameId;
        
        // Create game if none exists
        if (!gameId) {
          const game = await createGameMutation.mutateAsync();
          gameId = game.id;
        }
        
        // Add player to the game
        const player = await addPlayerMutation.mutateAsync({
          gameId: gameId,
          cartelaNumbers: [selectedCartela],
          playerName: `Player ${selectedCartela}`
        });

        setBookedCartelas(prev => new Set([...prev, selectedCartela]));
        const newTotal = totalCollected + parseInt(gameAmount);
        setTotalCollected(newTotal);
        
        console.log(`Game ${gameId}: Added player ${player.id} with cartela ${selectedCartela} for ${gameAmount} ETB`);
        
        setShowCartelaSelector(false);
        setSelectedCartela(null);
        
        toast({
          title: "Cartela Booked!",
          description: `Cartela #${selectedCartela} booked for ${gameAmount} ETB`,
        });
      } catch (error) {
        console.error("Failed to book cartela:", error);
        toast({
          title: "Error",
          description: "Failed to book cartela",
          variant: "destructive",
        });
      }
    }
  };

  // Call a random number
  const callNumber = () => {
    console.log("🎯 callNumber invoked", {
      gameActive,
      gamePaused,
      gameFinished,
      calledNumbersLength: calledNumbers.length
    });

    if (!gameActive || gamePaused || gameFinished) {
      console.log("❌ Game not in correct state for calling numbers");
      return;
    }

    const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
      .filter(num => !calledNumbers.includes(num));
      
    console.log("📊 Available numbers:", availableNumbers.length, "out of 75");

    if (availableNumbers.length === 0) {
      console.log("🏁 No more numbers to call");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    const letter = getLetterForNumber(number);
    
    console.log("🔊 Calling number:", number, "Letter:", letter);

    setCurrentNumber(number);
    setCalledNumbers(prev => [...prev, number]);
    setLastCalledLetter(letter);

    // Play audio
    const audioFileName = `${letter}${number}.mp3`;
    console.log("🎵 Playing your custom audio:", audioFileName);
    
    try {
      const audio = new Audio(`/attached_assets/${audioFileName}`);
      audio.play().catch(err => {
        console.log("🔇 Could not play audio:", err.message);
        // Try fallback audio or continue silently
      });
    } catch (error) {
      console.log("🔇 Audio playback failed:", error);
    }

    console.log("📝 Updated called numbers count:", calledNumbers.length + 1);

    // Check for winner after 20 numbers
    if (calledNumbers.length >= 19) {
      checkForWinner();
    }
  };

  // Check for winner after each number call - proper bingo pattern validation
  const checkForWinner = () => {
    if (bookedCartelas.size === 0 || calledNumbers.length < 5) return;
    
    // Check each booked cartela for winning patterns
    for (const cartelaNumber of bookedCartelas) {
      const card = cartelaCards[cartelaNumber];
      if (!card) continue;
      
      const winResult = checkForBingo(card, calledNumbers);
      if (winResult.hasWin) {
        setWinnerFound(`Cartela #${cartelaNumber}`);
        setWinnerPattern(winResult.pattern || "BINGO");
        setGameActive(false);
        stopAutomaticNumberCalling();
        
        console.log(`Winner found! Cartela #${cartelaNumber} with ${winResult.pattern}`);
        console.log("Current game state:", { activeGameId, gamePlayersMap: Array.from(gamePlayersMap.entries()) });
        
        // Show winner announcement for 3 seconds then automatically declare
        setTimeout(() => {
          console.log("Attempting automatic winner declaration for cartela:", cartelaNumber);
          declareWinnerAutomatically(cartelaNumber);
        }, 3000); // 3 second delay to show winner announcement
        
        return; // Stop checking once winner is found
      }
    }
  };

  // Check for Bingo winning patterns
  const checkForBingo = (card: number[][], calledNums: number[]): { hasWin: boolean; pattern?: string; patternCells?: number[][] } => {
    const isMarked = (row: number, col: number) => {
      if (row === 2 && col === 2) return true; // Center is free space
      return calledNums.includes(card[row][col]);
    };

    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      if (card[row].every((_, col) => isMarked(row, col))) {
        return { hasWin: true, pattern: `Row ${row + 1}` };
      }
    }

    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      if (card.every((_, row) => isMarked(row, col))) {
        return { hasWin: true, pattern: `Column ${col + 1}` };
      }
    }

    // Check diagonal (top-left to bottom-right)
    if (card.every((_, i) => isMarked(i, i))) {
      return { hasWin: true, pattern: "Diagonal \\" };
    }

    // Check diagonal (top-right to bottom-left)
    if (card.every((_, i) => isMarked(i, 4 - i))) {
      return { hasWin: true, pattern: "Diagonal /" };
    }

    // Check four corners
    if (isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4)) {
      return { hasWin: true, pattern: "Four Corners" };
    }

    return { hasWin: false };
  };

  // Automatically declare winner in backend
  const declareWinnerAutomatically = async (cartelaNumber: number) => {
    console.log("declareWinnerAutomatically called with:", { cartelaNumber, activeGameId, gamePlayersMapSize: gamePlayersMap.size });
    
    if (!activeGameId) {
      console.error("Cannot declare winner - no active game");
      toast({
        title: "Recording Error",
        description: "No active game found to record winner",
        variant: "destructive"
      });
      return;
    }
    
    const winnerId = gamePlayersMap.get(cartelaNumber);
    if (!winnerId) {
      console.error("Winner ID not found in gamePlayersMap:", { cartelaNumber, gamePlayersMap: Array.from(gamePlayersMap.entries()) });
      toast({
        title: "Recording Error", 
        description: "Winner player not found in game records",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Auto-declaring winner:", { cartelaNumber, winnerId, activeGameId });
      
      const result = await declareWinnerMutation.mutateAsync({
        gameId: activeGameId,
        winnerId: winnerId
      });
      
      console.log("Winner successfully declared in backend!", result);
      
      toast({
        title: "Game Completed!",
        description: `Cartela #${cartelaNumber} wins! Game recorded successfully.`,
      });
      
    } catch (error) {
      console.error("Failed to declare winner automatically:", error);
      toast({
        title: "Recording Error",
        description: "Game completed but failed to record in database",
        variant: "destructive"
      });
    }
  };

  // Verify and declare winner
  const verifyWinner = async () => {
    if (!winnerFound || !activeGameId) {
      console.error("Cannot declare winner - missing data:", { winnerFound, activeGameId });
      toast({
        title: "Error",
        description: "Cannot declare winner - missing game or winner data",
        variant: "destructive"
      });
      return;
    }
    
    const cartelaNumber = parseInt(winnerFound.replace('Cartela #', ''));
    const winnerId = gamePlayersMap.get(cartelaNumber);
    
    console.log("Declaring winner:", { 
      cartelaNumber, 
      winnerId, 
      activeGameId, 
      gamePlayersMap: Array.from(gamePlayersMap.entries()) 
    });
    
    if (!winnerId) {
      console.error("Winner ID not found in gamePlayersMap:", { cartelaNumber, gamePlayersMap });
      toast({
        title: "Error",
        description: "Winner player not found in game records",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Calling declare winner API for game", activeGameId, "winner", winnerId);
      await declareWinnerMutation.mutateAsync({
        gameId: activeGameId,
        winnerId: winnerId
      });
      
      setShowWinnerVerification(false);
      setWinnerFound(null);
    } catch (error) {
      console.error("Failed to declare winner:", error);
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Start automatic number calling
  const startAutomaticNumberCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
    }
    
    const interval = setInterval(() => {
      callNumber();
    }, 3000);
    
    setAutoCallInterval(interval);
  };

  const stopAutomaticNumberCalling = () => {
    console.log("🛑 Stopping automatic calling");
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
      console.log("✅ Interval cleared");
    }
  };

  // Reset game
  const resetGame = () => {
    console.log("🔄 Resetting game");
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setGameFinished(false);
    setGamePaused(false);
    setWinnerFound(null);
    setWinnerPattern(null);
    setLastCalledLetter("");
    stopAutomaticNumberCalling();
  };

  // Start game
  const startGame = async () => {
    if (bookedCartelas.size === 0) {
      toast({
        title: "Cannot Start Game",
        description: "Please book at least one cartela first",
        variant: "destructive"
      });
      return;
    }

    if (!activeGameId) {
      toast({
        title: "Error",
        description: "No active game found",
        variant: "destructive"
      });
      return;
    }

    try {
      await startGameMutation.mutateAsync(activeGameId);
      
      setGameActive(true);
      setGameFinished(false);
      setGamePaused(false);
      setCalledNumbers([]);
      setCurrentNumber(null);
      setWinnerFound(null);
      setLastCalledLetter("");
      
      // Start automatic number calling
      setTimeout(() => {
        callNumber();
        startAutomaticNumberCalling();
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive"
      });
    }
  };

  // Calculate winner payout based on profit margin
  const calculateWinnerPayout = (collectedAmount: number): number => {
    if (!shopData?.profitMargin) return collectedAmount;
    
    const margin = parseFloat(shopData.profitMargin) || 0;
    const adminProfit = (collectedAmount * margin) / 100;
    return collectedAmount - adminProfit;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
    };
  }, [autoCallInterval]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="text-gray-600">Welcome, {employeeName}</p>
        </div>
        <Button onClick={onLogout} variant="outline">
          Logout
        </Button>
      </div>

      {/* Winner Verification Dialog */}
      <Dialog open={showWinnerVerification} onOpenChange={setShowWinnerVerification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 BINGO! Winner Found!</DialogTitle>
            <DialogDescription>
              {winnerFound} claims {winnerPattern}!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                Prize: {calculateWinnerPayout(totalCollected).toFixed(2)} ETB
              </p>
              <p className="text-sm text-gray-600">
                (From {totalCollected} ETB total collected)
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyWinner} className="flex-1 bg-green-500 hover:bg-green-600">
                Verify & Pay Winner
              </Button>
              <Button 
                onClick={() => {
                  setShowWinnerVerification(false);
                  setWinnerFound(null);
                  setGameActive(true);
                  startAutomaticNumberCalling();
                }} 
                variant="outline" 
                className="flex-1"
              >
                Continue Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Game Controls */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Game Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Amount per Cartela (ETB)
                </label>
                <Input
                  type="number"
                  value={gameAmount}
                  onChange={(e) => setGameAmount(e.target.value)}
                  disabled={gameActive || bookedCartelas.size > 0}
                  className="w-full"
                />
              </div>

              {/* Total Collected */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Total Collected</h3>
                <p className="text-2xl font-bold text-blue-600">{totalCollected.toFixed(2)} Birr</p>
                <p className="text-sm text-blue-700">{bookedCartelas.size} cards × {gameAmount} Birr</p>
              </div>

              {/* Winner Announcement */}
              {winnerFound && (
                <div className="bg-green-100 border-2 border-green-300 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎉 BINGO! 🎉</div>
                  <div className="font-bold text-green-800">{winnerFound} WINS!</div>
                  <div className="text-green-700">Prize: {calculateWinnerPayout(totalCollected).toFixed(2)} Birr</div>
                </div>
              )}

              {/* Cartela Selector */}
              <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={showCartelaSelectorDialog}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    disabled={gameActive}
                  >
                    Select Cartela
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Your Cartela</DialogTitle>
                    <DialogDescription>
                      Cartela #{selectedCartela}
                    </DialogDescription>
                  </DialogHeader>
                  {selectedCartela && cartelaCards[selectedCartela] && (
                    <div className="space-y-4">
                      {/* BINGO Headers */}
                      <div className="grid grid-cols-5 gap-1">
                        {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                          const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                          return (
                            <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold`}>
                              {letter}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Numbers Grid */}
                      <div className="grid grid-cols-5 gap-1">
                        {cartelaCards[selectedCartela].flat().map((num, index) => (
                          <div
                            key={index}
                            className={`h-8 border border-gray-400 flex items-center justify-center text-sm font-medium ${
                              num === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-white'
                            }`}
                          >
                            {num === 0 ? 'FREE' : num}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2 mt-4 justify-center">
                        <Button 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={bookCartela}
                          disabled={createGameMutation.isPending || addPlayerMutation.isPending}
                        >
                          {createGameMutation.isPending || addPlayerMutation.isPending ? "Booking..." : `Book Card (${gameAmount} Birr)`}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setShowCartelaSelector(false);
                            setSelectedCartela(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Button 
                onClick={startGame}
                className="w-full bg-green-500 hover:bg-green-600"
                disabled={gameActive || bookedCartelas.size === 0 || startGameMutation.isPending}
              >
                {startGameMutation.isPending ? "Starting..." : gameActive ? "Game Running..." : "Start Game"}
              </Button>

              {gameActive && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setGamePaused(!gamePaused);
                      if (gamePaused) {
                        startAutomaticNumberCalling();
                      } else {
                        stopAutomaticNumberCalling();
                      }
                    }}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                  >
                    {gamePaused ? "Resume Game" : "Pause Game"}
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setGameActive(false);
                      setGameFinished(true);
                      stopAutomaticNumberCalling();
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    End Game
                  </Button>
                </div>
              )}

              <Button 
                onClick={resetGame}
                variant="outline"
                className="w-full"
              >
                Reset Game
              </Button>

              <Button 
                onClick={() => window.location.href = '/dashboard/employee'}
                variant="outline"
                className="w-full"
              >
                Start Autoplay
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Called Numbers Board */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Called Numbers</span>
                {currentNumber && (
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-green-100 text-green-800">
                    {lastCalledLetter}{currentNumber}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* BINGO Headers */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                  return (
                    <div key={letter} className={`h-12 ${colors[index]} text-white rounded-lg flex items-center justify-center font-bold text-xl`}>
                      {letter}
                    </div>
                  );
                })}
              </div>

              {/* Numbers Grid */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({length: 5}, (_, colIndex) => {
                  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
                  const [start, end] = ranges[colIndex];
                  return Array.from({length: end - start + 1}, (_, rowIndex) => start + rowIndex);
                }).map((column, colIndex) => (
                  <div key={colIndex} className="space-y-1">
                    {column.map(number => (
                      <div
                        key={number}
                        className={`h-8 w-full rounded flex items-center justify-center text-sm font-medium border transition-all ${
                          calledNumbers.includes(number)
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 border-gray-300 text-gray-700'
                        } ${
                          currentNumber === number ? 'ring-2 ring-yellow-400 bg-yellow-200 text-yellow-800' : ''
                        }`}
                      >
                        {number}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center text-sm text-gray-600">
                {calledNumbers.length} / 75 numbers called
              </div>

              {/* Booked Cartelas */}
              {bookedCartelas.size > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Booked Cartelas ({bookedCartelas.size})</h3>
                  <div className="flex flex-wrap gap-1">
                    {[...bookedCartelas].map(num => (
                      <Badge key={num} variant="outline" className="text-xs">
                        #{num}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}