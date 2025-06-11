import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BingoNewEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoNewEmployeeDashboard({ onLogout }: BingoNewEmployeeDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [gameAmount, setGameAmount] = useState("30");
  const [autoplaySpeed, setAutoplaySpeed] = useState("3");
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [currentGame, setCurrentGame] = useState<any>(null);
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  
  // Use ref to track game state for reliable interval access
  const gameStateRef = useRef({
    active: false,
    finished: false,
    calledNumbers: [] as number[]
  });

  // Get active game
  const { data: activeGame, refetch: refetchActiveGame } = useQuery({
    queryKey: ['/api/games/active'],
    enabled: !!user
  });

  // Calculate total collected and prize amount (using 30% default admin margin)
  const totalCollected = bookedCartelas.size * parseFloat(gameAmount || "0");
  const adminProfitMargin = 30; // Default admin profit margin
  const prizeAmount = totalCollected * (1 - adminProfitMargin / 100); // Prize = Total - Admin Profit

  // Get game players
  const { data: gamePlayers, refetch: refetchPlayers } = useQuery({
    queryKey: ['/api/games', currentGame?.id, 'players'],
    enabled: !!currentGame?.id
  });

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: (data: { entryFee: string }) => apiRequest(`/api/games`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: (game) => {
      setCurrentGame(game);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Created",
        description: "New bingo game has been created successfully"
      });
    }
  });

  // Add players mutation
  const addPlayersMutation = useMutation({
    mutationFn: (data: { gameId: number; playerName: string; cartelas: number[]; entryFee: string }) => 
      apiRequest(`/api/games/${data.gameId}/players`, {
        method: 'POST',
        body: JSON.stringify({
          playerName: data.playerName,
          cartelas: data.cartelas,
          entryFee: data.entryFee
        })
      }),
    onSuccess: () => {
      refetchPlayers();
      toast({
        title: "Players Added",
        description: `${selectedCartelas.size} cartelas have been booked successfully`
      });
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: (gameId: number) => apiRequest(`/api/games/${gameId}/start`, {
      method: 'PATCH'
    }),
    onSuccess: () => {
      setGameActive(true);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Started",
        description: "Bingo game has started successfully"
      });
    }
  });

  // Update called numbers mutation
  const updateNumbersMutation = useMutation({
    mutationFn: (data: { gameId: number; calledNumbers: string[] }) => 
      apiRequest(`/api/games/${data.gameId}/numbers`, {
        method: 'PATCH',
        body: JSON.stringify({ calledNumbers: data.calledNumbers })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
    }
  });

  // Check winner mutation
  const checkWinnerMutation = useMutation({
    mutationFn: (data: { gameId: number; cartelaNumber: number; calledNumbers: number[] }) => 
      apiRequest(`/api/games/${data.gameId}/check-winner`, {
        method: 'POST',
        body: JSON.stringify({
          cartelaNumber: data.cartelaNumber,
          calledNumbers: data.calledNumbers
        })
      }),
    onSuccess: (result) => {
      if (result.isWinner) {
        toast({
          title: "BINGO! Winner Found!",
          description: `Cartela #${result.cartelaNumber} is a valid winner!`,
          variant: "default"
        });
      } else {
        toast({
          title: "Not a Winner",
          description: `Cartela #${result.cartelaNumber} is not a valid winner yet`,
          variant: "destructive"
        });
      }
    }
  });

  // Complete game mutation
  const completeGameMutation = useMutation({
    mutationFn: (data: { gameId: number; winnerId: number; winnerName: string; winningCartela: string; prizeAmount: string }) => 
      apiRequest(`/api/games/${data.gameId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setGameActive(false);
      setGameFinished(true);
      setCurrentGame(null);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Completed",
        description: "Game has been completed and winner has been recorded"
      });
    }
  });

  // Play Amharic audio for number announcements
  const playAmharicAudio = (number: number) => {
    try {
      const letter = getLetterForNumber(number);
      const audioFile = `${letter}${number}.mp3`;
      const audio = new Audio(`/attached_assets/${audioFile}`);
      audio.volume = 0.9;
      audio.play().catch((error) => {
        console.error(`Failed to play audio file ${audioFile}:`, error);
      });
    } catch (error) {
      console.error(`Error loading audio file for ${getLetterForNumber(number)}${number}:`, error);
    }
  };

  // Get letter for number
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "";
  };

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current.active = gameActive;
    gameStateRef.current.finished = gameFinished;
    gameStateRef.current.calledNumbers = calledNumbers;
  }, [gameActive, gameFinished, calledNumbers]);

  // Generate next random number
  const callNumber = () => {
    if (!gameStateRef.current.active || gameStateRef.current.finished) {
      return;
    }
    
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(num => !gameStateRef.current.calledNumbers.includes(num));
    
    if (availableNumbers.length === 0) {
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    setCurrentNumber(newNumber);
    playAmharicAudio(newNumber);
    
    const updated = [...gameStateRef.current.calledNumbers, newNumber];
    setCalledNumbers(updated);
    
    // Update backend
    if (currentGame?.id) {
      updateNumbersMutation.mutate({
        gameId: currentGame.id,
        calledNumbers: updated.map(n => n.toString())
      });
    }
    
    if (updated.length === 75) {
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
    }
  };

  // Start automatic calling
  const startAutoCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
    }
    
    const interval = setInterval(() => {
      callNumber();
    }, parseInt(autoplaySpeed) * 1000);
    setAutoCallInterval(interval);
  };

  // Stop automatic calling
  const stopAutoCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
  };

  // Create new game
  const createNewGame = () => {
    createGameMutation.mutate({ entryFee: gameAmount });
  };

  // Start game
  const startGame = () => {
    if (bookedCartelas.size === 0) {
      toast({
        title: "No Cartelas Booked",
        description: "Please book at least one cartela before starting the game",
        variant: "destructive"
      });
      return;
    }

    if (!currentGame) {
      createNewGame();
      return;
    }

    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameFinished(false);
    setGameActive(true);
    
    // Start the game in backend
    startGameMutation.mutate(currentGame.id);
    
    // Start auto calling
    startAutoCalling();
  };

  // Pause game function
  const pauseGame = () => {
    setGameActive(false);
    stopAutoCalling();
  };

  // Resume game function  
  const resumeGame = () => {
    setGameActive(true);
    startAutoCalling();
  };

  // Reset game
  const resetGame = () => {
    stopAutoCalling();
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setGameFinished(false);
    setBookedCartelas(new Set());
    setCurrentGame(null);
  };

  // Fixed cartela patterns
  const getFixedCartelaCard = (cartelaNum: number) => {
    const createFixedPattern = (num: number): number[][] => {
      let seed = num * 12345;
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      
      const card: number[][] = [[], [], [], [], []];
      const ranges = [
        [1, 15],   // B column
        [16, 30],  // I column  
        [31, 45],  // N column
        [46, 60],  // G column
        [61, 75]   // O column
      ];

      for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const columnNumbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        for (let i = columnNumbers.length - 1; i > 0; i--) {
          const j = Math.floor(seededRandom() * (i + 1));
          [columnNumbers[i], columnNumbers[j]] = [columnNumbers[j], columnNumbers[i]];
        }
        
        for (let row = 0; row < 5; row++) {
          if (col === 2 && row === 2) {
            card[row].push(0); // FREE space in center
          } else {
            const numberIndex = row < 2 ? row : row - 1;
            card[row].push(columnNumbers[numberIndex]);
          }
        }
      }
      
      return card;
    };

    return createFixedPattern(cartelaNum);
  };

  // Toggle cartela selection (multiple selection)
  const toggleCartelaSelection = (cartelaNum: number) => {
    const newSelection = new Set(selectedCartelas);
    if (newSelection.has(cartelaNum)) {
      newSelection.delete(cartelaNum);
    } else {
      newSelection.add(cartelaNum);
    }
    setSelectedCartelas(newSelection);
  };

  // Book selected cartelas
  const bookSelectedCartelas = () => {
    if (selectedCartelas.size === 0) {
      toast({
        title: "No Cartelas Selected",
        description: "Please select at least one cartela to book",
        variant: "destructive"
      });
      return;
    }

    if (!currentGame) {
      // Create game first
      createGameMutation.mutate({ entryFee: gameAmount });
      return;
    }

    // Add players for selected cartelas
    addPlayersMutation.mutate({
      gameId: currentGame.id,
      playerName: "Player",
      cartelas: Array.from(selectedCartelas),
      entryFee: gameAmount
    });

    // Update booked cartelas
    setBookedCartelas(prev => new Set([...Array.from(prev), ...Array.from(selectedCartelas)]));
    setSelectedCartelas(new Set());
    setShowCartelaSelector(false);
  };

  // Clear selected cartelas
  const clearSelectedCartelas = () => {
    setSelectedCartelas(new Set());
  };

  // Check winner cartela
  const checkWinnerCartela = () => {
    // Pause the game immediately when checking for winner
    if (gameActive) {
      pauseGame();
      toast({
        title: "Game Paused",
        description: "Game paused for winner verification",
      });
    }

    const cartelaNum = parseInt(winnerCartelaNumber);
    if (!cartelaNum || !currentGame?.id) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid cartela number",
        variant: "destructive"
      });
      return;
    }

    checkWinnerMutation.mutate({
      gameId: currentGame.id,
      cartelaNumber: cartelaNum,
      calledNumbers
    });
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
    };
  }, [autoCallInterval]);

  // Initialize active game
  useEffect(() => {
    if (activeGame) {
      setCurrentGame(activeGame);
      if (activeGame.calledNumbers) {
        setCalledNumbers(activeGame.calledNumbers.map((n: string) => parseInt(n)));
      }
      if (activeGame.status === 'active') {
        setGameActive(true);
      }
    }
  }, [activeGame]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name || user?.username}</p>
            {currentGame && (
              <Badge variant="secondary" className="mt-1">
                Game ID: {currentGame.id} | Status: {currentGame.status}
              </Badge>
            )}
          </div>
          <Button onClick={onLogout} variant="outline">
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Game Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Game Amount (Birr)
                  </label>
                  <Input
                    type="number"
                    value={gameAmount}
                    onChange={(e) => setGameAmount(e.target.value)}
                    disabled={gameActive}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Current: {gameAmount} Birr per card
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Autoplay Speed (seconds)
                  </label>
                  <Select value={autoplaySpeed} onValueChange={setAutoplaySpeed}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 second</SelectItem>
                      <SelectItem value="2">2 seconds</SelectItem>
                      <SelectItem value="3">3 seconds</SelectItem>
                      <SelectItem value="4">4 seconds</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Cartelas Display */}
                {selectedCartelas.size > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-gray-700">Selected Cartelas ({selectedCartelas.size})</p>
                      <Button 
                        onClick={clearSelectedCartelas}
                        variant="ghost" 
                        size="sm"
                        className="text-xs h-6 px-2"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {Array.from(selectedCartelas).sort((a, b) => a - b).map(num => (
                        <Badge 
                          key={num} 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-red-100"
                          onClick={() => toggleCartelaSelection(num)}
                        >
                          #{num}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total: {(selectedCartelas.size * parseFloat(gameAmount || "0")).toFixed(2)} Birr
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="text-center space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Collected</p>
                      <p className="text-2xl font-bold text-blue-600">{totalCollected.toFixed(2)} Birr</p>
                      <p className="text-sm text-gray-500">{bookedCartelas.size} cards × {gameAmount} Birr</p>
                    </div>
                    {totalCollected > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-gray-700">Winner Gets</p>
                        <p className="text-xl font-bold text-green-600">{prizeAmount.toFixed(2)} Birr</p>
                        <p className="text-xs text-gray-500">{(100 - adminProfitMargin).toFixed(0)}% of total collected</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <div className="space-y-3">
              {!gameActive && !gameFinished ? (
                <Button 
                  onClick={startGame}
                  disabled={createGameMutation.isPending || bookedCartelas.size === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {createGameMutation.isPending ? "Creating Game..." : "Start Game"}
                </Button>
              ) : gameActive ? (
                <Button
                  onClick={pauseGame}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="lg"
                >
                  Pause Game
                </Button>
              ) : (
                <Button
                  onClick={resumeGame}
                  disabled={gameFinished}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Resume Game
                </Button>
              )}
              
              <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    size="lg"
                  >
                    Select Multiple Cartelas
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Select Multiple Cartelas (1-100)</DialogTitle>
                    <DialogDescription>
                      Choose multiple cartelas. Each number has a unique, fixed pattern.
                      Selected: {selectedCartelas.size} cartelas
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-10 gap-2 p-4">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                      const isBooked = bookedCartelas.has(num);
                      const isSelected = selectedCartelas.has(num);
                      return (
                        <div key={num} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cartela-${num}`}
                            checked={isSelected}
                            disabled={isBooked}
                            onCheckedChange={() => toggleCartelaSelection(num)}
                          />
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={isBooked}
                            className={`h-12 ${
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
                      disabled={selectedCartelas.size === 0 || addPlayersMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addPlayersMutation.isPending ? "Booking..." : `Book ${selectedCartelas.size} Cartelas`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Winner Checker */}
              <Dialog open={showWinnerChecker} onOpenChange={setShowWinnerChecker}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                    size="lg"
                    disabled={!gameActive}
                  >
                    Check Winner Cartela
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check Winner Cartela</DialogTitle>
                    <DialogDescription>
                      Enter the cartela number to check if it's a valid winner based on called numbers.
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
                        onClick={checkWinnerCartela}
                        disabled={checkWinnerMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {checkWinnerMutation.isPending ? "Checking..." : "Check Winner"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={resetGame}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Reset Game
              </Button>
            </div>
          </div>

          {/* Center Panel - Let's Play BINGO! */}
          <div className="flex flex-col justify-center items-center">
            <div className="w-64 h-64 bg-blue-500 rounded-full flex items-center justify-center text-white text-center">
              <div>
                <p className="text-lg font-medium">Let's Play</p>
                <p className="text-2xl font-bold">BINGO!</p>
              </div>
            </div>
            
            {currentNumber && (
              <div className="mt-8 text-center">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {getLetterForNumber(currentNumber)}{currentNumber}
                </div>
                <p className="text-lg text-gray-600">Latest Called Number</p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold">{calledNumbers.length} / 75 numbers called</p>
              {gameActive && (
                <p className="text-green-600 font-medium">Game Active</p>
              )}
              {gameFinished && (
                <p className="text-red-600 font-medium">Game Finished</p>
              )}
            </div>

            {/* Game Players Display */}
            {gamePlayers && gamePlayers.length > 0 && (
              <div className="mt-6 w-full max-w-md">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Booked Cartelas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {gamePlayers.map((player: any) => (
                        <Badge key={player.id} variant="secondary">
                          #{player.cartelaNumbers[0]}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel - Called Numbers */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Called Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                {/* BINGO Headers */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="text-center font-bold text-white bg-red-500 py-2 rounded">B</div>
                  <div className="text-center font-bold text-white bg-blue-500 py-2 rounded">I</div>
                  <div className="text-center font-bold text-white bg-green-500 py-2 rounded">N</div>
                  <div className="text-center font-bold text-white bg-yellow-500 py-2 rounded">G</div>
                  <div className="text-center font-bold text-white bg-purple-500 py-2 rounded">O</div>
                </div>
                
                {/* Numbers Grid */}
                <div className="grid grid-cols-5 gap-1 text-sm">
                  {Array.from({ length: 15 }, (_, row) => 
                    Array.from({ length: 5 }, (_, col) => {
                      const num = (col * 15) + row + 1;
                      const isCalled = calledNumbers.includes(num);
                      return (
                        <div
                          key={num}
                          className={`p-2 text-center rounded transition-colors ${
                            isCalled
                              ? 'bg-gray-800 text-white font-bold'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {num}
                        </div>
                      );
                    })
                  ).flat()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}