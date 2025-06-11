import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Pause, Play, Square, Volume2 } from "lucide-react";

interface IntegratedBingoGameProps {
  employeeName: string;
  employeeId: number;
  shopId: number;
  onLogout: () => void;
}

interface CartelaNumber {
  number: number;
  called: boolean;
}

type CartelaGrid = number[][];

export default function IntegratedBingoGame({ employeeName, employeeId, shopId, onLogout }: IntegratedBingoGameProps) {
  // Game State
  const [gameState, setGameState] = useState<'idle' | 'active' | 'paused' | 'completed'>('idle');
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameAmount, setGameAmount] = useState<string>("10");
  const [winAmount, setWinAmount] = useState<string>("500");
  
  // Cartela Management
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [cartelaCards, setCartelaCards] = useState<Record<number, CartelaGrid>>({});
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [showCartelaSelector, setShowCartelaSelector] = useState<boolean>(false);
  
  // Game Controls
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [callInterval, setCallInterval] = useState<number>(3000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalledNumberRef = useRef<number | null>(null);
  
  // Audio Management
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate fixed cartela based on number
  const generateFixedCartela = useCallback((cartelaNumber: number): CartelaGrid => {
    const seed = cartelaNumber * 12345;
    let random = seed;
    
    const nextRandom = () => {
      random = (random * 1103515245 + 12345) & 0x7fffffff;
      return random;
    };

    const cartela: CartelaGrid = [[], [], [], [], []];
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I  
      [31, 45],  // N
      [46, 60],  // G
      [61, 75]   // O
    ];

    for (let col = 0; col < 5; col++) {
      const [min, max] = ranges[col];
      const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          cartela[row][col] = 0; // FREE space
        } else {
          const randomIndex = nextRandom() % available.length;
          cartela[row][col] = available[randomIndex];
          available.splice(randomIndex, 1);
        }
      }
    }

    return cartela;
  }, []);

  // Reset game function
  const resetGame = useCallback(() => {
    setGameState('idle');
    setCalledNumbers([]);
    setCurrentNumber(null);
    setAutoMode(false);
    lastCalledNumberRef.current = null;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    toast({
      title: "Game Reset",
      description: "All game data has been cleared. Cartela selections preserved.",
    });
  }, []);

  // Call next number with anti-duplicate protection
  const callNextNumber = useCallback(async () => {
    if (calledNumbers.length >= 75) {
      setGameState('paused');
      setAutoMode(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      toast({
        title: "All Numbers Called",
        description: "All 75 numbers have been called. Game paused for manual winner verification.",
      });
      return;
    }

    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(num => !calledNumbers.includes(num));

    if (availableNumbers.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const nextNumber = availableNumbers[randomIndex];

    // Immediate ref lock to prevent duplicates
    if (lastCalledNumberRef.current === nextNumber) {
      console.warn("Duplicate number detected, recalling...");
      return callNextNumber();
    }

    lastCalledNumberRef.current = nextNumber;

    setCalledNumbers(prev => {
      const newNumbers = [...prev, nextNumber];
      if (newNumbers.length !== new Set(newNumbers).size) {
        console.error("Duplicate detected in state!");
        return prev;
      }
      return newNumbers;
    });
    
    setCurrentNumber(nextNumber);

    // Play audio if enabled
    if (isAudioEnabled) {
      try {
        const letter = nextNumber <= 15 ? 'B' : nextNumber <= 30 ? 'I' : nextNumber <= 45 ? 'N' : nextNumber <= 60 ? 'G' : 'O';
        const audioFile = `${letter}${nextNumber}.mp3`;
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        audioRef.current = new Audio(`/attached_assets/${audioFile}`);
        audioRef.current.volume = 0.7;
        await audioRef.current.play();
      } catch (error) {
        console.warn("Audio playback failed:", error);
      }
    }
  }, [calledNumbers, isAudioEnabled]);

  // Start game
  const startGame = useCallback(() => {
    if (bookedCartelas.size === 0) {
      toast({
        title: "No Cartelas Selected",
        description: "Please select at least one cartela before starting.",
        variant: "destructive"
      });
      return;
    }

    setGameState('active');
    toast({
      title: "Game Started",
      description: `Game started with ${bookedCartelas.size} cartela(s). Good luck!`,
    });
  }, [bookedCartelas.size]);

  // Pause/Resume game
  const togglePause = useCallback(() => {
    if (gameState === 'active') {
      setGameState('paused');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (gameState === 'paused') {
      setGameState('active');
    }
  }, [gameState]);

  // Auto mode effect
  useEffect(() => {
    if (autoMode && gameState === 'active') {
      intervalRef.current = setInterval(() => {
        callNextNumber();
      }, callInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoMode, gameState, callNextNumber, callInterval]);

  // Get number color for display
  const getNumberColor = (num: number): string => {
    if (num <= 15) return "bg-red-500";
    if (num <= 30) return "bg-blue-500";
    if (num <= 45) return "bg-green-500";
    if (num <= 60) return "bg-yellow-500";
    return "bg-purple-500";
  };

  // Get letter for number
  const getNumberLetter = (num: number): string => {
    if (num <= 15) return "B";
    if (num <= 30) return "I";
    if (num <= 45) return "N";
    if (num <= 60) return "G";
    return "O";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Bingo Game - Employee Panel</h1>
            <p className="text-gray-600">Welcome, {employeeName} | Shop #{shopId}</p>
          </div>
          <Button onClick={onLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Called Numbers Board */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Called Numbers ({calledNumbers.length}/75)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                {['B', 'I', 'N', 'G', 'O'].map((letter, colIndex) => (
                  <div key={letter} className="font-bold text-lg mb-2">{letter}</div>
                ))}
                
                {Array.from({ length: 15 }, (_, rowIndex) => (
                  ['B', 'I', 'N', 'G', 'O'].map((letter, colIndex) => {
                    const number = colIndex * 15 + rowIndex + 1;
                    const isCalled = calledNumbers.includes(number);
                    const isCurrent = currentNumber === number;
                    
                    return (
                      <div
                        key={`${letter}-${number}`}
                        className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium ${
                          isCurrent 
                            ? 'bg-yellow-400 text-black border-2 border-yellow-600'
                            : isCalled 
                              ? `${getNumberColor(number)} text-white`
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {number}
                      </div>
                    );
                  })
                )).flat()}
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                {calledNumbers.length} / 75 numbers called
              </div>
            </CardContent>
          </Card>

          {/* Current Number Display */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Current Number</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {currentNumber ? (
                <div className="space-y-4">
                  <div className={`mx-auto w-32 h-32 ${getNumberColor(currentNumber)} text-white rounded-full flex items-center justify-center`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{getNumberLetter(currentNumber)}</div>
                      <div className="text-4xl font-bold">{currentNumber}</div>
                    </div>
                  </div>
                  <p className="text-xl font-semibold">{getNumberLetter(currentNumber)}{currentNumber}</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <div className="mx-auto w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                    <span>No number called</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Controls */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Game Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game Settings */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Game Amount (ETB)</label>
                <input
                  type="number"
                  value={gameAmount}
                  onChange={(e) => setGameAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={gameState === 'active'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Win Amount (ETB)</label>
                <input
                  type="number"
                  value={winAmount}
                  onChange={(e) => setWinAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={gameState === 'active'}
                />
              </div>

              {/* Cartela Selection */}
              <Button
                onClick={() => setShowCartelaSelector(true)}
                className="w-full"
                disabled={gameState === 'active'}
              >
                Select Cartelas ({bookedCartelas.size} selected)
              </Button>

              {/* Game Control Buttons */}
              <div className="space-y-2">
                {gameState === 'idle' && (
                  <Button onClick={startGame} className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Start Game
                  </Button>
                )}

                {gameState === 'active' && (
                  <>
                    <Button onClick={togglePause} className="w-full">
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Game
                    </Button>
                    <Button onClick={callNextNumber} className="w-full" variant="outline">
                      Call Next Number
                    </Button>
                  </>
                )}

                {gameState === 'paused' && (
                  <Button onClick={togglePause} className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Resume Game
                  </Button>
                )}

                <Button onClick={resetGame} variant="outline" className="w-full">
                  <Square className="mr-2 h-4 w-4" />
                  Reset Game
                </Button>
              </div>

              {/* Auto Mode Controls */}
              {gameState === 'active' && (
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoMode}
                      onChange={(e) => setAutoMode(e.target.checked)}
                    />
                    <span className="text-sm">Auto Call</span>
                  </label>
                  
                  {autoMode && (
                    <div>
                      <label className="text-sm font-medium">Interval (ms)</label>
                      <input
                        type="number"
                        value={callInterval}
                        onChange={(e) => setCallInterval(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md"
                        min="1000"
                        max="10000"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Audio Toggle */}
              <Button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                variant="outline"
                className="w-full"
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Audio: {isAudioEnabled ? "ON" : "OFF"}
              </Button>

              {/* Game Stats */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-md">
                <div className="text-sm">
                  <strong>Cartelas:</strong> {bookedCartelas.size}
                </div>
                <div className="text-sm">
                  <strong>Total Collected:</strong> {totalCollected} ETB
                </div>
                <div className="text-sm">
                  <strong>Game State:</strong> {gameState}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cartela Selection Dialog */}
        <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
          <DialogContent className="w-screen h-screen max-w-none m-0 p-6 rounded-none overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">Select Cartelas</DialogTitle>
                <DialogDescription className="text-lg">
                  Click numbers to book/unbook cartelas. Selected: {bookedCartelas.size} | Total: {totalCollected} ETB
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCartelaSelector(false)}
                className="ml-4"
              >
                Close
              </Button>
            </DialogHeader>
            
            <div className="flex flex-col h-full">
              {/* Cartela Number Grid */}
              <div className="grid grid-cols-10 gap-1 mb-4 content-start justify-items-center items-start">
                {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                  const isBooked = bookedCartelas.has(num);
                  
                  return (
                    <Button
                      key={num}
                      variant={isBooked ? "default" : "outline"}
                      className={`h-12 w-12 text-lg font-bold flex-shrink-0 ${
                        isBooked 
                          ? "bg-green-500 text-white hover:bg-red-500" 
                          : "hover:bg-blue-500 hover:text-white"
                      }`}
                      onClick={() => {
                        if (isBooked) {
                          // Unbook cartela
                          setBookedCartelas(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(num);
                            return newSet;
                          });
                          setTotalCollected(prev => prev - parseInt(gameAmount));
                          
                          // Remove from cartela cards
                          setCartelaCards(prev => {
                            const newCards = { ...prev };
                            delete newCards[num];
                            return newCards;
                          });
                        } else {
                          // Book cartela
                          setBookedCartelas(prev => new Set([...prev, num]));
                          setTotalCollected(prev => prev + parseInt(gameAmount));
                          
                          // Pre-generate and store cartela if not exists
                          if (!cartelaCards[num]) {
                            const fixedCard = generateFixedCartela(num);
                            setCartelaCards(prev => ({
                              ...prev,
                              [num]: fixedCard
                            }));
                          }
                        }

                        toast({
                          title: isBooked ? "Cartela Removed" : "Cartela Added",
                          description: `Cartela #${num} ${isBooked ? "removed from" : "added to"} selection`,
                        });
                      }}
                    >
                      {num}
                    </Button>
                  );
                })}
              </div>
              
              {/* Preview selected cartelas */}
              {bookedCartelas.size > 0 && (
                <div className="mt-6 p-4 border-t">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    Selected Cartelas Preview
                  </h3>
                  <div className="grid gap-4 max-h-96 overflow-y-auto">
                    {Array.from(bookedCartelas).map((cartelaNum: number) => {
                      const card = cartelaCards[cartelaNum] || generateFixedCartela(cartelaNum);
                      return (
                        <div key={cartelaNum} className="border rounded p-3">
                          <h4 className="font-medium mb-2 text-center">Cartela #{cartelaNum}</h4>
                          <div className="max-w-48 mx-auto">
                            {/* BINGO Headers */}
                            <div className="grid grid-cols-5 gap-0.5 mb-1">
                              {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                                const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                                return (
                                  <div key={letter} className={`h-6 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-xs`}>
                                    {letter}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Numbers Grid */}
                            <div className="grid grid-cols-5 gap-0.5">
                              {card.flat().map((num, index) => (
                                <div
                                  key={index}
                                  className={`h-6 border border-gray-400 flex items-center justify-center text-xs font-medium ${
                                    num === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-white'
                                  }`}
                                >
                                  {num === 0 ? 'FREE' : num}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Save Selection Button */}
                    <div className="flex gap-2 mt-4 justify-center">
                      <Button 
                        className="bg-blue-500 hover:bg-blue-600"
                        onClick={() => {
                          setShowCartelaSelector(false);
                          toast({
                            title: "Selection Saved",
                            description: `${bookedCartelas.size} cartela(s) selected for ${totalCollected} ETB`,
                          });
                        }}
                      >
                        Save Selection ({bookedCartelas.size} cards)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}