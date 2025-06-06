import { useState, useEffect } from "react";
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
  const [showWinnerVerification, setShowWinnerVerification] = useState(false);
  const [verificationCartela, setVerificationCartela] = useState("");
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);

  // Play Amharic audio for number announcements
  const playAmharicAudio = (number: number) => {
    try {
      const letter = getLetterForNumber(number);
      const audioFile = `${letter}${number}.mp3`;
      
      // Use direct path to attached assets
      const audio = new Audio(`/attached_assets/${audioFile}`);
      audio.volume = 0.9;
      audio.play().catch(() => {
        // Fallback to text-to-speech if audio fails
        speak(`${letter} ${number}`);
      });
    } catch (error) {
      console.error(`Error playing audio for ${getLetterForNumber(number)}${number}:`, error);
      // Fallback to text-to-speech
      speak(`${getLetterForNumber(number)} ${number}`);
    }
  };

  // Text-to-speech function (fallback)
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.volume = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // Check for Bingo winning patterns
  const checkForBingo = (card: number[][], calledNums: number[]): boolean => {
    // Check rows
    for (let row = 0; row < 5; row++) {
      if (card[row].every(num => calledNums.includes(num))) {
        return true;
      }
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
      if (card.every(row => calledNums.includes(row[col]))) {
        return true;
      }
    }
    
    // Check diagonal (top-left to bottom-right)
    if (card.every((row, index) => calledNums.includes(row[index]))) {
      return true;
    }
    
    // Check diagonal (top-right to bottom-left)
    if (card.every((row, index) => calledNums.includes(row[4 - index]))) {
      return true;
    }
    
    return false;
  };

  // Generate next random number
  const callNumber = () => {
    console.log("callNumber called", { gameActive, gamePaused, gameFinished, calledNumbersLength: calledNumbers.length });
    
    if (!gameActive || gamePaused || gameFinished) {
      console.log("Stopping callNumber due to game state");
      return;
    }
    
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(num => !calledNumbers.includes(num));
    
    if (availableNumbers.length === 0) {
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
      speak("Game finished. All numbers have been called.");
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    console.log("Calling number:", newNumber);
    
    setCurrentNumber(newNumber);
    setCalledNumbers(prev => {
      const updated = [...prev, newNumber];
      console.log("Updated called numbers:", updated.length);
      
      // Check if all 75 numbers have been called
      if (updated.length === 75) {
        setGameActive(false);
        setGameFinished(true);
        stopAutoCalling();
        setTimeout(() => speak("Game finished. All numbers have been called."), 1000);
      }
      
      return updated;
    });
    setLastCalledLetter(getLetterForNumber(newNumber));
    
    // Play Amharic audio announcement
    playAmharicAudio(newNumber);
  };

  // Start new game with automatic number calling
  const startNewGame = () => {
    // Clear any existing interval first
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
    }
    
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(true);
    setLastCalledLetter("");
    setWinnerFound(null);
    setGameFinished(false);
    setGamePaused(false);
    
    console.log("Starting new game...");
    
    // Call the first number immediately
    callNumber();
    
    // Set up interval for subsequent numbers
    const interval = setInterval(() => {
      callNumber();
    }, 3000);
    
    setAutoCallInterval(interval);
  };

  // Stop automatic calling
  const stopAutoCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
  };

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

    const isWinner = checkForBingo(card, calledNumbers);
    if (isWinner) {
      setWinnerFound(`Cartela #${cartelaNum}`);
      setGameActive(false);
      setGameFinished(true);
      stopAutoCalling();
      setShowWinnerVerification(false);
      setVerificationCartela("");
      setGamePaused(false);
      
      // Audio announcement for winner
      speak(`Cartela number ${cartelaNum} won!`);
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
      
      // Audio announcement for not winner
      speak("Not a winner. Game continues.");
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
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setLastCalledLetter("");
    setWinnerFound(null);
    setGameFinished(false);
    setGamePaused(false);
    setBookedCartelas(new Set()); // Clear all booked cartelas
    setCartelaCards({}); // Clear cartela cards
    setShowWinnerVerification(false);
    setVerificationCartela("");
    stopAutoCalling();
  };

  // Generate unique Bingo card based on cartela number
  const generateCartelaCard = (cartelaNum: number) => {
    // Use cartela number as seed for consistent generation
    const seed = cartelaNum;
    const ranges = [
      [1, 15],   // B column
      [16, 30],  // I column  
      [31, 45],  // N column
      [46, 60],  // G column
      [61, 75]   // O column
    ];

    const card: number[][] = [];
    
    for (let col = 0; col < 5; col++) {
      const column: number[] = [];
      const [min, max] = ranges[col];
      
      // Create seeded random selection based on cartela number and column
      const availableNumbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          column.push(0); // FREE space
        } else {
          // Use cartela number + position as seed for consistent randomness
          const seedValue = (seed * 1000) + (col * 10) + row;
          const randomIndex = seedValue % availableNumbers.length;
          column.push(availableNumbers.splice(randomIndex, 1)[0]);
        }
      }
      card.push(column);
    }
    
    return card;
  };

  // Select cartela and generate card (don't close popup)
  const selectCartela = (cartelaNum: number) => {
    const card = generateCartelaCard(cartelaNum);
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