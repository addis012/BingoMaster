import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const { user } = useAuth();
  
  // Fetch shop data to get profit margin
  const { data: shops } = useQuery({
    queryKey: ['/api/shops'],
  });
  
  const currentShop = shops?.find((shop: any) => shop.id === user?.shopId);
  const profitMarginPercentage = currentShop?.profitMargin || 0;
  
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [lastCalledLetter, setLastCalledLetter] = useState<string>("");

  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [cartelaCards, setCartelaCards] = useState<{[key: number]: number[][]}>({});
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [gameAmount, setGameAmount] = useState("10");
  const [winnerFound, setWinnerFound] = useState<string | null>(null);
  const [winnerPattern, setWinnerPattern] = useState<string | null>(null);
  const [winnerPatternCells, setWinnerPatternCells] = useState<number[][] | null>(null);
  const [winnerCartelaCard, setWinnerCartelaCard] = useState<number[][] | null>(null);
  const [showWinnerVerification, setShowWinnerVerification] = useState(false);
  const [verificationCartela, setVerificationCartela] = useState("");
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  
  // Calculate total collected and winner payout
  const totalCollected = bookedCartelas.size * parseFloat(gameAmount || "0");
  const winnerPayout = totalCollected * (1 - profitMarginPercentage / 100);
  
  // Use ref to track game state for reliable interval access
  const gameStateRef = useRef({
    active: false,
    paused: false,
    finished: false,
    calledNumbers: [] as number[]
  });

  // Play Amharic audio for number announcements (only your uploaded files)
  const playAmharicAudio = (number: number) => {
    try {
      const letter = getLetterForNumber(number);
      const audioFile = `${letter}${number}.mp3`;
      
      console.log(`🎵 Playing your custom audio: ${audioFile}`);
      
      // Use direct path for static assets - only your uploaded files
      const audio = new Audio(`/attached_assets/${audioFile}`);
      audio.volume = 0.9;
      audio.play().catch((error) => {
        console.error(`Failed to play your audio file ${audioFile}:`, error);
      });
    } catch (error) {
      console.error(`Error loading audio file for ${getLetterForNumber(number)}${number}:`, error);
    }
  };

  // Check for Bingo winning patterns and return pattern info
  const checkForBingo = (card: number[][], calledNums: number[]): { hasWin: boolean; pattern?: string; patternCells?: number[][] } => {
    // Helper function to check if number is called (center is free space)
    const isMarked = (row: number, col: number) => {
      if (row === 2 && col === 2) return true; // Center is free space
      return calledNums.includes(card[row][col]);
    };

    // Pattern 1: Any horizontal line
    for (let row = 0; row < 5; row++) {
      if ([0, 1, 2, 3, 4].every(col => isMarked(row, col))) {
        return { 
          hasWin: true, 
          pattern: `Horizontal Line (Row ${row + 1})`,
          patternCells: [[row, 0], [row, 1], [row, 2], [row, 3], [row, 4]]
        };
      }
    }
    
    // Pattern 2: Any vertical line
    for (let col = 0; col < 5; col++) {
      const colNames = ['B', 'I', 'N', 'G', 'O'];
      if ([0, 1, 2, 3, 4].every(row => isMarked(row, col))) {
        return { 
          hasWin: true, 
          pattern: `Vertical Line (${colNames[col]} Column)`,
          patternCells: [[0, col], [1, col], [2, col], [3, col], [4, col]]
        };
      }
    }
    
    // Pattern 3: Diagonal (top-left to bottom-right)
    if ([0, 1, 2, 3, 4].every(i => isMarked(i, i))) {
      return { 
        hasWin: true, 
        pattern: "Diagonal (Top-Left to Bottom-Right)",
        patternCells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]
      };
    }
    
    // Pattern 4: Diagonal (top-right to bottom-left)
    if ([0, 1, 2, 3, 4].every(i => isMarked(i, 4 - i))) {
      return { 
        hasWin: true, 
        pattern: "Diagonal (Top-Right to Bottom-Left)",
        patternCells: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]
      };
    }
    
    // Pattern 5: Four corners
    if (isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4)) {
      return { 
        hasWin: true, 
        pattern: "Four Corners",
        patternCells: [[0, 0], [0, 4], [4, 0], [4, 4]]
      };
    }
    
    // Pattern 6: L-shape (bottom-left L)
    if (isMarked(0, 0) && isMarked(1, 0) && isMarked(2, 0) && isMarked(3, 0) && isMarked(4, 0) &&
        isMarked(4, 1) && isMarked(4, 2) && isMarked(4, 3) && isMarked(4, 4)) {
      return { 
        hasWin: true, 
        pattern: "L-Shape",
        patternCells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4]]
      };
    }
    
    // Pattern 7: T-shape (top T)
    if (isMarked(0, 0) && isMarked(0, 1) && isMarked(0, 2) && isMarked(0, 3) && isMarked(0, 4) &&
        isMarked(1, 2) && isMarked(2, 2) && isMarked(3, 2) && isMarked(4, 2)) {
      return { 
        hasWin: true, 
        pattern: "T-Shape",
        patternCells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 2], [3, 2], [4, 2]]
      };
    }
    
    // Pattern 8: Plus/Cross pattern
    if (isMarked(0, 2) && isMarked(1, 2) && isMarked(2, 2) && isMarked(3, 2) && isMarked(4, 2) &&
        isMarked(2, 0) && isMarked(2, 1) && isMarked(2, 3) && isMarked(2, 4)) {
      return { 
        hasWin: true, 
        pattern: "Plus/Cross",
        patternCells: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [2, 0], [2, 1], [2, 3], [2, 4]]
      };
    }
    
    return { hasWin: false };
  };

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current.active = gameActive;
    gameStateRef.current.paused = gamePaused;
    gameStateRef.current.finished = gameFinished;
    gameStateRef.current.calledNumbers = calledNumbers;
  }, [gameActive, gamePaused, gameFinished, calledNumbers]);

  // Generate next random number using refs for reliable state access
  const callNumber = () => {
    console.log("🎯 callNumber invoked", { 
      gameActive: gameStateRef.current.active, 
      gamePaused: gameStateRef.current.paused, 
      gameFinished: gameStateRef.current.finished, 
      calledNumbersLength: gameStateRef.current.calledNumbers.length
    });
    
    if (!gameStateRef.current.active || gameStateRef.current.paused || gameStateRef.current.finished) {
      console.log("❌ Stopping callNumber due to game state", { 
        gameActive: gameStateRef.current.active, 
        gamePaused: gameStateRef.current.paused, 
        gameFinished: gameStateRef.current.finished 
      });
      return;
    }
    
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(num => !gameStateRef.current.calledNumbers.includes(num));
    
    console.log("📊 Available numbers:", availableNumbers.length, "out of 75");
    
    if (availableNumbers.length === 0) {
      console.log("🏁 All numbers called - ending game");
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
      console.log("🏁 Game finished - all numbers called");
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    console.log("🔊 Calling number:", newNumber, "Letter:", getLetterForNumber(newNumber));
    
    setCurrentNumber(newNumber);
    setLastCalledLetter(getLetterForNumber(newNumber));
    
    // Play Amharic audio announcement
    playAmharicAudio(newNumber);
    
    const updated = [...gameStateRef.current.calledNumbers, newNumber];
    setCalledNumbers(updated);
    
    console.log("📝 Updated called numbers count:", updated.length);
    
    // Check if all 75 numbers have been called
    if (updated.length === 75) {
      console.log("🎉 Game complete - all 75 numbers called");
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
    }
  };

  // Start new game with automatic number calling
  const startNewGame = () => {
    console.log("🚀 Starting new game - clearing all state");
    
    // Clear any existing interval first
    if (autoCallInterval) {
      console.log("🛑 Clearing existing interval");
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    
    // Reset all game state
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(true);
    setLastCalledLetter("");
    setWinnerFound(null);
    setGameFinished(false);
    setGamePaused(false);
    
    console.log("✅ Game state reset - starting automatic calling");
    
    // Use setTimeout to ensure state has updated before starting
    setTimeout(() => {
      console.log("🎯 Calling first number");
      callNumber();
      
      // Set up interval for subsequent numbers
      console.log("⏰ Setting up interval for every 3 seconds");
      const interval = setInterval(() => {
        console.log("⏱️ Interval tick - calling next number");
        callNumber();
      }, 3000);
      
      setAutoCallInterval(interval);
      console.log("✅ Interval set successfully:", interval);
    }, 100);
  };

  // Stop automatic calling
  const stopAutoCalling = () => {
    console.log("🛑 Stopping automatic calling");
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
      console.log("✅ Interval cleared");
    }
  };

  // Clean up interval on component unmount or game end
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
    };
  }, [autoCallInterval]);

  // Stop calling when game is no longer active
  useEffect(() => {
    if (!gameActive && autoCallInterval) {
      console.log("🚫 Game inactive - stopping auto calling");
      stopAutoCalling();
    }
  }, [gameActive, autoCallInterval]);

  // Verify winner
  const verifyWinner = () => {
    const cartelaNum = parseInt(verificationCartela);
    if (!cartelaNum || !bookedCartelas.has(cartelaNum)) {
      alert("Please enter a valid cartela number");
      return;
    }

    const card = cartelaCards[cartelaNum];
    if (!card) {
      alert("Cartela not found");
      return;
    }

    const winResult = checkForBingo(card, calledNumbers);
    if (winResult.hasWin) {
      setWinnerFound(`Cartela #${cartelaNum}`);
      setWinnerPattern(winResult.pattern || null);
      setWinnerPatternCells(winResult.patternCells || null);
      setWinnerCartelaCard(card);
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
      setShowWinnerVerification(false);
      setVerificationCartela("");
      setGamePaused(false);
      
      // Only visual notification for winner - no audio
    } else {
      setShowWinnerVerification(false);
      setVerificationCartela("");
      setGamePaused(false);
      
      // Resume automatic calling if game is still active
      if (gameActive && !gameFinished) {
        const interval = setInterval(() => {
          callNumber();
        }, 3000);
        setAutoCallInterval(interval);
      }
      
      // Only visual notification - no audio
    }
  };

  // Handle "Check for BINGO" button click - immediately pause and stop calling
  const handleCheckBingo = () => {
    setGamePaused(true);
    stopAutoCalling(); // Stop the interval immediately
    setShowWinnerVerification(true);
  };

  // Reset game
  const resetGame = () => {
    console.log("🔄 Resetting game");
    stopAutoCalling(); // Stop automatic calling first
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setLastCalledLetter("");
    setWinnerFound(null);
    setWinnerPattern(null);
    setWinnerPatternCells(null);
    setWinnerCartelaCard(null);
    setGameFinished(false);
    setGamePaused(false);
    setBookedCartelas(new Set()); // Clear all booked cartelas
    setCartelaCards({}); // Clear cartela cards
    setShowWinnerVerification(false);
    setVerificationCartela("");
  };

  // Fixed cartela patterns - each cartela number (1-100) has predetermined numbers
  const getFixedCartelaCard = (cartelaNum: number) => {
    // Create deterministic pattern based on cartela number
    // Each cartela will ALWAYS have the same numbers using a proper seeded shuffle
    const createFixedPattern = (num: number): number[][] => {
      // Seeded random number generator for consistent results
      let seed = num * 12345; // Use cartela number as seed
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
      
      const card: number[][] = [[], [], [], [], []]; // 5 columns
      const ranges = [
        [1, 15],   // B column
        [16, 30],  // I column  
        [31, 45],  // N column
        [46, 60],  // G column
        [61, 75]   // O column
      ];

      // Generate each column independently with seeded shuffling
      for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const columnNumbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        
        // Shuffle the column numbers deterministically using seeded random
        for (let i = columnNumbers.length - 1; i > 0; i--) {
          const j = Math.floor(seededRandom() * (i + 1));
          [columnNumbers[i], columnNumbers[j]] = [columnNumbers[j], columnNumbers[i]];
        }
        
        // Take first 5 numbers from shuffled array for this column
        for (let row = 0; row < 5; row++) {
          if (col === 2 && row === 2) {
            card[row].push(0); // FREE space in center
          } else {
            const numberIndex = row < 2 ? row : row - 1; // Skip center for N column
            card[row].push(columnNumbers[numberIndex]);
          }
        }
      }
      
      return card;
    };

    return createFixedPattern(cartelaNum);
  };

  // Select cartela and generate card (don't close popup)
  const selectCartela = (cartelaNum: number) => {
    const card = getFixedCartelaCard(cartelaNum);
    setCartelaCards(prev => ({ ...prev, [cartelaNum]: card }));
    setSelectedCartela(cartelaNum);
    // Don't close popup - let user decide to book or cancel
  };

  // Book the selected cartela
  const bookCartela = () => {
    if (selectedCartela) {
      setBookedCartelas(prev => new Set([...Array.from(prev), selectedCartela]));
      setSelectedCartela(null);
      setShowCartelaSelector(false);
    }
  };

  // Cancel cartela booking and unbook if previously booked
  const cancelCartela = () => {
    if (selectedCartela && bookedCartelas.has(selectedCartela)) {
      setBookedCartelas(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedCartela);
        return newSet;
      });
    }
    setSelectedCartela(null);
    setShowCartelaSelector(false);
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

  // Unbook cartela from the booked list
  const unbookCartela = (cartelaNum: number) => {
    setBookedCartelas(prev => {
      const newSet = new Set(prev);
      newSet.delete(cartelaNum);
      return newSet;
    });
    // Remove the cartela card as well
    setCartelaCards(prev => {
      const newCards = {...prev};
      delete newCards[cartelaNum];
      return newCards;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Bingo Game</h1>
            <p className="text-purple-200">Employee: {user?.name || user?.username}</p>
            <p className="text-purple-200">Credit Balance: {user?.creditBalance} ETB</p>
            {/* Employee shouldn't see profit margin percentage for security */}
          </div>
          <Button onClick={onLogout} variant="outline" className="text-purple-900">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 border-purple-300/30">
              <CardHeader>
                <CardTitle className="text-white">Game Control Panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Game Amount Input */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">
                      Game Amount (ETB)
                    </label>
                    <Input
                      type="number"
                      value={gameAmount}
                      onChange={(e) => setGameAmount(e.target.value)}
                      min="1"
                      disabled={gameActive || gameFinished}
                      className="bg-white/20 border-purple-300/50 text-white placeholder-purple-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">
                      Total Collected
                    </label>
                    <div className="text-2xl font-bold text-green-400">
                      {totalCollected} ETB
                    </div>
                  </div>
                </div>

                {/* Current Number Display */}
                {currentNumber && (
                  <div className="text-center py-8">
                    <div className="text-6xl font-bold text-yellow-400 mb-2">
                      {lastCalledLetter}{currentNumber}
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      Latest Called Number
                    </Badge>
                  </div>
                )}

                {/* Game Controls */}
                <div className="flex flex-wrap gap-2">
                  {!gameActive && !gameFinished && (
                    <>
                      <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                        <DialogTrigger asChild>
                          <Button className="bg-green-600 hover:bg-green-700">
                            Book Cartela
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Select Cartela (1-100)</DialogTitle>
                            <DialogDescription>
                              Choose a cartela number. Each number has a unique, fixed pattern.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-10 gap-2 p-4">
                            {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                              const isBooked = bookedCartelas.has(num);
                              const isSelected = selectedCartela === num;
                              return (
                                <Button
                                  key={num}
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
                                  onClick={() => selectCartela(num)}
                                >
                                  {num}
                                </Button>
                              );
                            })}
                          </div>
                          
                          {/* Show preview of selected cartela */}
                          {selectedCartela && cartelaCards[selectedCartela] && (
                            <div className="mt-4 p-4 bg-white/10 rounded">
                              <h3 className="text-lg font-bold text-white mb-2">
                                Preview: Cartela #{selectedCartela}
                              </h3>
                              <div className="grid grid-cols-5 gap-1 max-w-sm mx-auto">
                                <div className="font-bold text-center text-red-400">B</div>
                                <div className="font-bold text-center text-blue-400">I</div>
                                <div className="font-bold text-center text-green-400">N</div>
                                <div className="font-bold text-center text-yellow-400">G</div>
                                <div className="font-bold text-center text-purple-400">O</div>
                                {cartelaCards[selectedCartela].map((row, rowIndex) =>
                                  row.map((num, colIndex) => (
                                    <div
                                      key={`${rowIndex}-${colIndex}`}
                                      className="aspect-square bg-white/20 rounded text-center flex items-center justify-center text-white text-sm font-medium"
                                    >
                                      {num === 0 ? "FREE" : num}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between p-4">
                            <Button variant="outline" onClick={cancelCartela}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={bookCartela}
                              disabled={!selectedCartela}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Book Cartela #{selectedCartela} for {gameAmount} ETB
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        onClick={startNewGame}
                        disabled={bookedCartelas.size === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Game (Auto)
                      </Button>
                    </>
                  )}
                  
                  {gameActive && !gamePaused && (
                    <>
                      <Button 
                        onClick={handleCheckBingo}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Check for BINGO
                      </Button>
                      <Button onClick={resetGame} className="bg-red-600 hover:bg-red-700">
                        End Game
                      </Button>
                    </>
                  )}
                  
                  {gamePaused && (
                    <div className="text-yellow-400 font-bold">
                      Game Paused - Checking for Winner...
                    </div>
                  )}
                  
                  {gameFinished && (
                    <Button onClick={resetGame} className="bg-indigo-600 hover:bg-indigo-700">
                      New Game
                    </Button>
                  )}
                </div>

                {/* Game Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{bookedCartelas.size}</div>
                    <div className="text-sm text-purple-200">Cartelas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{calledNumbers.length}</div>
                    <div className="text-sm text-purple-200">Numbers Called</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{winnerPayout.toFixed(0)}</div>
                    <div className="text-sm text-purple-200">Winner Prize ETB</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Called Numbers Board */}
            <Card className="bg-white/10 border-purple-300/30 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Called Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-15 gap-1 text-sm">
                  {Array.from({ length: 75 }, (_, i) => i + 1).map(num => (
                    <div
                      key={num}
                      className={`p-2 text-center rounded transition-colors ${
                        calledNumbers.includes(num)
                          ? 'bg-red-500 text-white font-bold'
                          : 'bg-white/20 text-purple-200'
                      }`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booked Cartelas Panel */}
          <div>
            <Card className="bg-white/10 border-purple-300/30">
              <CardHeader>
                <CardTitle className="text-white">Booked Cartelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Array.from(bookedCartelas).map(cartelaNum => (
                    <div key={cartelaNum} className="bg-white/20 p-3 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white">Cartela #{cartelaNum}</span>
                        <div className="flex gap-1">
                          <Badge variant="secondary">{gameAmount} ETB</Badge>
                          {!gameActive && !gameFinished && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => unbookCartela(cartelaNum)}
                              className="h-6 px-2 text-xs"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Show cartela card if exists */}
                      {cartelaCards[cartelaNum] && (
                        <div className="grid grid-cols-5 gap-1 text-xs">
                          <div className="font-bold text-center text-red-400">B</div>
                          <div className="font-bold text-center text-blue-400">I</div>
                          <div className="font-bold text-center text-green-400">N</div>
                          <div className="font-bold text-center text-yellow-400">G</div>
                          <div className="font-bold text-center text-purple-400">O</div>
                          
                          {cartelaCards[cartelaNum].map((row, rowIndex) =>
                            row.map((num, colIndex) => (
                              <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`aspect-square rounded text-center flex items-center justify-center text-xs font-medium ${
                                  num === 0 
                                    ? 'bg-green-500 text-white' 
                                    : calledNumbers.includes(num)
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white/30 text-white'
                                }`}
                              >
                                {num === 0 ? "★" : num}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {bookedCartelas.size === 0 && (
                    <div className="text-center text-purple-200 py-8">
                      No cartelas booked yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Winner Display */}
            {winnerFound && (
              <Card className="bg-green-600/20 border-green-300/50 mt-6">
                <CardHeader>
                  <CardTitle className="text-green-400">🎉 WINNER! 🎉</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-white space-y-2">
                    <div className="text-xl font-bold">{winnerFound}</div>
                    <div className="text-lg">Pattern: {winnerPattern}</div>
                    <div className="text-lg">Prize: {winnerPayout.toFixed(2)} ETB</div>
                    
                    {/* Show winning cartela card with pattern highlighted */}
                    {winnerCartelaCard && (
                      <div className="mt-4">
                        <div className="grid grid-cols-5 gap-1 max-w-sm mx-auto">
                          <div className="font-bold text-center text-red-400">B</div>
                          <div className="font-bold text-center text-blue-400">I</div>
                          <div className="font-bold text-center text-green-400">N</div>
                          <div className="font-bold text-center text-yellow-400">G</div>
                          <div className="font-bold text-center text-purple-400">O</div>
                          
                          {winnerCartelaCard.map((row, rowIndex) =>
                            row.map((num, colIndex) => {
                              const isPatternCell = winnerPatternCells?.some(([r, c]) => r === rowIndex && c === colIndex);
                              return (
                                <div
                                  key={`${rowIndex}-${colIndex}`}
                                  className={`aspect-square rounded text-center flex items-center justify-center text-sm font-bold ${
                                    isPatternCell
                                      ? 'bg-yellow-400 text-black animate-pulse'
                                      : num === 0
                                        ? 'bg-green-500 text-white'
                                        : calledNumbers.includes(num)
                                          ? 'bg-red-500 text-white'
                                          : 'bg-white/30 text-white'
                                  }`}
                                >
                                  {num === 0 ? "★" : num}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Winner Verification Dialog */}
        <Dialog open={showWinnerVerification} onOpenChange={setShowWinnerVerification}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify BINGO Winner</DialogTitle>
              <DialogDescription>
                Enter the cartela number of the claimed winner for verification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cartela Number
                </label>
                <Input
                  type="number"
                  value={verificationCartela}
                  onChange={(e) => setVerificationCartela(e.target.value)}
                  placeholder="Enter cartela number (1-100)"
                  min="1"
                  max="100"
                />
              </div>
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowWinnerVerification(false);
                    setVerificationCartela("");
                    setGamePaused(false);
                    
                    // Resume game if still active
                    if (gameActive && !gameFinished) {
                      const interval = setInterval(() => {
                        callNumber();
                      }, 3000);
                      setAutoCallInterval(interval);
                    }
                  }}
                >
                  Cancel / Resume Game
                </Button>
                <Button 
                  onClick={verifyWinner}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Verify Winner
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}