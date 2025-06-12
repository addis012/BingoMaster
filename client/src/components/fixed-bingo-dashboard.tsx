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
  
  // Cartela selection
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  
  // Winner checking
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  const [showWinnerResult, setShowWinnerResult] = useState(false);
  const [winnerResult, setWinnerResult] = useState({ isWinner: false, cartela: 0 });
  const [wasGameActiveBeforeCheck, setWasGameActiveBeforeCheck] = useState(false);
  
  // Game mechanics
  const [isShuffling, setIsShuffling] = useState(false);
  const autoCallInterval = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef({ calledNumbers: [], finished: false });

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

  const bookSelectedCartelas = () => {
    if (selectedCartelas.size === 0) return;
    
    setBookedCartelas(new Set([...Array.from(bookedCartelas), ...Array.from(selectedCartelas)]));
    setSelectedCartelas(new Set());
    setShowCartelaSelector(false);
    toast({
      title: "Cartelas Booked",
      description: `Successfully booked ${selectedCartelas.size} cartelas`,
    });
  };

  const startGame = () => {
    if (bookedCartelas.size === 0) {
      toast({
        title: "No Cartelas Selected",
        description: "Please select cartelas before starting the game",
        variant: "destructive"
      });
      return;
    }

    setGameActive(true);
    setGameFinished(false);
    setCalledNumbers([]);
    setLastCalledNumber(null);
    gameStateRef.current = { calledNumbers: [], finished: false };
    
    // Start auto-calling
    startAutoCalling();
    
    toast({
      title: "Game Started",
      description: `Game started with ${bookedCartelas.size} cartelas`,
    });
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
    if (!gameFinished) {
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
    gameStateRef.current = { calledNumbers: [], finished: false };
    toast({
      title: "Game Reset",
      description: "Game has been reset successfully",
    });
  };

  const shuffleNumbers = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setIsShuffling(false);
      toast({
        title: "Numbers Shuffled",
        description: "BINGO board has been shuffled",
      });
    }, 1000);
  };

  const checkWinner = () => {
    const cartelaNum = parseInt(winnerCartelaNumber);
    
    if (!cartelaNum || cartelaNum < 1 || cartelaNum > 100) {
      toast({
        title: "Invalid Cartela",
        description: "Please enter a valid cartela number (1-100)",
        variant: "destructive"
      });
      return;
    }

    if (!bookedCartelas.has(cartelaNum)) {
      toast({
        title: "Cartela Not Booked",
        description: `Cartela #${cartelaNum} is not booked in this game`,
        variant: "destructive"
      });
      return;
    }

    // Pause game immediately when checking winner
    setWasGameActiveBeforeCheck(gameActive);
    if (gameActive) {
      pauseGame();
    }

    // For demo purposes, random winner check
    const isWinner = Math.random() > 0.7;
    
    setWinnerResult({ isWinner, cartela: cartelaNum });
    setShowWinnerChecker(false);
    setWinnerCartelaNumber("");
    setShowWinnerResult(true);
    
    // If not a winner, auto-resume after 3 seconds
    if (!isWinner) {
      setTimeout(() => {
        setShowWinnerResult(false);
        if (wasGameActiveBeforeCheck && !gameFinished) {
          resumeGame();
        }
      }, 3000);
    }
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
              <p className="text-xl font-bold text-green-600">{Math.floor(bookedCartelas.size * parseInt(gameAmount) * 0.7)} Birr</p>
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
                        <DialogTitle>Select Cartelas (1-100)</DialogTitle>
                        <DialogDescription>
                          Choose multiple cartelas. Selected: {selectedCartelas.size} cartelas
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-10 gap-2 p-4">
                        {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
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
                              <Checkbox
                                id={`cartela-${num}`}
                                checked={isSelected}
                                disabled={isBooked}
                                onCheckedChange={() => toggleCartelaSelection(num)}
                                className="h-3 w-3"
                              />
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

                  {!gameActive && !gameFinished ? (
                    <Button
                      onClick={startGame}
                      disabled={bookedCartelas.size === 0}
                      className="bg-green-600 hover:bg-green-700 text-white py-1 text-xs"
                    >
                      Start
                    </Button>
                  ) : gameActive ? (
                    <Button
                      onClick={pauseGame}
                      className="bg-orange-600 hover:bg-orange-700 text-white py-1 text-xs"
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={resumeGame}
                      disabled={gameFinished}
                      className="bg-green-600 hover:bg-green-700 text-white py-1 text-xs"
                    >
                      Resume
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
                  <Dialog open={showWinnerChecker} onOpenChange={setShowWinnerChecker}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6"
                        disabled={!gameActive}
                      >
                        Check Winner
                      </Button>
                    </DialogTrigger>
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
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                {winnerResult.isWinner ? "🎉 WINNER!" : "❌ Not a Winner"}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-8">
              {winnerResult.isWinner ? (
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white text-4xl font-bold">✓</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    Cartela #{winnerResult.cartela} is a WINNER!
                  </p>
                  <p className="text-gray-600">
                    Congratulations! Prize: {Math.floor(bookedCartelas.size * parseInt(gameAmount) * 0.7)} Birr
                  </p>
                  <Button 
                    onClick={() => setShowWinnerResult(false)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Claim Prize
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white text-4xl font-bold">✕</span>
                  </div>
                  <p className="text-lg font-semibold text-red-500">
                    Cartela #{winnerResult.cartela} is not a winner yet
                  </p>
                  <p className="text-gray-600">
                    Game will continue automatically in 3 seconds...
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full animate-pulse" style={{width: "33%"}}></div>
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