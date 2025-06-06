import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
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
      console.log("🎉 Game complete - all 75 numbers called");
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

  // Fixed cartela patterns - each cartela number has predetermined numbers
  const getFixedCartelaCard = (cartelaNum: number) => {
    // Pre-defined fixed cartela patterns (cartela number -> fixed card layout)
    const fixedCartelas: { [key: number]: number[][] } = {
      1: [
        [2, 17, 32, 47, 62],
        [5, 19, 34, 49, 64], 
        [8, 22, 0, 52, 67],  // 0 = FREE space
        [11, 25, 38, 55, 70],
        [14, 28, 43, 58, 73]
      ],
      2: [
        [1, 16, 31, 46, 61],
        [4, 18, 33, 48, 63],
        [7, 21, 0, 51, 66],
        [10, 24, 37, 54, 69],
        [13, 27, 42, 57, 72]
      ],
      3: [
        [3, 20, 35, 50, 65],
        [6, 23, 39, 53, 68],
        [9, 26, 0, 56, 71],
        [12, 29, 41, 59, 74],
        [15, 30, 44, 60, 75]
      ],
      4: [
        [4, 19, 34, 49, 64],
        [7, 22, 37, 52, 67],
        [10, 25, 0, 55, 70],
        [13, 28, 41, 58, 73],
        [1, 16, 44, 46, 61]
      ],
      5: [
        [5, 18, 33, 48, 63],
        [8, 21, 36, 51, 66],
        [11, 24, 0, 54, 69],
        [14, 27, 40, 57, 72],
        [2, 30, 43, 60, 75]
      ]
    };

    // If cartela number exists in fixed patterns, return it
    if (fixedCartelas[cartelaNum]) {
      return fixedCartelas[cartelaNum];
    }

    // For cartela numbers beyond predefined ones, generate based on mathematical pattern
    // This ensures consistency - same cartela number always generates same card
    const basePattern = fixedCartelas[((cartelaNum - 1) % 5) + 1];
    const offset = Math.floor((cartelaNum - 1) / 5) * 3;
    
    return basePattern.map(column => 
      column.map(num => {
        if (num === 0) return 0; // Keep FREE space
        const letter = getLetterForNumber(num);
        let newNum = num + offset;
        
        // Keep within letter ranges
        if (letter === 'B' && newNum > 15) newNum = ((newNum - 1) % 15) + 1;
        if (letter === 'I' && newNum > 30) newNum = ((newNum - 16) % 15) + 16;
        if (letter === 'N' && newNum > 45) newNum = ((newNum - 31) % 15) + 31;
        if (letter === 'G' && newNum > 60) newNum = ((newNum - 46) % 15) + 46;
        if (letter === 'O' && newNum > 75) newNum = ((newNum - 61) % 15) + 61;
        
        return newNum;
      })
    );
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
  const getLetterForNumber = (num: number) => {
    if (num >= 1 && num <= 15) return 'B';
    if (num >= 16 && num <= 30) return 'I';
    if (num >= 31 && num <= 45) return 'N';
    if (num >= 46 && num <= 60) return 'G';
    if (num >= 61 && num <= 75) return 'O';
    return '';
  };

  // Generate called numbers display by letter
  const getNumbersByLetter = () => {
    const byLetter = {
      B: calledNumbers.filter(n => n >= 1 && n <= 15).sort((a, b) => a - b),
      I: calledNumbers.filter(n => n >= 16 && n <= 30).sort((a, b) => a - b),
      N: calledNumbers.filter(n => n >= 31 && n <= 45).sort((a, b) => a - b),
      G: calledNumbers.filter(n => n >= 46 && n <= 60).sort((a, b) => a - b),
      O: calledNumbers.filter(n => n >= 61 && n <= 75).sort((a, b) => a - b)
    };
    return byLetter;
  };

  const numbersByLetter = getNumbersByLetter();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bingo Play</h1>
          <p className="text-sm text-gray-600">@buzo02 - Employee</p>
        </div>
        <Button onClick={onLogout} variant="outline" className="bg-teal-500 text-white hover:bg-teal-600">
          Log Out
        </Button>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Game Control */}
        <div className="space-y-6">
          {/* Current Number Display */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {currentNumber ? (
                  <>
                    <div className="flex justify-center space-x-2">
                      <div className="w-20 h-20 bg-red-500 text-white rounded-lg flex items-center justify-center text-3xl font-bold">
                        {lastCalledLetter}
                      </div>
                      <div className="w-20 h-20 bg-gray-700 text-white rounded-lg flex items-center justify-center text-3xl font-bold">
                        {currentNumber}
                      </div>
                    </div>
                    <p className="text-lg font-semibold">
                      {lastCalledLetter}-{currentNumber}
                    </p>
                  </>
                ) : (
                  <div className="flex justify-center space-x-2">
                    <div className="w-20 h-20 bg-gray-300 rounded-lg flex items-center justify-center text-2xl">
                      ?
                    </div>
                    <div className="w-20 h-20 bg-gray-300 rounded-lg flex items-center justify-center text-2xl">
                      ?
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full border-4 border-blue-400 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <div className="text-blue-500 font-bold text-lg">Let's Play</div>
                      <div className="text-blue-500 font-bold text-xl">BINGO!</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Generate Number</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Amount Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Game Amount (Birr)
                </label>
                <Input
                  type="number"
                  value={gameAmount}
                  onChange={(e) => setGameAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-center font-semibold"
                />
              </div>
              <div className="text-center text-sm text-gray-600">
                Current: {gameAmount} Birr per card
              </div>

              {/* Selected Cartelas */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Selected Cartelas ({bookedCartelas.size})
                </label>
                {bookedCartelas.size > 0 ? (
                  <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg max-h-20 overflow-y-auto">
                    {Array.from(bookedCartelas).sort((a, b) => a - b).map(num => (
                      <Badge key={num} variant="secondary" className="bg-green-100 text-green-800">
                        #{num}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                    No cartelas selected
                  </div>
                )}
              </div>

              {/* Current Collected Amount */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-blue-700 mb-1">Total Collected</div>
                <div className="text-xl font-bold text-blue-800">
                  {(bookedCartelas.size * parseFloat(gameAmount || "0")).toFixed(2)} Birr
                </div>
                <div className="text-xs text-blue-600">
                  {bookedCartelas.size} cards × {gameAmount} Birr
                </div>
              </div>

              {/* Start Game Button */}
              <Button 
                onClick={startNewGame}
                disabled={bookedCartelas.size === 0 || gameActive}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300"
              >
                {gameActive ? "Game in Progress" : "Start Game"}
              </Button>

              {/* Check for BINGO Button */}
              {gameActive && !winnerFound && !gameFinished && (
                <Button 
                  onClick={handleCheckBingo}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                  disabled={gamePaused}
                >
                  {gamePaused ? "Checking..." : "Check for BINGO"}
                </Button>
              )}

              {/* Stop Auto Calling Button */}
              {gameActive && autoCallInterval && (
                <Button 
                  onClick={stopAutoCalling}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Stop Auto Calling
                </Button>
              )}

              {/* Stop Game Button */}
              {gameActive && (
                <Button 
                  onClick={resetGame}
                  variant="outline"
                  className="w-full border-red-500 text-red-500 hover:bg-red-50"
                >
                  Stop Game
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Winner Notification */}
          {winnerFound && (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="p-4 text-center">
                <div className="text-green-800 font-bold text-xl mb-2">🎉 BINGO! 🎉</div>
                <div className="text-green-700 font-semibold">{winnerFound} WINS!</div>
                <div className="text-green-600 text-sm mt-2">
                  Prize: {gameAmount} Birr
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => setShowCartelaSelector(true)}
                  >
                    Select Cartela
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Select Cartela Number (1-100)</DialogTitle>
                    <DialogDescription>
                      Choose a cartela number from 1 to 100. Each number generates a unique Bingo card combination.
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
                          className={`h-12 w-12 text-sm ${
                            isBooked && !isSelected 
                              ? "bg-green-500 text-white hover:bg-green-600" 
                              : isSelected 
                                ? "bg-orange-500 hover:bg-orange-600" 
                                : ""
                          }`}
                          onClick={() => selectCartela(num)}
                        >
                          {num}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {selectedCartela && cartelaCards[selectedCartela] && (
                    <div className="mt-6 p-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 text-center">
                        Cartela #{selectedCartela} - Bingo Card Preview
                      </h3>
                      <div className="max-w-sm mx-auto">
                        {/* Header */}
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          {['B', 'I', 'N', 'G', 'O'].map(letter => (
                            <div key={letter} className="h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold text-lg">
                              {letter}
                            </div>
                          ))}
                        </div>
                        
                        {/* Numbers */}
                        <div className="grid grid-cols-5 gap-1">
                          {Array.from({ length: 5 }, (_, row) =>
                            Array.from({ length: 5 }, (_, col) => {
                              const number = cartelaCards[selectedCartela][col][row];
                              const isFree = col === 2 && row === 2;
                              
                              return (
                                <div
                                  key={`${row}-${col}`}
                                  className={`h-8 border-2 rounded flex items-center justify-center font-bold text-sm ${
                                    isFree 
                                      ? 'bg-yellow-300 text-black border-yellow-400' 
                                      : 'bg-white text-black border-gray-300'
                                  }`}
                                >
                                  {isFree ? 'FREE' : number}
                                </div>
                              );
                            })
                          ).flat()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4 justify-center">
                        <Button 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={bookCartela}
                        >
                          Book Card
                        </Button>
                        <Button 
                          variant="outline"
                          className="bg-red-500 text-white hover:bg-red-600"
                          onClick={cancelCartela}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Button 
                onClick={resetGame}
                variant="outline" 
                className="w-full"
              >
                Reset Game
              </Button>
              <Button 
                onClick={startNewGame}
                variant="outline" 
                className="w-full"
              >
                Restart Game
              </Button>
              <Button 
                onClick={callNumber}
                disabled={!gameActive}
                className="w-full bg-green-500 hover:bg-green-600"
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
              <CardTitle className="text-center text-xl">Called Numbers Board</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gamePaused && (
                  <div className="text-center bg-yellow-100 border border-yellow-400 rounded p-2 mb-4">
                    <p className="text-yellow-800 font-medium">Game Paused - Checking for BINGO...</p>
                  </div>
                )}
                
                {gameFinished && (
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-green-600">Game Completed!</h3>
                    <p className="text-sm text-gray-600">Numbers Called: {calledNumbers.length}</p>
                  </div>
                )}
                
                {/* Compact BINGO Board */}
                <div className="max-w-xs mx-auto">
                  {/* Header */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                      const colors = ['bg-orange-500', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500'];
                      return (
                        <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-sm`}>
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Numbers Grid */}
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 15 }, (_, row) =>
                      ['B', 'I', 'N', 'G', 'O'].map((letter, col) => {
                        let num;
                        if (letter === 'B') num = row + 1;
                        else if (letter === 'I') num = row + 16;
                        else if (letter === 'N') num = row + 31;
                        else if (letter === 'G') num = row + 46;
                        else num = row + 61;
                        
                        const isCalled = calledNumbers.includes(num);
                        const isCurrentNumber = num === currentNumber;
                        
                        return (
                          <div
                            key={`${letter}-${num}`}
                            className={`h-8 rounded flex items-center justify-center text-xs font-medium border ${
                              isCurrentNumber
                                ? 'bg-yellow-400 text-black border-yellow-500 font-bold'
                                : isCalled
                                ? 'bg-green-600 text-white border-green-700'
                                : 'bg-gray-200 text-gray-700 border-gray-300'
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })
                    ).flat()}
                  </div>
                </div>
                
                <div className="mt-4 text-center text-sm text-gray-600">
                  Numbers Called: {calledNumbers.length} / 75
                </div>
                
                {gameFinished && (
                  <div className="text-center mt-4">
                    <Button onClick={resetGame} className="px-8 py-2">
                      Start New Game
                    </Button>
                  </div>
                )}
                
                {!gameActive && calledNumbers.length === 0 && (
                  <div className="text-center mt-4">
                    <Button onClick={startNewGame} className="px-8 py-2">
                      Start New Game
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Winner Pattern Display */}
          {winnerFound && winnerCartelaCard && winnerPattern && winnerPatternCells && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-center text-xl text-green-600">🎉 Winner Pattern 🎉</CardTitle>
                <p className="text-center text-sm text-gray-600">
                  {winnerFound} won with: <span className="font-semibold text-green-700">{winnerPattern}</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs mx-auto">
                  {/* BINGO Header */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                      const colors = ['bg-orange-500', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500'];
                      return (
                        <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-sm`}>
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Cartela Grid with Winning Pattern Highlighted */}
                  <div className="grid grid-cols-5 gap-1">
                    {winnerCartelaCard.map((row, rowIndex) =>
                      row.map((number, colIndex) => {
                        const isFree = rowIndex === 2 && colIndex === 2;
                        const isInPattern = winnerPatternCells.some(([pRow, pCol]) => pRow === rowIndex && pCol === colIndex);
                        const isCalled = calledNumbers.includes(number) || isFree;
                        
                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`
                              h-10 border-2 rounded flex items-center justify-center text-xs font-semibold
                              ${isInPattern 
                                ? 'bg-yellow-400 text-black border-yellow-600 shadow-lg ring-2 ring-yellow-300' 
                                : isCalled 
                                  ? 'bg-green-200 text-green-800 border-green-400' 
                                  : 'bg-gray-100 text-gray-600 border-gray-300'
                              }
                            `}
                          >
                            {isFree ? 'FREE' : number}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="mt-3 text-center">
                    <div className="text-sm text-gray-600 mb-2">
                      Prize Amount: <span className="font-bold text-green-600">{gameAmount} Birr</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-400 border border-yellow-600 rounded"></div>
                        <span>Winning Pattern</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                        <span>Called Numbers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Winner Verification Dialog */}
      <Dialog open={showWinnerVerification} onOpenChange={setShowWinnerVerification}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify BINGO Winner</DialogTitle>
            <DialogDescription>
              Enter the cartela number of the player claiming BINGO to verify their win.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Cartela Number
              </label>
              <Input
                type="number"
                value={verificationCartela}
                onChange={(e) => setVerificationCartela(e.target.value)}
                placeholder="Enter cartela number"
                className="text-center"
                min="1"
                max="100"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={verifyWinner}
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={!verificationCartela}
              >
                Verify BINGO
              </Button>
              <Button 
                onClick={() => {
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
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}