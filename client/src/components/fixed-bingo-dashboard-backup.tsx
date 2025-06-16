import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { FIXED_CARTELAS, getCartelaNumbers, formatCartelaDisplay, getFixedPattern } from "@/data/fixed-cartelas";

interface FixedBingoDashboardProps {
  onLogout: () => void;
}

export default function FixedBingoDashboard({ onLogout }: FixedBingoDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Game state
  const [gameSetup, setGameSetup] = useState(false);
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

  // Helper function to get letter for number
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "?";
  };

  const shuffleNumbers = () => {
    // Only allow shuffle when game is active
    if (!activeGameId) {
      return;
    }
    
    setIsShuffling(true);
    
    // Play money counter sound effect for shuffle
    try {
      const audio = new Audio('/attached_assets/money-counter-95830_1750063611267.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {
        console.log('Money counter sound not available');
      });
    } catch (error) {
      console.log('Audio playback error for shuffle sound');
    }
    
    // Enhanced shuffle animation duration
    setTimeout(() => {
      setIsShuffling(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BINGO Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome, {user?.name} | Shop Credit: Testing...
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            >
              Logout
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
                  {activeGameId && lastCalledNumber ? (
                    <>
                      <div className="flex justify-center items-center space-x-2 mb-2">
                        <div className="w-12 h-12 bg-red-500 text-white font-bold text-xl flex items-center justify-center rounded">
                          {getLetterForNumber(lastCalledNumber)}
                        </div>
                        <div className="w-12 h-12 bg-gray-800 text-white font-bold text-xl flex items-center justify-center rounded">
                          {lastCalledNumber}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        {isShuffling ? "CALLING..." : `${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}`}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center items-center space-x-2 mb-2">
                        <div className="w-12 h-12 bg-gray-300 text-gray-500 font-bold text-xl flex items-center justify-center rounded">
                          ?
                        </div>
                        <div className="w-12 h-12 bg-gray-300 text-gray-500 font-bold text-xl flex items-center justify-center rounded">
                          ?
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        No game active
                      </p>
                    </>
                  )}
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
                      className="mt-1"
                      placeholder="Enter amount"
                    />
                  </div>

                  {/* Create Game Button */}
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={gameActive || gameSetup}
                  >
                    Create Game
                  </Button>

                  {/* Start Game Button */}
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!gameSetup || gameActive}
                  >
                    Start Game
                  </Button>

                  {/* Shuffle Button */}
                  <div className="flex justify-center">
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 text-white py-1 text-xs"
                      onClick={shuffleNumbers}
                      disabled={isShuffling}
                    >
                      {isShuffling ? "..." : "Shuffle"}
                    </Button>
                  </div>
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
                  {/* B Column */}
                  <div className="space-y-2">
                    {Array.from({length: 15}, (_, i) => i + 1).map(num => (
                      <div 
                        key={num} 
                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-red-500 text-white border-2 border-red-600' + (isShuffling ? ' shuffle-animation' : '')
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  
                  {/* I Column */}
                  <div className="space-y-2">
                    {Array.from({length: 15}, (_, i) => i + 16).map(num => (
                      <div 
                        key={num} 
                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-blue-500 text-white border-2 border-blue-600' + (isShuffling ? ' shuffle-animation' : '')
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  
                  {/* N Column */}
                  <div className="space-y-2">
                    {Array.from({length: 15}, (_, i) => i + 31).map(num => (
                      <div 
                        key={num} 
                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-green-500 text-white border-2 border-green-600' + (isShuffling ? ' shuffle-animation' : '')
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  
                  {/* G Column */}
                  <div className="space-y-2">
                    {Array.from({length: 15}, (_, i) => i + 46).map(num => (
                      <div 
                        key={num} 
                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-yellow-500 text-white border-2 border-yellow-600' + (isShuffling ? ' shuffle-animation' : '')
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  
                  {/* O Column */}
                  <div className="space-y-2">
                    {Array.from({length: 15}, (_, i) => i + 61).map(num => (
                      <div 
                        key={num} 
                        className={`h-10 rounded flex items-center justify-center text-sm font-medium ${
                          calledNumbers.includes(num) 
                            ? 'bg-purple-500 text-white border-2 border-purple-600' + (isShuffling ? ' shuffle-animation' : '')
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}