import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const { user } = useAuth();
  
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [gameAmount, setGameAmount] = useState("30");
  const [autoplaySpeed, setAutoplaySpeed] = useState("3");
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [cartelaCards, setCartelaCards] = useState<{[key: number]: number[][]}>({});
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  
  // Calculate total collected
  const totalCollected = bookedCartelas.size * parseFloat(gameAmount || "0");
  
  // Use ref to track game state for reliable interval access
  const gameStateRef = useRef({
    active: false,
    finished: false,
    calledNumbers: [] as number[]
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
    
    if (updated.length === 75) {
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
    }
  };

  // Start game
  const startGame = () => {
    if (bookedCartelas.size === 0) {
      alert("Please select at least one cartela before starting the game");
      return;
    }

    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(true);
    setGameFinished(false);
    
    setTimeout(() => {
      callNumber();
      const interval = setInterval(() => {
        callNumber();
      }, parseInt(autoplaySpeed) * 1000);
      setAutoCallInterval(interval);
    }, 100);
  };

  // Test auto calling
  const testAutoCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    } else {
      const interval = setInterval(() => {
        callNumber();
      }, parseInt(autoplaySpeed) * 1000);
      setAutoCallInterval(interval);
    }
  };

  // Stop automatic calling
  const stopAutoCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
  };

  // Reset game
  const resetGame = () => {
    stopAutoCalling();
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setGameFinished(false);
    setBookedCartelas(new Set());
    setCartelaCards({});
  };

  // Restart game
  const restartGame = () => {
    resetGame();
    setTimeout(() => startGame(), 100);
  };

  // Start autoplay
  const startAutoplay = () => {
    if (!gameActive) {
      startGame();
    } else {
      testAutoCalling();
    }
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

  // Select cartela
  const selectCartela = (cartelaNum: number) => {
    const card = getFixedCartelaCard(cartelaNum);
    setCartelaCards(prev => ({ ...prev, [cartelaNum]: card }));
    setSelectedCartela(cartelaNum);
  };

  // Book cartela
  const bookCartela = () => {
    if (selectedCartela) {
      setBookedCartelas(prev => new Set([...Array.from(prev), selectedCartela]));
      setSelectedCartela(null);
      setShowCartelaSelector(false);
    }
  };

  // Cancel cartela
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

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
    };
  }, [autoCallInterval]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name || user?.username}</p>
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

                <div className="pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Total Collected</p>
                    <p className="text-2xl font-bold text-blue-600">{totalCollected.toFixed(2)} Birr</p>
                    <p className="text-sm text-gray-500">{bookedCartelas.size} cards × {gameAmount} Birr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={startGame}
                disabled={gameActive}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                Start Game
              </Button>
              
              <Button 
                onClick={testAutoCalling}
                variant="outline"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                size="lg"
              >
                Test Auto Calling
              </Button>
              
              <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    size="lg"
                  >
                    Select Cartela
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
                  
                  <div className="flex justify-between p-4">
                    <Button variant="outline" onClick={cancelCartela}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={bookCartela}
                      disabled={!selectedCartela}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Book Cartela #{selectedCartela} for {gameAmount} Birr
                    </Button>
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
              
              <Button 
                onClick={restartGame}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Restart Game
              </Button>
              
              <Button 
                onClick={startAutoplay}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                Start Autoplay
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