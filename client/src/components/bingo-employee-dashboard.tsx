import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FIXED_CARTELAS, getCartelaNumbers, getFixedCartelaPattern } from "@/data/fixed-cartelas";
import { EmployeeCollectorManagement } from "@/components/employee-collector-management";

interface BingoEmployeeDashboardProps {
  onLogout: () => void;
}

export default function BingoEmployeeDashboard({ onLogout }: BingoEmployeeDashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]); // Numbers shown as marked on board
  const [blinkingNumber, setBlinkingNumber] = useState<number | null>(null); // Number currently blinking
  const [lastCalledNumber, setLastCalledNumber] = useState<number | null>(null);
  const [gameAmount, setGameAmount] = useState("20");
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [currentAudioRef, setCurrentAudioRef] = useState<HTMLAudioElement | null>(null);
  
  // Cartela management
  const [selectedCartelas, setSelectedCartelas] = useState<Set<number>>(new Set());
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  
  // Winner checking
  const [showWinnerChecker, setShowWinnerChecker] = useState(false);
  const [winnerCartelaNumber, setWinnerCartelaNumber] = useState("");
  const [showWinnerResult, setShowWinnerResult] = useState(false);
  interface WinnerResult {
    isWinner: boolean;
    cartela: number;
    message: string;
    pattern: string;
    winningCells: number[];
    cartelaPattern?: number[][];
  }
  
  const [winnerResult, setWinnerResult] = useState<WinnerResult>({ isWinner: false, cartela: 0, message: "", pattern: "", winningCells: [], cartelaPattern: undefined });
  
  // Animation states
  const [isShuffling, setIsShuffling] = useState(false);
  const [showCartelaPreview, setShowCartelaPreview] = useState(false);
  const [previewCartela, setPreviewCartela] = useState<number | null>(null);
  const [isBoardShuffling, setIsBoardShuffling] = useState(false);
  const [shuffledPositions, setShuffledPositions] = useState<number[]>([]);
  
  // Auto-calling states
  const [isAutoCall, setIsAutoCall] = useState(false);
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [pausedAudio, setPausedAudio] = useState<HTMLAudioElement | null>(null);
  const [pausedAudioTime, setPausedAudioTime] = useState<number>(0);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // Speed control
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(3); // seconds between numbers
  
  // Timer reference for instant pause control
  const numberCallTimer = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Store previous game setup for restart functionality
  const [previousGameSetup, setPreviousGameSetup] = useState<{
    cartelas: Set<number>;
    amount: string;
  } | null>(null);
  
  // Active game query
  const { data: activeGame } = useQuery({
    queryKey: ['/api/games/active'],
    refetchInterval: 2000
  });

  // Shop data query with frequent refresh for real-time profit margin updates
  const { data: shopData } = useQuery({
    queryKey: [`/api/shops/${user?.shopId}`],
    enabled: !!user?.shopId,
    refetchInterval: 5000 // Refresh every 5 seconds to catch admin changes
  });

  // Calculate amounts based on selected cartelas and profit margin
  const calculateAmounts = () => {
    const totalCartelas = bookedCartelas.size + selectedCartelas.size; // Include both collector and employee cartelas
    const amountPerCartela = parseFloat(gameAmount) || 20;
    const totalCollected = totalCartelas * amountPerCartela;
    // Use shop's actual profit margin from shopData
    const profitMargin = ((shopData as any)?.profitMargin || 10) / 100;
    const winnerAmount = totalCollected * (1 - profitMargin);
    const profitAmount = totalCollected * profitMargin;
    
    return {
      totalCollected,
      winnerAmount,
      profitAmount,
      totalCartelas
    };
  };

  // Game history query for admin connection
  const { data: gameHistory } = useQuery({
    queryKey: ['/api/analytics/shop', user?.shopId],
    enabled: !!user?.shopId,
    refetchInterval: 10000 // Refresh every 10 seconds for live updates
  });

  // Admin credit balance query
  const { data: adminData } = useQuery({
    queryKey: ['/api/users', (shopData as any)?.adminId],
    queryFn: async () => {
      if (!(shopData as any)?.adminId) return null;
      const response = await fetch(`/api/users/${(shopData as any).adminId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!(shopData as any)?.adminId,
    refetchInterval: 30000 // Check admin balance every 30 seconds
  });

  // Cartelas query for real-time updates
  const { data: cartelas, refetch: refetchCartelas } = useQuery({
    queryKey: ['/api/cartelas', user?.shopId],
    queryFn: async () => {
      if (!user?.shopId) return [];
      const response = await fetch(`/api/cartelas/${user.shopId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.shopId,
    refetchInterval: 2000 // Refresh every 2 seconds for real-time updates
  });

  // Sync with active game data
  useEffect(() => {
    if (activeGame) {
      // Only sync if this is a different game or if we don't have a current game
      const incomingGameId = (activeGame as any).id;
      const incomingStatus = (activeGame as any).status;
      
      // If the incoming game is completed, don't set it as active
      if (incomingStatus === 'completed') {
        return;
      }
      
      setActiveGameId(incomingGameId);
      setGameActive(incomingStatus === 'active');
      setGameFinished(incomingStatus === 'completed');
      setGamePaused(incomingStatus === 'paused');
      
      // Convert string array to number array for proper number tracking
      const gameCalledNumbers = ((activeGame as any).calledNumbers || []).map((n: string) => parseInt(n));
      
      // Always update called numbers to reflect the current game state
      setCalledNumbers(gameCalledNumbers);
      // Only sync marked numbers if this is a fresh game load (not during active play)
      if (gameCalledNumbers.length === 0 || !markedNumbers.length) {
        const numbersToMark = gameCalledNumbers.slice(0, -1);
        setMarkedNumbers(numbersToMark); // All except last number
      }
      
      // Include both game cartelas and collector-marked cartelas
      const gameCartelas = new Set((activeGame as any).cartelas || []);
      
      // Debug: Log all cartelas to see their structure
      console.log("All cartelas data:", cartelas?.slice(0, 3));
      
      const collectorMarkedCartelas = (cartelas || [])
        .filter((c: any) => {
          const hasCollector = c.collectorId !== null && c.collectorId !== undefined;
          if (hasCollector) {
            console.log(`Cartela ${c.cartelaNumber} marked by collector ${c.collectorId}`);
          }
          return hasCollector;
        })
        .map((c: any) => c.cartelaNumber);
      
      console.log("Game cartelas:", Array.from(gameCartelas));
      console.log("Collector marked cartelas:", collectorMarkedCartelas);
      
      setBookedCartelas(new Set([...Array.from(gameCartelas), ...collectorMarkedCartelas]));
      
      const lastNumber = gameCalledNumbers.slice(-1)[0];
      setLastCalledNumber(lastNumber || null);
    } else {
      // Clear all game state when no active game but keep collector-marked cartelas unavailable
      setActiveGameId(null);
      setGameActive(false);
      setGameFinished(false);
      setCalledNumbers([]);
      setMarkedNumbers([]);
      setLastCalledNumber(null);
      
      // Still show collector-marked cartelas as unavailable even when no active game
      // Debug: Log all cartelas to see their structure
      console.log("No active game - All cartelas data:", cartelas?.slice(0, 3));
      
      const collectorMarkedCartelas = (cartelas || [])
        .filter((c: any) => {
          const hasCollector = c.collectorId !== null && c.collectorId !== undefined;
          if (hasCollector) {
            console.log(`No active game - Cartela ${c.cartelaNumber} marked by collector ${c.collectorId}`);
          }
          return hasCollector;
        })
        .map((c: any) => c.cartelaNumber);
      
      console.log("No active game - Collector marked cartelas:", collectorMarkedCartelas);
      setBookedCartelas(new Set(collectorMarkedCartelas));
    }
  }, [activeGame, cartelas]);

  // Clear timers and stop audio immediately when game is paused
  useEffect(() => {
    if (gamePaused) {
      // Clear number calling timer
      if (numberCallTimer.current) {
        clearTimeout(numberCallTimer.current);
        numberCallTimer.current = null;
      }
      
      // Stop current audio like pausing music
      if (currentAudioRef) {
        currentAudioRef.pause();
        currentAudioRef.currentTime = 0;
        setCurrentAudioRef(null);
        setAudioPlaying(false);
      }
    }
  }, [gamePaused, currentAudioRef]);

  // Cleanup auto-calling interval on unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [autoCallInterval, currentAudio]);

  // Helper function to get letter for number
  const getLetterForNumber = (num: number): string => {
    if (num >= 1 && num <= 15) return "B";
    if (num >= 16 && num <= 30) return "I";
    if (num >= 31 && num <= 45) return "N";
    if (num >= 46 && num <= 60) return "G";
    if (num >= 61 && num <= 75) return "O";
    return "?";
  };

  // Helper function to get ball color for number
  const getBallColor = (num: number): string => {
    if (num >= 1 && num <= 15) return "from-blue-500 to-blue-700"; // B - Blue
    if (num >= 16 && num <= 30) return "from-red-500 to-red-700"; // I - Red
    if (num >= 31 && num <= 45) return "from-green-500 to-green-700"; // N - Green
    if (num >= 46 && num <= 60) return "from-yellow-500 to-yellow-600"; // G - Yellow
    if (num >= 61 && num <= 75) return "from-purple-500 to-purple-700"; // O - Purple
    return "from-gray-400 to-gray-600";
  };

  // Generate next number for calling
  const getNextNumber = (): number | null => {
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
      .filter(n => !calledNumbers.includes(n));
    
    if (availableNumbers.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    return availableNumbers[randomIndex];
  };

  // Call a single number with hover effect and audio
  const callNumber = async () => {
    if (!activeGameId || isPaused) return;

    const numberToCall = getNextNumber();
    if (!numberToCall) {
      setGameActive(false);
      setGameFinished(true);
      setIsAutoCall(false);
      return;
    }

    // Set hovering state for preview
    setNextNumber(numberToCall);
    setIsHovering(true);
    
    // Hover effect duration
    setTimeout(() => {
      setIsHovering(false);
      setIsShuffling(true);
      
      // Play calling sound
      try {
        const audio = new Audio('/attached_assets/money-counter-95830_1750063611267.mp3');
        audio.volume = 0.6;
        setCurrentAudio(audio);
        audio.play().catch(() => {
          console.log('Money counter sound not available');
        });
      } catch (error) {
        console.log('Audio playback error for calling sound');
      }

      // Call the API to add the number
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/games/${activeGameId}/numbers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: numberToCall })
          });

          if (response.ok) {
            const updatedNumbers = [...calledNumbers, numberToCall];
            setCalledNumbers(updatedNumbers);
            setLastCalledNumber(numberToCall);
          }
        } catch (error) {
          console.error('Failed to call number:', error);
        }
        
        setIsShuffling(false);
        setNextNumber(null);
      }, 1500);
    }, 800); // Hover duration
  };

  // Start auto-calling
  const startAutoCall = () => {
    if (autoCallInterval) clearInterval(autoCallInterval);
    
    setIsAutoCall(true);
    setIsPaused(false);
    
    const interval = setInterval(() => {
      if (!isPaused && gameActive && !gameFinished) {
        callNumber();
      }
    }, 4000); // 4 seconds between calls
    
    setAutoCallInterval(interval);
  };

  // Stop auto-calling immediately
  const stopAutoCall = () => {
    setIsAutoCall(false);
    setIsPaused(false);
    
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    
    // Stop any currently playing audio immediately
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Reset states
    setIsShuffling(false);
    setIsHovering(false);
    setNextNumber(null);
  };

  // Pause auto-calling immediately
  const pauseAutoCall = () => {
    setIsPaused(!isPaused);
    
    // Stop any currently playing audio immediately when pausing
    if (!isPaused && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsShuffling(false);
      setIsHovering(false);
      setNextNumber(null);
    }
  };

  // Enhanced pause game function for immediate stop
  const enhancedPauseGame = async () => {
    try {
      // Call backend to pause the game
      const response = await fetch(`/api/games/${activeGameId}/pause`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: true })
      });
      
      if (response.ok) {
        setGamePaused(true);
        
        // Immediately stop all audio and animations
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          setCurrentAudio(null);
        }
        
        // Clear any pending timers
        if (numberCallTimer.current) {
          clearTimeout(numberCallTimer.current);
          numberCallTimer.current = null;
        }
        
        // Stop all animations immediately
        setIsShuffling(false);
        setIsHovering(false);
        setNextNumber(null);
        setAudioPlaying(false);
        
        toast({
          title: "Game Paused",
          description: "Game has been paused immediately"
        });
      }
    } catch (error) {
      console.error('Failed to pause game:', error);
    }
  };

  // Board shuffle animation - purely visual entertainment
  const shuffleBingoBoard = () => {
    setIsBoardShuffling(true);
    
    // Create array of all 75 numbers for shuffling
    const allNumbers = Array.from({length: 75}, (_, i) => i + 1);
    
    // Play shuffle sound effect
    try {
      const audio = new Audio('/attached_assets/money-counter-95830_1750080978946.mp3');
      audio.volume = 0.7;
      audio.play().catch(() => {
        console.log('Shuffle sound not available');
      });
    } catch (error) {
      console.log('Audio playback error for shuffle sound');
    }
    
    // Shuffle animation phases
    let shuffleCount = 0;
    const maxShuffles = 8;
    
    const shuffleInterval = setInterval(() => {
      // Create randomized positions for visual effect
      const shuffled = [...allNumbers].sort(() => Math.random() - 0.5);
      setShuffledPositions(shuffled);
      
      shuffleCount++;
      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        // Return to original positions
        setShuffledPositions([]);
        setTimeout(() => {
          setIsBoardShuffling(false);
        }, 300);
      }
    }, 200);
  };

  // Enhanced restart function - restore previous game setup
  const restartGame = () => {
    if (previousGameSetup) {
      // Restore previous cartelas and amount
      setSelectedCartelas(previousGameSetup.cartelas);
      setGameAmount(previousGameSetup.amount);
      
      toast({
        title: "Game Setup Restored",
        description: `Restored ${previousGameSetup.cartelas.size} cartelas and ${previousGameSetup.amount} Birr per cartela. Click Start Game to begin.`
      });
    } else {
      // If no previous setup, just play shuffle sound for feedback
      try {
        const audio = new Audio('/attached_assets/money-counter-95830_1750063611267.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => {
          console.log('Money counter sound not available');
        });
      } catch (error) {
        console.log('Audio playback error for shuffle sound');
      }
      
      toast({
        title: "No Previous Game",
        description: "No previous game setup to restore. Select cartelas and start a new game."
      });
    }
  };

  // Original shuffle for number calling - keep existing functionality
  const shuffleNumbers = () => {
    if (!activeGameId) return;
    
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
    
    setTimeout(() => {
      setIsShuffling(false);
    }, 2500);
  };

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(gameAmount),
          cartelas: Array.from(selectedCartelas)
        })
      });
      if (!response.ok) throw new Error('Failed to create game');
      return response.json();
    },
    onSuccess: (data) => {
      setActiveGameId(data.id);
      setGameActive(false);
      setGameFinished(false);
      setCalledNumbers([]); // Ensure no numbers are pre-marked
      setLastCalledNumber(null);
      setBookedCartelas(new Set(selectedCartelas));
      // Keep selectedCartelas for validation during the game
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      toast({
        title: "Game Created",
        description: `Game created with ${Array.from(selectedCartelas).length} cartelas`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create game",
        variant: "destructive"
      });
    }
  });

  // Mark cartela by employee mutation
  const markCartelaByEmployeeMutation = useMutation({
    mutationFn: async (cartelaNumber: number) => {
      const cartela = (cartelas || []).find((c: any) => c.cartelaNumber === cartelaNumber);
      if (!cartela) throw new Error('Cartela not found');
      
      const response = await fetch('/api/employees/mark-cartela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartelaId: cartela.id, 
          employeeId: user?.id 
        })
      });
      if (!response.ok) throw new Error('Failed to mark cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user?.shopId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark cartela",
        variant: "destructive"
      });
    }
  });

  // Unmark cartela by employee mutation
  const unmarkCartelaByEmployeeMutation = useMutation({
    mutationFn: async (cartelaNumber: number) => {
      const cartela = (cartelas || []).find((c: any) => c.cartelaNumber === cartelaNumber);
      if (!cartela) throw new Error('Cartela not found');
      
      const response = await fetch('/api/employees/unmark-cartela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cartelaId: cartela.id, 
          employeeId: user?.id 
        })
      });
      if (!response.ok) throw new Error('Failed to unmark cartela');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user?.shopId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unmark cartela",
        variant: "destructive"
      });
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/start`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to start game');
      return response.json();
    },
    onSuccess: (data) => {
      // Save current game setup before starting
      setPreviousGameSetup({
        cartelas: new Set(selectedCartelas),
        amount: gameAmount
      });
      
      setGameActive(true);
      setActiveGameId(data.id);
      setCalledNumbers([]); // Clear any previous numbers when starting
      setLastCalledNumber(null);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      
      // Play game start sound
      try {
        const audio = new Audio('/attached_assets/game started_1750069128880.mp3');
        audio.volume = 0.8;
        audio.play().catch(() => {
          console.log('Start game sound not available');
        });
      } catch (error) {
        console.log('Start audio playback error');
      }
      
      toast({
        title: "Game Started",
        description: "Bingo game is now active - start calling numbers!"
      });
      
      // Automatically start calling numbers after a short delay
      setTimeout(() => {
        callNumberMutation.mutate();
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Start game error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    }
  });

  // Call number mutation
  const callNumberMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/games/${activeGameId}/numbers`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Failed to call number');
      return response.json();
    },
    onSuccess: (data) => {
      const newNumber = data.calledNumber;
      setLastCalledNumber(newNumber);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      
      // Update the full called numbers list
      const updatedNumbers = (data.calledNumbers || []).map((n: string) => parseInt(n));
      setCalledNumbers(updatedNumbers);

      // Don't process audio or set timers if game is paused
      if (gamePaused) {
        setMarkedNumbers(updatedNumbers);
        return;
      }
      
      // Play number audio if available and no other audio is playing
      if (newNumber && !audioPlaying) {
        const letter = getLetterForNumber(newNumber);
        setAudioPlaying(true);
        
        // If there was a previous blinking number, mark it fully now
        if (blinkingNumber !== null) {
          setMarkedNumbers(prev => [...prev, blinkingNumber]);
        }
        
        // Mark all numbers from called numbers EXCEPT the current one being spoken
        const numbersToMark = updatedNumbers.slice(0, -1); // All except the last (current) number
        setMarkedNumbers(numbersToMark);
        
        // Start blinking the current number immediately
        setBlinkingNumber(newNumber);
        
        // Don't mark the current number - it will be marked when the NEXT number starts
        const audioResetTimer = setTimeout(() => {
          setAudioPlaying(false);
          setCurrentAudioRef(null);
        }, 2500);
        
        try {
          const audio = new Audio(`/attached_assets/${letter}${newNumber}.mp3`);
          audio.volume = 0.8;
          setCurrentAudioRef(audio);
          
          audio.onended = () => {
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
            setCurrentAudioRef(null);
            // Don't mark here - marking happens when next number starts
          };
          audio.onerror = () => {
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
            setCurrentAudioRef(null);
            // Mark immediately if audio fails
            setMarkedNumbers(prev => [...prev, newNumber]);
          };
          audio.play().catch(() => {
            console.log(`Audio for ${letter}${newNumber} not available`);
            clearTimeout(audioResetTimer);
            setAudioPlaying(false);
            setCurrentAudioRef(null);
            // Mark immediately if audio fails
            setMarkedNumbers(prev => [...prev, newNumber]);
          });
        } catch (error) {
          console.log('Audio playback error');
          clearTimeout(audioResetTimer);
          setAudioPlaying(false);
          setCurrentAudioRef(null);
          // Mark immediately if audio fails
          setMarkedNumbers(prev => [...prev, newNumber]);
        }
      } else {
        // If no audio or audio already playing, mark all numbers
        setMarkedNumbers(updatedNumbers);
      }
      
      // Only set timer if game is active and not paused
      if (gameActive && !gameFinished && !gamePaused && activeGameId) {
        // Clear any existing timer first
        if (numberCallTimer.current) {
          clearTimeout(numberCallTimer.current);
        }
        
        numberCallTimer.current = setTimeout(() => {
          // Triple-check conditions before calling (pause state might have changed)
          if (gameActive && !gameFinished && !gamePaused && activeGameId) {
            callNumberMutation.mutate();
          }
        }, autoPlaySpeed * 1000);
      }
    }
  });

  // Reset game mutation - only clears data when manually starting new game
  const resetGameMutation = useMutation({
    mutationFn: async () => {
      // For reset operations, we don't need a specific game ID
      // Just clear all cartela states and reset the frontend
      const response = await fetch('/api/cartelas/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Failed to reset cartelas');
      return response.json();
    },
    onSuccess: () => {
      // Stop any ongoing audio and animations immediately
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      
      // Clear any pending timers
      if (numberCallTimer.current) {
        clearTimeout(numberCallTimer.current);
        numberCallTimer.current = null;
      }
      
      // Reset all game state immediately
      setGameActive(false);
      setGameFinished(false);
      setGamePaused(false);
      setCalledNumbers([]);
      setMarkedNumbers([]);
      setLastCalledNumber(null);
      setActiveGameId(null);
      setBookedCartelas(new Set());
      setSelectedCartelas(new Set());
      setIsShuffling(false);
      setIsHovering(false);
      setNextNumber(null);
      setAudioPlaying(false);
      setShowWinnerResult(false);
      setShowWinnerChecker(false);
      setWinnerCartelaNumber('');
      
      // Invalidate queries to force refresh and clear called numbers from cache
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cartelas', user?.shopId] });
      
      toast({
        title: "Reset Complete",
        description: "All cartelas and game state have been reset"
      });
      
      // Immediately invalidate queries and refresh state
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user?.shopId}`] });
      
      // Force immediate refetch to ensure fresh data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/games/active'] });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end game",
        variant: "destructive"
      });
    }
  });

  // Check winner function - can be called anytime even when paused
  const checkWinner = async () => {
    // Prevent checking winner if game is already finished
    if (gameFinished) {
      toast({
        title: "Game Already Finished",
        description: "This game has already ended with a winner",
        variant: "destructive"
      });
      return;
    }
    
    const cartelaNum = parseInt(winnerCartelaNumber);
    
    if (!cartelaNum || cartelaNum < 1) {
      toast({
        title: "Invalid Cartela",
        description: "Please enter a valid cartela number",
        variant: "destructive"
      });
      return;
    }

    // Check if cartela is selected by employee OR marked by collector
    const isCartelaInGame = selectedCartelas.has(cartelaNum) || bookedCartelas.has(cartelaNum);
    
    if (!isCartelaInGame) {
      // Show red popup for not booked cartela
      setWinnerResult({
        isWinner: false,
        cartela: cartelaNum,
        message: "This cartela was not selected for this game",
        pattern: "",
        winningCells: []
      });
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowWinnerResult(false);
      }, 3000);
      return;
    }

    // Check winner using API with actual cartela data
    try {
      const response = await fetch(`/api/games/${activeGameId}/check-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartelaNumber: cartelaNum,
          calledNumbers: calledNumbers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check winner');
      }

      const result = await response.json();
      
      if (!result.isWinner) {
        // NOT A WINNER - Show red popup and resume game
        setWinnerResult({
          isWinner: false,
          cartela: cartelaNum,
          message: "This Cartela Did Not Win",
          pattern: "",
          winningCells: [],
          cartelaPattern: result.cartelaPattern
        });
        
        // Clear any existing timer to prevent audio overlap
        if (numberCallTimer.current) {
          clearTimeout(numberCallTimer.current);
          numberCallTimer.current = null;
        }
        
        // Play loser sound with proper state management
        if (!audioPlaying) {
          setAudioPlaying(true);
          setTimeout(() => {
            try {
              const audio = new Audio('/attached_assets/losser_1750069128883.mp3');
              audio.volume = 0.8;
              audio.onended = () => setAudioPlaying(false);
              audio.onerror = () => setAudioPlaying(false);
              audio.play().catch(() => {
                console.log('Loser sound not available');
                setAudioPlaying(false);
              });
            } catch (error) {
              console.log('Loser audio playback error');
              setAudioPlaying(false);
            }
          }, 500);
        }
        
        setShowWinnerResult(true);
        setShowWinnerChecker(false);
        
      } else {
        // IS A WINNER - Pause game completely and show green popup
        setGamePaused(true);
        setGameActive(false);
        setGameFinished(true);
        
        setWinnerResult({
          isWinner: true,
          cartela: cartelaNum,
          message: "Congratulations! This Cartela Has Won!",
          pattern: result.winningPattern || "",
          winningCells: result.winningCells || [],
          cartelaPattern: result.cartelaPattern
        });
        
        setShowWinnerResult(true);
        setShowWinnerChecker(false);
        
        // Submit winner to backend and complete the game
        try {
          await fetch(`/api/games/${activeGameId}/declare-winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              winnerCartelaNumber: cartelaNum,
              totalPlayers: bookedCartelas.size, // Use bookedCartelas which contains actual played cartelas
              entryFeePerPlayer: parseFloat(gameAmount || '14'), // Ensure valid number
              allCartelaNumbers: Array.from(bookedCartelas), // Use bookedCartelas instead of selectedCartelas
              calledNumbers: calledNumbers,
              pattern: result.winningPattern
            })
          });
          
          // Mark game as completed to save to history
          await fetch(`/api/games/${activeGameId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              winnerId: cartelaNum,
              winnerName: `Cartela ${cartelaNum}`,
              winningCartela: cartelaNum,
              prizeAmount: (parseFloat(gameAmount) * selectedCartelas.size).toString()
            })
          });
          
          // Game completed with winner - keep game in finished state
          // Manual reset required via reset button
          
          // Invalidate all related queries to update admin dashboard
          queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
          queryClient.invalidateQueries({ queryKey: ['/api/analytics/shop'] });
          queryClient.invalidateQueries({ queryKey: ['/api/analytics/trends'] });
          queryClient.invalidateQueries({ queryKey: ['/api/analytics/profit-distribution'] });
          
          // Play winner sound
          try {
            const audio = new Audio('/attached_assets/winner_1750069128882.mp3');
            audio.volume = 0.8;
            audio.play().catch(() => {
              console.log('Winner sound not available');
            });
          } catch (error) {
            console.log('Winner audio playback error');
          }
          
          toast({
            title: "Winner Confirmed!",
            description: `Cartela #${cartelaNum} wins with ${result.winningPattern}`,
            duration: 5000
          });
          
        } catch (error) {
          console.error('Failed to declare winner:', error);
          toast({
            title: "Error",
            description: "Failed to process winner. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Failed to check winner:', error);
      
      // Show error popup similar to "not winner" popup
      setWinnerResult({
        isWinner: false,
        cartela: cartelaNum,
        message: "Error checking cartela. Please try again.",
        pattern: "",
        winningCells: []
      });
      setShowWinnerResult(true);
      setShowWinnerChecker(false);
      
      toast({
        title: "Error",
        description: "Failed to check winner. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Pause game function - instantly stops audio, animations, and number calling like pausing music
  const pauseGame = () => {
    setGamePaused(true);
    
    // Clear the timer immediately to stop number calling
    if (numberCallTimer.current) {
      clearTimeout(numberCallTimer.current);
      numberCallTimer.current = null;
    }
    
    // Preserve audio state if currently playing
    if (currentAudio && !currentAudio.paused) {
      setPausedAudio(currentAudio);
      setPausedAudioTime(currentAudio.currentTime);
      currentAudio.pause();
      setCurrentAudio(null);
    }
    
    // Stop all animations immediately
    setIsShuffling(false);
    setIsHovering(false);
    setNextNumber(null);
    
    // Clear any auto-calling intervals
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    setIsAutoCall(false);
    setIsPaused(false);
  };

  // Resume game function - continues number calling
  const resumeGame = async () => {
    try {
      // Call backend to resume the game
      const response = await fetch(`/api/games/${activeGameId}/pause`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: false })
      });
      
      if (response.ok) {
        setGamePaused(false);
        
        // Resume paused audio if it exists
        if (pausedAudio && pausedAudioTime > 0) {
          pausedAudio.currentTime = pausedAudioTime;
          pausedAudio.play().then(() => {
            setCurrentAudio(pausedAudio);
            setPausedAudio(null);
            setPausedAudioTime(0);
          }).catch((error) => {
            console.log('Failed to resume audio:', error);
            setPausedAudio(null);
            setPausedAudioTime(0);
          });
        }
        
        toast({
          title: "Game Resumed",
          description: "Game has been resumed"
        });
        
        // Resume calling numbers if game is still active and no audio is playing
        if (gameActive && !gameFinished && activeGameId && !pausedAudio) {
          setTimeout(() => {
            callNumberMutation.mutate();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Failed to resume game:', error);
      toast({
        title: "Error",
        description: "Failed to resume game",
        variant: "destructive"
      });
    }
  };

  // Check for BINGO win patterns
  function checkBingoWin(cartelaPattern: number[][], calledNumbers: number[]): { isWinner: boolean; pattern?: string; winningCells?: number[] } {
    if (cartelaPattern.length !== 5) return { isWinner: false };
    
    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      let hasAllNumbers = true;
      for (let col = 0; col < 5; col++) {
        const num = cartelaPattern[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          hasAllNumbers = false;
          break;
        }
      }
      if (hasAllNumbers) {
        const winningCells = [];
        for (let col = 0; col < 5; col++) {
          winningCells.push(row * 5 + col);
        }
        return { isWinner: true, pattern: `Horizontal Row ${row + 1}`, winningCells };
      }
    }
    
    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      let hasAllNumbers = true;
      for (let row = 0; row < 5; row++) {
        const num = cartelaPattern[row][col];
        if (num !== 0 && !calledNumbers.includes(num)) {
          hasAllNumbers = false;
          break;
        }
      }
      if (hasAllNumbers) {
        const letters = ['B', 'I', 'N', 'G', 'O'];
        const winningCells = [];
        for (let row = 0; row < 5; row++) {
          winningCells.push(row * 5 + col);
        }
        return { isWinner: true, pattern: `Vertical ${letters[col]} Column`, winningCells };
      }
    }
    
    // Check diagonal (top-left to bottom-right)
    let hasAllNumbers = true;
    for (let i = 0; i < 5; i++) {
      const num = cartelaPattern[i][i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        hasAllNumbers = false;
        break;
      }
    }
    if (hasAllNumbers) {
      const winningCells = [];
      for (let i = 0; i < 5; i++) {
        winningCells.push(i * 5 + i);
      }
      return { isWinner: true, pattern: "Diagonal (Top-Left to Bottom-Right)", winningCells };
    }
    
    // Check diagonal (top-right to bottom-left)
    hasAllNumbers = true;
    for (let i = 0; i < 5; i++) {
      const num = cartelaPattern[i][4 - i];
      if (num !== 0 && !calledNumbers.includes(num)) {
        hasAllNumbers = false;
        break;
      }
    }
    if (hasAllNumbers) {
      const winningCells = [];
      for (let i = 0; i < 5; i++) {
        winningCells.push(i * 5 + (4 - i));
      }
      return { isWinner: true, pattern: "Diagonal (Top-Right to Bottom-Left)", winningCells };
    }
    
    return { isWinner: false };
  }

  // Check if admin has low credit balance
  const adminCreditBalance = parseFloat((adminData as any)?.creditBalance || '0');
  const showLowCreditWarning = adminData && adminCreditBalance < 500;

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Admin Low Credit Warning */}
      {showLowCreditWarning && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">
                <strong>⚠ Admin Low Credit Balance</strong>
                <br />
                Shop admin balance is low. Contact admin to add more credits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bingo Play</h1>
            <p className="text-sm text-gray-600">
              {user?.username} - employee
            </p>
          </div>
          
          {/* Center - Winner Amount */}
          <div className="text-center">
            <div className="text-6xl font-bold text-green-600">
              Winner Gets: <span className="text-8xl">{calculateAmounts().winnerAmount.toFixed(2)} Birr</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white">
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="game" className="w-full">
        <div className="bg-white border-b px-4">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="game">Bingo Game</TabsTrigger>
            <TabsTrigger value="collectors">Collectors</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="game" className="mt-0">
          <div className="flex">
        {/* Left Panel */}
        <div className="w-80 p-4">
          {/* Current Number Display */}
          <Card className="mb-4">
            <CardContent className="p-6 text-center">
              {activeGameId ? (
                <>
                  <div className="flex justify-center items-center mb-4">
                    {/* Show next number if hovering, otherwise show last called number */}
                    {isHovering && nextNumber ? (
                      <div className={`relative w-48 h-48 bg-gradient-to-br ${getBallColor(nextNumber)} rounded-full shadow-lg transform scale-110 animate-pulse transition-all duration-300`}>
                        {/* Ball shine effect */}
                        <div className="absolute top-4 left-6 w-8 h-8 bg-white/30 rounded-full blur-sm"></div>
                        <div className="absolute top-2 left-4 w-4 h-4 bg-white/50 rounded-full"></div>
                        
                        {/* Letter */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-black text-2xl">
                          {getLetterForNumber(nextNumber)}
                        </div>
                        
                        {/* Inner white circle for number background */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-white rounded-full flex items-center justify-center">
                          <span className="text-gray-900 font-black text-6xl">
                            {nextNumber}
                          </span>
                        </div>
                      </div>
                    ) : lastCalledNumber ? (
                      <div className={`relative w-48 h-48 bg-gradient-to-br ${getBallColor(lastCalledNumber)} rounded-full shadow-lg transform ${isShuffling ? 'animate-bounce scale-110' : 'hover:scale-105'} transition-all duration-300`}>
                        {/* Ball shine effect */}
                        <div className="absolute top-4 left-6 w-8 h-8 bg-white/30 rounded-full blur-sm"></div>
                        <div className="absolute top-2 left-4 w-4 h-4 bg-white/50 rounded-full"></div>
                        
                        {/* Letter */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-black text-2xl">
                          {getLetterForNumber(lastCalledNumber)}
                        </div>
                        
                        {/* Inner white circle for number background */}
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-white rounded-full flex items-center justify-center">
                          <span className="text-gray-900 font-black text-6xl">
                            {lastCalledNumber}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-48 h-48 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
                        <div className="absolute top-4 left-6 w-8 h-8 bg-white/30 rounded-full blur-sm"></div>
                        <div className="absolute top-2 left-4 w-4 h-4 bg-white/50 rounded-full"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-black text-2xl">?</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    {isHovering ? "Next Number..." : isShuffling ? "CALLING..." : lastCalledNumber ? `${getLetterForNumber(lastCalledNumber)}-${lastCalledNumber}` : "Ready to Call"}
                  </p>
                </>
              ) : (
                <>
                  <div className="relative w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg mx-auto mb-4">
                    <div className="absolute top-2 left-3 w-4 h-4 bg-white/30 rounded-full blur-sm"></div>
                    <div className="absolute top-1 left-2 w-2 h-2 bg-white/50 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-xs">START</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Create a Game to Begin</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Game Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Game Amount (Birr)</Label>
                  <Input
                    type="number"
                    value={gameAmount}
                    onChange={(e) => setGameAmount(e.target.value)}
                    disabled={gameActive}
                    className="mt-1"
                  />
                </div>

                {/* Speed Control */}
                <div>
                  <Label className="text-sm font-medium">Auto Play Speed</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={autoPlaySpeed}
                      onChange={(e) => setAutoPlaySpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Fast (1s)</span>
                      <span className="font-medium">{autoPlaySpeed}s between numbers</span>
                      <span>Slow (10s)</span>
                    </div>
                  </div>
                </div>

                {/* Available Cartelas for Game */}
                <div>
                  <Label className="text-sm font-medium">Cartelas for Game</Label>
                  <div className="flex flex-wrap gap-1 mt-2 min-h-[2rem]">
                    {/* Show collector-marked cartelas */}
                    {Array.from(bookedCartelas).map(num => (
                      <Badge key={num} className="bg-green-500 text-white">
                        #{num} (Collector)
                      </Badge>
                    ))}
                    {/* Show employee-selected cartelas */}
                    {Array.from(selectedCartelas).map(num => (
                      <Badge key={num} className="bg-blue-500 text-white">
                        #{num} (Manual)
                      </Badge>
                    ))}
                    {bookedCartelas.size === 0 && selectedCartelas.size === 0 && (
                      <span className="text-xs text-gray-500 italic">
                        No cartelas ready - collectors can mark cartelas or you can select manually
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Total cartelas: {bookedCartelas.size + selectedCartelas.size}
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setShowCartelaSelector(true)}
                    disabled={gameActive || resetGameMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Add More
                  </Button>
                  <Button 
                    onClick={() => {
                      if (!resetGameMutation.isPending && (activeGameId || gameFinished)) {
                        resetGameMutation.mutate();
                      }
                    }}
                    disabled={(!activeGameId && !gameFinished) || resetGameMutation.isPending}
                    variant="outline"
                  >
                    {resetGameMutation.isPending ? "Resetting..." : "Reset"}
                  </Button>
                  
                  {!activeGameId ? (
                    <Button 
                      onClick={() => createGameMutation.mutate()}
                      disabled={(selectedCartelas.size === 0 && bookedCartelas.size === 0) || createGameMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {createGameMutation.isPending ? "Starting..." : "Start Game"}
                    </Button>
                  ) : !gameActive && !gameFinished ? (
                    <Button 
                      onClick={() => startGameMutation.mutate()}
                      disabled={startGameMutation.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {startGameMutation.isPending ? "Starting..." : "Start Game"}
                    </Button>
                  ) : gameFinished ? (
                    <Button 
                      onClick={() => {
                        // Manually reset all state for new game
                        setGameActive(false);
                        setGameFinished(false);
                        setCalledNumbers([]);
                        setMarkedNumbers([]);
                        setLastCalledNumber(null);
                        setActiveGameId(null);
                        setBookedCartelas(new Set());
                        setSelectedCartelas(new Set());
                        setWinnerResult({ isWinner: false, cartela: 0, message: "", pattern: "", winningCells: [], cartelaPattern: undefined });
                        setShowWinnerResult(false);
                        setGamePaused(false);
                        
                        // Clear any auto-calling states
                        if (autoCallInterval) {
                          clearInterval(autoCallInterval);
                          setAutoCallInterval(null);
                        }
                        if (currentAudio) {
                          currentAudio.pause();
                          currentAudio.currentTime = 0;
                          setCurrentAudio(null);
                        }
                        // Clear current audio reference
                        if (currentAudioRef) {
                          currentAudioRef.pause();
                          currentAudioRef.currentTime = 0;
                          setCurrentAudioRef(null);
                        }
                        setAudioPlaying(false);
                        setIsAutoCall(false);
                        setIsPaused(false);
                        setIsShuffling(false);
                        setIsHovering(false);
                        setNextNumber(null);
                        
                        queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      New Game
                    </Button>
                  ) : gameActive ? (
                    <Button 
                      onClick={() => {
                        if (gamePaused) {
                          resumeGame();
                        } else {
                          enhancedPauseGame();
                        }
                      }}
                      className={gamePaused ? "bg-green-500 hover:bg-green-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
                    >
                      {gamePaused ? "Resume Game" : "Pause Game"}
                    </Button>
                  ) : null}
                  
                  {gameActive ? (
                    <Button 
                      onClick={() => resetGameMutation.mutate()}
                      disabled={resetGameMutation.isPending}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {resetGameMutation.isPending ? "Ending..." : "End Game"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={restartGame}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      Restart
                    </Button>
                  )}
                </div>


              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - BINGO Board */}
        <div className="flex-1 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Called Numbers Board</CardTitle>
              <p className="text-center text-sm text-gray-600">
                Numbers Called: {calledNumbers.length}
              </p>
            </CardHeader>
            <CardContent>
              {/* Horizontal BINGO Board */}
              <div className="space-y-2">
                {/* B Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    B
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 1).map((num, index) => {
                      const shuffledNum = isBoardShuffling && shuffledPositions.length > 0 ? shuffledPositions[index] : num;
                      return (
                        <div 
                          key={num} 
                          className={`h-16 w-16 rounded flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                            isBoardShuffling 
                              ? 'animate-pulse bg-yellow-200 text-black transform scale-110' 
                              : blinkingNumber === num
                                ? 'bg-red-500 text-white slow-blink' 
                              : markedNumbers.includes(num) 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-100 text-black border'
                          }`}
                        >
                          {shuffledNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* I Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    I
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 16).map((num, index) => {
                      const shuffledNum = isBoardShuffling && shuffledPositions.length > 0 ? shuffledPositions[index + 15] : num;
                      return (
                        <div 
                          key={num} 
                          className={`h-16 w-16 rounded flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                            isBoardShuffling 
                              ? 'animate-pulse bg-yellow-200 text-black transform scale-110' 
                              : blinkingNumber === num
                                ? 'bg-blue-500 text-white slow-blink' 
                              : markedNumbers.includes(num) 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 text-black border'
                          }`}
                        >
                          {shuffledNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* N Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    N
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 31).map((num, index) => {
                      const shuffledNum = isBoardShuffling && shuffledPositions.length > 0 ? shuffledPositions[index + 30] : num;
                      return (
                        <div 
                          key={num} 
                          className={`h-16 w-16 rounded flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                            isBoardShuffling 
                              ? 'animate-pulse bg-yellow-200 text-black transform scale-110' 
                              : blinkingNumber === num
                                ? 'bg-green-500 text-white slow-blink' 
                              : markedNumbers.includes(num) 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-100 text-black border'
                          }`}
                        >
                          {shuffledNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* G Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    G
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 46).map((num, index) => {
                      const shuffledNum = isBoardShuffling && shuffledPositions.length > 0 ? shuffledPositions[index + 45] : num;
                      return (
                        <div 
                          key={num} 
                          className={`h-16 w-16 rounded flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                            isBoardShuffling 
                              ? 'animate-pulse bg-yellow-200 text-black transform scale-110' 
                              : blinkingNumber === num
                                ? 'bg-yellow-500 text-white slow-blink' 
                              : markedNumbers.includes(num) 
                                ? 'bg-yellow-500 text-white' 
                                : 'bg-gray-100 text-black border'
                          }`}
                        >
                          {shuffledNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* O Row */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 text-white rounded flex items-center justify-center font-bold text-sm">
                    O
                  </div>
                  <div className="grid grid-cols-15 gap-1 flex-1">
                    {Array.from({length: 15}, (_, i) => i + 61).map((num, index) => {
                      const shuffledNum = isBoardShuffling && shuffledPositions.length > 0 ? shuffledPositions[index + 60] : num;
                      return (
                        <div 
                          key={num} 
                          className={`h-16 w-16 rounded flex items-center justify-center text-2xl font-black transition-all duration-200 ${
                            isBoardShuffling 
                              ? 'animate-pulse bg-yellow-200 text-black transform scale-110' 
                              : blinkingNumber === num
                                ? 'bg-purple-500 text-white slow-blink' 
                              : markedNumbers.includes(num) 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-gray-100 text-black border'
                          }`}
                        >
                          {shuffledNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-4 justify-center">
                <Button 
                  onClick={() => {
                    // Immediately pause the game to stop number calling
                    pauseGame();
                    setShowWinnerChecker(true);
                  }}
                  disabled={!activeGameId}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-8"
                >
                  Check Winner
                </Button>
                <Button 
                  onClick={shuffleBingoBoard}
                  disabled={isBoardShuffling}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8"
                >
                  {isBoardShuffling ? "Shuffling..." : "🎲 Shuffle Board"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cartela Selector Dialog */}
      <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Additional Manual Cartela Selection (Optional)</DialogTitle>
            <DialogDescription>
              You can manually select additional cartelas if needed. Selected: {selectedCartelas.size} cartelas | Collector-marked: {bookedCartelas.size} cartelas
              <br />
              <span className="text-sm text-blue-600 font-medium">
                • White cartelas: Available for manual selection
                • Gray cartelas: Already marked by collectors  
                • Red cartelas: Your manual selections
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-10 gap-4 p-6">
            {(cartelas || []).map((cartela: any) => (
              <div key={cartela.cartelaNumber} className="text-center">
                <div
                  className={`p-4 border rounded cursor-pointer text-center mb-2 text-2xl font-bold ${
                    selectedCartelas.has(cartela.cartelaNumber)
                      ? 'bg-red-400 text-white border-red-500'
                      : bookedCartelas.has(cartela.cartelaNumber)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => {
                    if (!bookedCartelas.has(cartela.cartelaNumber)) {
                      if (selectedCartelas.has(cartela.cartelaNumber)) {
                        // Unmark cartela in database and local state
                        unmarkCartelaByEmployeeMutation.mutate(cartela.cartelaNumber);
                        const newSelected = new Set(selectedCartelas);
                        newSelected.delete(cartela.cartelaNumber);
                        setSelectedCartelas(newSelected);
                      } else {
                        // Mark cartela in database and local state
                        markCartelaByEmployeeMutation.mutate(cartela.cartelaNumber);
                        const newSelected = new Set(selectedCartelas);
                        newSelected.add(cartela.cartelaNumber);
                        setSelectedCartelas(newSelected);
                      }
                    }
                  }}
                >
                  {cartela.cartelaNumber}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-5"
                  onClick={() => {
                    setPreviewCartela(cartela.cartelaNumber);
                    setShowCartelaPreview(true);
                  }}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center p-4 border-t">
            <span>Selected: {selectedCartelas.size} cartelas</span>
            <Button onClick={() => setShowCartelaSelector(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cartela Preview Dialog */}
      <Dialog open={showCartelaPreview} onOpenChange={setShowCartelaPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const cartela = (cartelas || []).find((c: any) => c.cartelaNumber === previewCartela);
                return cartela ? `${cartela.name} (#${previewCartela})` : `Cartela #${previewCartela} Preview`;
              })()}
            </DialogTitle>
            <DialogDescription>
              Real-time updated cartela pattern
            </DialogDescription>
          </DialogHeader>
          {previewCartela && (
            <div className="space-y-4">
              {/* BINGO Headers */}
              <div className="grid grid-cols-5 gap-1">
                {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                  return (
                    <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-sm`}>
                      {letter}
                    </div>
                  );
                })}
              </div>
              
              {/* Cartela Grid */}
              <div className="grid grid-cols-5 gap-1">
                {(() => {
                  const cartela = (cartelas || []).find((c: any) => c.cartelaNumber === previewCartela);
                  if (!cartela) return null;
                  
                  const grid = [];
                  for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                      const value = cartela.pattern[row][col];
                      
                      grid.push(
                        <div key={`${row}-${col}`} className="h-8 bg-gray-100 border rounded flex items-center justify-center text-sm font-medium">
                          {value === 0 ? "★" : value}
                        </div>
                      );
                    }
                  }
                  return grid;
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Winner Checker Dialog */}
      <Dialog open={showWinnerChecker} onOpenChange={setShowWinnerChecker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Winner</DialogTitle>
            <DialogDescription>
              Enter the cartela number to verify if it's a winner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cartelaNumber">Cartela Number</Label>
              <Input
                id="cartelaNumber"
                type="number"
                value={winnerCartelaNumber}
                onChange={(e) => setWinnerCartelaNumber(e.target.value)}
                placeholder="Enter cartela number"
                min="1"
              />
            </div>
            <Button onClick={checkWinner} className="w-full">
              Check Winner
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winner Result Dialog - Horizontal Layout */}
      <Dialog open={showWinnerResult} onOpenChange={setShowWinnerResult}>
        <DialogContent className={`max-w-4xl w-full ${winnerResult.isWinner ? "border-green-500" : "border-red-500"}`}>
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className={`text-xl ${winnerResult.isWinner ? "text-green-600" : "text-red-600"}`}>
              {winnerResult.isWinner ? "🎉 WINNER FOUND!" : "❌ NOT A WINNER"}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowWinnerResult(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              ✕
            </Button>
          </DialogHeader>
          
          {winnerResult.isWinner ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left side - Winner info and amount */}
              <div className="space-y-4 bg-green-50 p-6 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-xl font-bold text-green-600 mb-2">
                    Congratulations! This Cartela Has Won!
                  </div>
                  <div className="text-lg font-bold text-green-700 mb-2">
                    Cartela #{winnerResult.cartela}
                  </div>
                  <div className="text-md text-green-600 mb-4">
                    Winning Pattern: {winnerResult.pattern}
                  </div>
                </div>
                
                {/* Winner Amount Display */}
                <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-800 mb-2">💰 Winner Amount:</div>
                    <div className="text-2xl font-bold text-green-700">
                      {calculateAmounts().winnerAmount.toFixed(2)} Birr
                    </div>

                  </div>
                </div>
              </div>

              {/* Right side - Cartela grid */}
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-center mb-4">
                  <div className="text-md font-medium text-green-700 mb-2">Cartela Grid:</div>
                  <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
                    {/* Header */}
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">B</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">I</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">N</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">G</div>
                    <div className="text-center font-bold text-sm bg-green-100 p-2 rounded">O</div>
                    
                    {/* Cartela pattern */}
                    {(winnerResult.cartelaPattern || getFixedCartelaPattern(winnerResult.cartela)).flat().map((num, index) => {
                      const isWinningCell = winnerResult.winningCells?.includes(index);
                      const isCalled = num !== 0 && calledNumbers.includes(num);
                      const isFree = index === 12;
                      
                      return (
                        <div key={index} className={`text-center text-sm p-2 border-2 rounded ${
                          isWinningCell 
                            ? 'winner-cell-animation' 
                            : isFree
                              ? 'bg-yellow-200 border-yellow-300 font-medium' 
                              : isCalled
                                ? 'bg-green-200 border-green-400'
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                          {isFree ? 'FREE' : num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="space-y-4 bg-red-50 p-6 rounded-lg max-w-md mx-auto">
                <div className="text-4xl mb-4">❌</div>
                <div className="text-xl font-bold text-red-600">
                  This Cartela Did Not Win
                </div>
                <div className="text-lg font-bold text-red-700">
                  Cartela #{winnerResult.cartela}
                </div>
                <div className="text-md text-red-600">
                  {winnerResult.message}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-center gap-4">
            <Button 
              onClick={() => {
                setShowWinnerResult(false);
                setAudioPlaying(false); // Reset audio state
                // Reset and resume game immediately if not a winner
                if (!winnerResult.isWinner && gamePaused) {
                  setGamePaused(false);
                  // Resume calling numbers immediately
                  setTimeout(() => {
                    if (activeGameId && gameActive && !gameFinished) {
                      callNumberMutation.mutate();
                    }
                  }, 100); // Minimal delay to ensure state is updated
                }
              }}
              className={`px-8 py-2 ${winnerResult.isWinner ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"} text-white`}
            >
              {winnerResult.isWinner ? "Close & Complete Game" : "Continue Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="collectors" className="mt-0">
          <div className="p-6">
            <EmployeeCollectorManagement user={user as any} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}