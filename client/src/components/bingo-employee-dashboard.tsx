import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [lastCalledLetter, setLastCalledLetter] = useState<string>("");
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [entryFee, setEntryFee] = useState("50.00");

  // Generate next random number
  const callNumber = () => {
    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(num => !calledNumbers.includes(num));
    
    if (availableNumbers.length === 0) {
      setGameActive(false);
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const newNumber = availableNumbers[randomIndex];
    
    setCurrentNumber(newNumber);
    setCalledNumbers(prev => [...prev, newNumber]);
    setLastCalledLetter(getLetterForNumber(newNumber));
  };

  // Start new game
  const startNewGame = () => {
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(true);
    setLastCalledLetter("");
  };

  // Reset game
  const resetGame = () => {
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setLastCalledLetter("");
  };

  // Add player
  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers(prev => [...prev, newPlayerName.trim()]);
      setNewPlayerName("");
    }
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

          {/* Game Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button 
                onClick={callNumber} 
                disabled={!gameActive}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Select Cartela
              </Button>
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

          {/* Player Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Register Player</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Player Name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
              <Input
                placeholder="Entry Fee"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
              />
              <Button onClick={addPlayer} className="w-full">
                Add Player
              </Button>
              {players.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Players ({players.length}):</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {players.map((player, index) => (
                      <div key={index} className="text-sm bg-gray-100 p-2 rounded">
                        {player}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                {(['B', 'I', 'N', 'G', 'O'] as const).map(letter => (
                  <div key={letter} className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-red-500 text-white rounded-lg flex items-center justify-center font-bold text-xl shrink-0">
                      {letter}
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[3rem] items-center">
                      {Array.from({ length: 15 }, (_, i) => {
                        let num;
                        if (letter === 'B') num = i + 1;
                        else if (letter === 'I') num = i + 16;
                        else if (letter === 'N') num = i + 31;
                        else if (letter === 'G') num = i + 46;
                        else num = i + 61;
                        
                        const isCalled = numbersByLetter[letter].includes(num);
                        const isCurrentNumber = num === currentNumber;
                        
                        return (
                          <div
                            key={num}
                            className={`w-10 h-10 rounded flex items-center justify-center text-sm font-medium border-2 ${
                              isCurrentNumber
                                ? 'bg-yellow-400 text-black border-yellow-500 font-bold'
                                : isCalled
                                ? 'bg-green-500 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center text-sm text-gray-600">
                Numbers Called: {calledNumbers.length} / 75
              </div>
              
              {!gameActive && calledNumbers.length === 0 && (
                <div className="text-center mt-4">
                  <Button onClick={startNewGame} className="px-8 py-2">
                    Start New Game
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}