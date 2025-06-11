import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IntegratedBingoGameProps {
  employeeName: string;
  employeeId: number;
  shopId: number;
  onLogout: () => void;
}

export default function IntegratedBingoGame({ employeeName, employeeId, shopId, onLogout }: IntegratedBingoGameProps) {
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [lastCalledLetter, setLastCalledLetter] = useState<string>("");
  const [showCartelaSelector, setShowCartelaSelector] = useState(false);
  const [selectedCartela, setSelectedCartela] = useState<number | null>(null);
  const [cartelaCards, setCartelaCards] = useState<{[key: number]: number[][]}>({});
  const [bookedCartelas, setBookedCartelas] = useState<Set<number>>(new Set());
  const [gameAmount, setGameAmount] = useState("30");
  const [winnerFound, setWinnerFound] = useState<string | null>(null);
  const [winnerPattern, setWinnerPattern] = useState<string | null>(null);
  const [showWinnerVerification, setShowWinnerVerification] = useState(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [verificationCartela, setVerificationCartela] = useState("");
  const [autoCallInterval, setAutoCallInterval] = useState<NodeJS.Timeout | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [totalCollected, setTotalCollected] = useState(0);
  const [finalPrizeAmount, setFinalPrizeAmount] = useState<number | null>(null);
  const [activeGameId, setActiveGameId] = useState<number | null>(null);
  const [gamePlayersMap, setGamePlayersMap] = useState<Map<number, number>>(new Map());
  const [autoplaySpeed, setAutoplaySpeed] = useState(3000); // 3 seconds default
  const [isCallingNumber, setIsCallingNumber] = useState(false); // Mutex to prevent overlapping calls
  
  // Refs to track real-time state for closures
  const gameActiveRef = useRef(false);
  const gamePausedRef = useRef(false);
  const gameFinishedRef = useRef(false);
  const winnerFoundRef = useRef(false);
  const automaticCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const calledNumbersRef = useRef<number[]>([]);
  const activeGameIdRef = useRef<number | null>(null);
  const isCallingNumberRef = useRef(false); // Ref for mutex
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch ALL shops and find the employee's shop for real-time profit margin
  const { data: allShops } = useQuery({
    queryKey: ["/api/shops"],
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  // Find the specific shop data for this employee
  const shopData = Array.isArray(allShops) ? allShops.find((shop: any) => shop.id === shopId) : null;

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async () => {
      console.log("🌐 Creating backend game with data:", {
        shopId,
        employeeId,
        status: 'waiting',
        entryFee: gameAmount,
        prizePool: "0.00"
      });
      const response = await apiRequest("POST", "/api/games", {
        shopId,
        employeeId,
        status: 'waiting',
        entryFee: gameAmount,
        prizePool: "0.00"
      });
      const game = await response.json();
      console.log("✅ Backend game created successfully:", game);
      return game;
    },
    onSuccess: (game: any) => {
      setActiveGameId(game.id);
      console.log("🎮 Set activeGameId to:", game.id);
    }
  });

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      return await apiRequest("POST", `/api/games/${gameId}/start`);
    },
    onSuccess: () => {
      console.log("Game started successfully");
    }
  });

  // Add player mutation
  const addPlayerMutation = useMutation({
    mutationFn: async (data: { gameId: number; cartelaNumbers: number[]; playerName: string }) => {
      console.log("🔍 Player mutation called with:", data);
      console.log("🔍 Current activeGameId state:", activeGameId);
      if (!data.gameId || data.gameId === undefined || isNaN(data.gameId)) {
        throw new Error(`Invalid gameId: ${data.gameId}`);
      }
      const response = await apiRequest("POST", `/api/games/${data.gameId}/players`, {
        playerName: data.playerName,
        cartelaNumbers: data.cartelaNumbers,
        entryFee: gameAmount
      });
      const player = await response.json();
      return player;
    },
    onSuccess: (player, variables) => {
      // Map ALL cartela numbers to this player ID, not just the first one
      setGamePlayersMap(prev => {
        const newMap = new Map(prev);
        variables.cartelaNumbers.forEach(cartelaNum => {
          newMap.set(cartelaNum, player.id);
          console.log(`Mapped cartela #${cartelaNum} to player ID ${player.id}`);
        });
        return newMap;
      });
      console.log("Player added:", player, "for cartelas:", variables.cartelaNumbers);
    }
  });

  // Update game prize pool mutation
  const updateGameMutation = useMutation({
    mutationFn: async (data: { gameId: number; prizePool: string }) => {
      return await apiRequest("PATCH", `/api/games/${data.gameId}`, {
        prizePool: data.prizePool
      });
    }
  });

  // End game without winner mutation
  const endGameWithoutWinnerMutation = useMutation({
    mutationFn: async (gameId: number) => {
      const response = await apiRequest("POST", `/api/games/${gameId}/end-without-winner`);
      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Game Ended",
        description: "Game ended without winner - no revenue recorded",
      });
      
      // Reset game state
      setActiveGameId(null);
      setGamePlayersMap(new Map());
      setBookedCartelas(new Set());
      setTotalCollected(0);
      setGameActive(false);
      setGameFinished(true);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to end game: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Declare winner mutation
  const declareWinnerMutation = useMutation({
    mutationFn: async (data: { gameId: number; winnerId: number; winnerCartela?: number }) => {
      const response = await apiRequest("POST", `/api/games/${data.gameId}/declare-winner`, {
        winnerId: data.winnerId,
        winnerCartela: data.winnerCartela
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Game Completed Successfully!",
        description: `Winner gets ${result.financial.prizeAmount} ETB. Admin profit: ${result.financial.adminProfit} ETB. Commission: ${result.financial.superAdminCommission} ETB deducted.`,
      });
      
      // End game properly - keep cartelas but mark as finished
      setGameActive(false);
      setGameFinished(true);
      setShowWinnerVerification(false);
      
      // Update refs to stop all processes
      gameActiveRef.current = false;
      gameFinishedRef.current = true;
      isCallingNumberRef.current = false;
      
      // Stop any automatic calling
      stopAutomaticNumberCalling();
      
      // Refresh admin dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shop-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/game-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit/balance"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Get letter for BINGO number
  const getLetterForNumber = (number: number): string => {
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
    return '';
  };

  // Alias for backward compatibility
  const getLetter = getLetterForNumber;

  // Generate a fixed cartela based on cartela number (1-100)
  const generateFixedCartela = (cartelaNumber: number) => {
    // Use cartela number as seed for consistent generation
    const seed = cartelaNumber;
    const seededRandom = (min: number, max: number, offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };

    const cartela: number[][] = [];
    const ranges = [
      [1, 15],   // B column
      [16, 30],  // I column
      [31, 45],  // N column  
      [46, 60],  // G column
      [61, 75]   // O column
    ];

    for (let col = 0; col < 5; col++) {
      const column: number[] = [];
      const [min, max] = ranges[col];
      const usedNumbers = new Set<number>();
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          column.push(0); // FREE space
        } else {
          let num;
          let attempts = 0;
          do {
            num = seededRandom(min, max, col * 5 + row + attempts * 25);
            attempts++;
          } while (usedNumbers.has(num) && attempts < 50);
          
          usedNumbers.add(num);
          column.push(num);
        }
      }
      cartela.push(column);
    }

    // Transpose to get row-major format
    const transposed: number[][] = [];
    for (let row = 0; row < 5; row++) {
      transposed.push([]);
      for (let col = 0; col < 5; col++) {
        transposed[row].push(cartela[col][row]);
      }
    }
    
    return transposed;
  };

  // Backward compatibility wrapper - generates random cartela
  const generateCartela = () => generateFixedCartela(Math.floor(Math.random() * 100) + 1);

  // Generate random cartela number
  const generateCartelaNumber = () => {
    let cartelaNum;
    do {
      cartelaNum = Math.floor(Math.random() * 100) + 1;
    } while (cartelaCards[cartelaNum] || bookedCartelas.has(cartelaNum));
    return cartelaNum;
  };

  // Show cartela selector with full grid
  const showCartelaSelectorDialog = () => {
    setShowCartelaSelector(true);
  };

  // Select a specific cartela number
  const selectCartela = (cartelaNumber: number) => {
    setSelectedCartela(cartelaNumber);
    setCartelaCards(prev => ({
      ...prev,
      [cartelaNumber]: generateCartela()
    }));
  };

  // Book a cartela for the game
  const bookCartela = async () => {
    if (selectedCartela !== null) {
      try {
        let gameId = activeGameId;
        
        // Create game if none exists
        if (!gameId) {
          console.log("🎮 Creating new backend game for cartela booking");
          const game = await createGameMutation.mutateAsync();
          gameId = game.id;
          setActiveGameId(game.id);
          console.log("✅ Backend game created with ID:", gameId);
        }
        
        // Add player to the game
        console.log(`📝 Adding player for cartela #${selectedCartela} to game ${gameId}`);
        const player = await addPlayerMutation.mutateAsync({
          gameId: gameId,
          cartelaNumbers: [selectedCartela],
          playerName: `Player ${selectedCartela}`
        });

        setBookedCartelas(prev => new Set([...Array.from(prev), selectedCartela]));
        const newTotal = totalCollected + parseInt(gameAmount);
        setTotalCollected(newTotal);
        
        console.log(`✅ Game ${gameId}: Added player ${player.id} with cartela ${selectedCartela} for ${gameAmount} ETB`);
        console.log("Current gamePlayersMap after booking:", Array.from(gamePlayersMap.entries()));
        
        setShowCartelaSelector(false);
        setSelectedCartela(null);
        
        toast({
          title: "Cartela Booked!",
          description: `Cartela #${selectedCartela} booked for ${gameAmount} ETB`,
        });
      } catch (error) {
        console.error("❌ Failed to book cartela:", error);
        toast({
          title: "Error",
          description: "Failed to book cartela",
          variant: "destructive",
        });
      }
    }
  };

  // Call a random number
  const callNumber = async () => {
    // MUTEX CHECK: Prevent overlapping calls
    if (isCallingNumberRef.current) {
      console.log("🚫 MUTEX: Already calling a number, skipping this call");
      return;
    }

    // IMMEDIATE CHECK: Stop all number calling if winner is found or game is finished
    if (gameFinished || winnerFound || gameFinishedRef.current || winnerFoundRef.current) {
      console.log("❌ IMMEDIATE STOP: Game is finished or winner found, aborting number calling");
      return;
    }

    // Set mutex lock
    isCallingNumberRef.current = true;
    setIsCallingNumber(true);

    console.log("🎯 callNumber invoked", {
      gameActive,
      gamePaused,
      gameFinished,
      calledNumbersLength: calledNumbers.length,
      activeGameId: activeGameId,
      winnerFound,
      refsState: {
        gameActiveRef: gameActiveRef.current,
        gamePausedRef: gamePausedRef.current,
        gameFinishedRef: gameFinishedRef.current,
        winnerFoundRef: winnerFoundRef.current
      }
    });

    // CRITICAL: Double-check to stop all number calling if winner is found or game is finished
    if (gameFinished || winnerFound || gameFinishedRef.current || winnerFoundRef.current) {
      console.log("❌ Game is finished or winner found, stopping number calling");
      // Release mutex before returning
      isCallingNumberRef.current = false;
      setIsCallingNumber(false);
      return;
    }

    // Use refs for real-time state checking
    if (!gameActiveRef.current || gamePausedRef.current) {
      console.log("❌ Game not active or paused, stopping number calling");
      // Release mutex before returning
      isCallingNumberRef.current = false;
      setIsCallingNumber(false);
      return;
    }

    // Ensure backend game exists before calling numbers
    if (!activeGameId) {
      console.log("🚨 NO BACKEND GAME EXISTS - Creating one now...");
      try {
        const game = await createGameMutation.mutateAsync();
        setActiveGameId(game.id);
        console.log("✅ Emergency backend game created:", game.id);
        
        // Create demo players for active cartelas
        const demoCartelas = Array.from(bookedCartelas);
        if (demoCartelas.length === 0) {
          // Generate demo cartelas if none exist
          for (let i = 0; i < 3; i++) {
            const cartelaNum = Math.floor(Math.random() * 100) + 1;
            demoCartelas.push(cartelaNum);
            setBookedCartelas(prev => new Set([...Array.from(prev), cartelaNum]));
            setCartelaCards(prev => ({
              ...prev,
              [cartelaNum]: generateCartela()
            }));
          }
        }
        
        // Create backend players for all cartelas
        const newGamePlayersMap = new Map();
        for (const cartelaNum of demoCartelas) {
          const player = await addPlayerMutation.mutateAsync({
            gameId: game.id,
            cartelaNumbers: [cartelaNum],
            playerName: `Player ${cartelaNum}`
          });
          newGamePlayersMap.set(cartelaNum, player.id);
          console.log(`Created emergency player ${player.id} for cartela ${cartelaNum}`);
        }
        setGamePlayersMap(newGamePlayersMap);
        
        setTotalCollected(demoCartelas.length * parseInt(gameAmount));
        console.log("✅ Emergency backend sync complete");
        
      } catch (error) {
        console.error("❌ Failed to create emergency backend game:", error);
        return;
      }
    }

    const availableNumbers = Array.from({length: 75}, (_, i) => i + 1)
      .filter(num => !calledNumbers.includes(num));
      
    console.log("📊 Available numbers:", availableNumbers.length, "out of 75");

    if (availableNumbers.length === 0) {
      console.log("🏁 No more numbers to call");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const number = availableNumbers[randomIndex];
    const letter = getLetterForNumber(number);
    
    console.log("🔊 Calling number:", number, "Letter:", letter);

    setCurrentNumber(number);
    setCalledNumbers(prev => {
      const updated = [...prev, number];
      calledNumbersRef.current = updated; // Keep ref in sync
      console.log(`📝 Updated called numbers count: ${updated.length}`);
      
      // Immediate winner check after number is added
      setTimeout(() => {
        if (!gameFinishedRef.current && !winnerFoundRef.current && gameActiveRef.current) {
          checkForWinner();
        }
      }, 50);
      
      return updated;
    });
    setLastCalledLetter(letter);

    // Play audio
    const audioFileName = `${letter}${number}.mp3`;
    console.log("🎵 Playing your custom audio:", audioFileName);
    
    try {
      const audio = new Audio(`/attached_assets/${audioFileName}`);
      audio.play().catch(err => {
        console.log("🔇 Could not play audio:", err.message);
        // Try fallback audio or continue silently
      });
    } catch (error) {
      console.log("🔇 Audio playback failed:", error);
    }

    console.log("📝 Updated called numbers count:", calledNumbers.length + 1);

    // Removed automatic winner checking - only manual verification allowed
    
    // Release mutex lock
    isCallingNumberRef.current = false;
    setIsCallingNumber(false);
  };

  // Automatic winner detection completely disabled - manual verification only
  const checkForWinner = () => {
    console.log("🚫 Automatic winner detection disabled - only manual verification allowed");
    return;
  };

  // Check for Bingo winning patterns
  const checkForBingo = (card: number[][], calledNums: number[]): { hasWin: boolean; pattern?: string; patternCells?: number[][] } => {
    const isMarked = (row: number, col: number) => {
      if (row === 2 && col === 2) return true; // Center is free space
      return calledNums.includes(card[row][col]);
    };

    // Check horizontal lines
    for (let row = 0; row < 5; row++) {
      if (card[row].every((_, col) => isMarked(row, col))) {
        return { hasWin: true, pattern: `Row ${row + 1}` };
      }
    }

    // Check vertical lines
    for (let col = 0; col < 5; col++) {
      if (card.every((_, row) => isMarked(row, col))) {
        return { hasWin: true, pattern: `Column ${col + 1}` };
      }
    }

    // Check diagonal (top-left to bottom-right)
    if (card.every((_, i) => isMarked(i, i))) {
      return { hasWin: true, pattern: "Diagonal \\" };
    }

    // Check diagonal (top-right to bottom-left)
    if (card.every((_, i) => isMarked(i, 4 - i))) {
      return { hasWin: true, pattern: "Diagonal /" };
    }

    // Check four corners
    if (isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4)) {
      return { hasWin: true, pattern: "Four Corners" };
    }

    return { hasWin: false };
  };

  // Automatically declare winner in backend
  const declareWinnerAutomatically = async (cartelaNumber: number) => {
    console.log("🎯 AUTO-DECLARE WINNER START:", { 
      cartelaNumber, 
      activeGameId, 
      gamePlayersMapSize: gamePlayersMap.size,
      gamePlayersMap: Array.from(gamePlayersMap.entries())
    });
    
    if (!activeGameId) {
      console.error("❌ Cannot declare winner - no active game");
      toast({
        title: "Recording Error",
        description: "No active game found to record winner",
        variant: "destructive"
      });
      return;
    }
    
    let winnerId = gamePlayersMap.get(cartelaNumber);
    
    // If player ID not found, try to create the player record first
    if (!winnerId) {
      console.log("🔧 Winner ID not found, attempting to create player record for cartela", cartelaNumber);
      
      try {
        const player = await addPlayerMutation.mutateAsync({
          gameId: activeGameId,
          cartelaNumbers: [cartelaNumber],
          playerName: `Player ${cartelaNumber}`
        });
        
        winnerId = player.id;
        setGamePlayersMap(prev => {
          const newMap = new Map(prev);
          newMap.set(cartelaNumber, winnerId);
          return newMap;
        });
        
        console.log("✅ Created player record for winner:", { cartelaNumber, winnerId });
      } catch (playerError) {
        console.error("❌ Failed to create player record:", playerError);
        toast({
          title: "Recording Error", 
          description: `Failed to create player record for cartela #${cartelaNumber}`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Prepare comprehensive game data for recording
      const gameData = {
        gameId: activeGameId,
        winnerId: winnerId,
        winnerCartela: cartelaNumber,
        totalCollected: totalCollected,
        playerCount: bookedCartelas.size,
        calledNumbers: calledNumbers,
        allPlayers: Array.from(bookedCartelas).map(cartela => ({
          cartelaNumber: cartela,
          playerId: gamePlayersMap.get(cartela),
          playerName: `Player ${cartela}`,
          amount: parseInt(gameAmount)
        })),
        employeeId: employeeId,
        shopId: shopId,
        winnerPattern: winnerPattern
      };
      
      console.log("🚀 DECLARING WINNER WITH COMPLETE DATA:", gameData);
      
      const result = await declareWinnerMutation.mutateAsync({
        gameId: activeGameId,
        winnerId: winnerId,
        winnerCartela: cartelaNumber
      });
      
      console.log("✅ WINNER SUCCESSFULLY DECLARED IN BACKEND!", result);
      
      // Log comprehensive game completion details
      console.log("📊 GAME COMPLETION SUMMARY:", {
        winnerCartela: cartelaNumber,
        totalCollected: totalCollected,
        playerCount: bookedCartelas.size,
        prizeAmount: result.financial?.prizeAmount,
        adminProfit: result.financial?.adminProfit,
        superAdminCommission: result.financial?.superAdminCommission,
        employeeId: employeeId,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Game Completed Successfully!",
        description: `Cartela #${cartelaNumber} wins ${result.financial?.prizeAmount || totalCollected} ETB! Game recorded with all player details.`,
      });
      
    } catch (error) {
      console.error("❌ FAILED TO DECLARE WINNER AUTOMATICALLY:", error);
      console.error("Error details:", error.message, error.stack);
      toast({
        title: "Recording Error",
        description: `Game completed but failed to record in database: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Verify and declare winner
  const verifyWinner = async () => {
    if (!winnerFound || !activeGameId) {
      console.error("Cannot declare winner - missing data:", { winnerFound, activeGameId });
      toast({
        title: "Error",
        description: "Cannot declare winner - missing game or winner data",
        variant: "destructive"
      });
      return;
    }
    
    const cartelaNumber = parseInt(winnerFound.replace('Cartela #', ''));
    const winnerId = gamePlayersMap.get(cartelaNumber);
    
    console.log("Declaring winner:", { 
      cartelaNumber, 
      winnerId, 
      activeGameId, 
      gamePlayersMap: Array.from(gamePlayersMap.entries()) 
    });
    
    if (!winnerId) {
      console.error("Winner ID not found in gamePlayersMap:", { cartelaNumber, gamePlayersMap });
      toast({
        title: "Error",
        description: "Winner player not found in game records",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Calling declare winner API for game", activeGameId, "winner", winnerId);
      await declareWinnerMutation.mutateAsync({
        gameId: activeGameId,
        winnerId: winnerId,
        winnerCartela: cartelaNumber
      });
      
      setShowWinnerVerification(false);
      setWinnerFound(null);
    } catch (error) {
      console.error("Failed to declare winner:", error);
      toast({
        title: "Error",
        description: `Failed to complete game: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Start automatic number calling with proper timeout handling
  const startAutomaticNumberCalling = () => {
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
    }
    
    // Clear any existing timeout
    if (automaticCallTimeoutRef.current) {
      clearTimeout(automaticCallTimeoutRef.current);
      automaticCallTimeoutRef.current = null;
    }
    
    const scheduleNextCall = () => {
      // Check both state and refs for maximum safety
      if (gameFinishedRef.current || winnerFoundRef.current || !gameActiveRef.current) {
        console.log("🛑 Stopping scheduled call due to game state - refs check");
        return;
      }
      
      automaticCallTimeoutRef.current = setTimeout(() => {
        // Double check before calling
        if (gameFinishedRef.current || winnerFoundRef.current || !gameActiveRef.current) {
          console.log("🛑 Aborting scheduled call due to game state - timeout check");
          return;
        }
        
        console.log("⏰ Automatic timeout triggered - calling number");
        callNumber();
        
        // Only schedule next call if game is still active
        if (gameActiveRef.current && !gameFinishedRef.current && !winnerFoundRef.current) {
          scheduleNextCall();
        }
      }, autoplaySpeed);
    };
    
    console.log("🚀 Starting automatic calling system");
    scheduleNextCall();
  };

  const stopAutomaticNumberCalling = () => {
    console.log("🛑 Stopping automatic calling");
    if (autoCallInterval) {
      clearInterval(autoCallInterval);
      setAutoCallInterval(null);
      console.log("✅ Interval cleared");
    }
    
    // Also clear timeout reference
    if (automaticCallTimeoutRef.current) {
      clearTimeout(automaticCallTimeoutRef.current);
      automaticCallTimeoutRef.current = null;
      console.log("✅ Timeout cleared");
    }
  };

  // Complete reset game - clears everything including cartelas
  const resetGame = async () => {
    console.log("🔄 Complete game reset");
    
    // If there's an active game and no winner was found, end it without recording revenue
    if (activeGameId && !winnerFound) {
      console.log("🎯 Ending game without winner - no revenue will be recorded");
      try {
        await endGameWithoutWinnerMutation.mutateAsync(activeGameId);
      } catch (error) {
        console.error("Failed to end game without winner:", error);
        toast({
          title: "Warning",
          description: "Failed to properly end game in backend",
          variant: "destructive"
        });
      }
    }
    
    // Reset frontend state completely
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setGameFinished(false);
    setGamePaused(false);
    setWinnerFound(null);
    setWinnerPattern(null);
    setLastCalledLetter("");
    setActiveGameId(null);
    setGamePlayersMap(new Map());
    setBookedCartelas(new Set());
    setTotalCollected(0);
    setFinalPrizeAmount(null);
    
    // Update refs
    gameActiveRef.current = false;
    gamePausedRef.current = false;
    gameFinishedRef.current = false;
    winnerFoundRef.current = false;
    calledNumbersRef.current = [];
    activeGameIdRef.current = null;
    isCallingNumberRef.current = false; // Reset mutex
    
    setIsCallingNumber(false); // Reset mutex state
    stopAutomaticNumberCalling();
  };

  // Restart game - preserves cartela selections for new game and starts immediately
  const restartGame = async () => {
    console.log("🔄 Restarting game with same cartelas and starting immediately");
    
    // If there's an active game and no winner was found, end it without recording revenue
    if (activeGameId && !winnerFound) {
      console.log("🎯 Ending game without winner - no revenue will be recorded");
      try {
        await endGameWithoutWinnerMutation.mutateAsync(activeGameId);
      } catch (error) {
        console.error("Failed to end game without winner:", error);
        toast({
          title: "Warning",
          description: "Failed to properly end game in backend",
          variant: "destructive"
        });
      }
    }
    
    // Reset game state but preserve cartela selections
    setCalledNumbers([]);
    setCurrentNumber(null);
    setGameActive(false);
    setGameFinished(false);
    setGamePaused(false);
    setWinnerFound(null);
    setWinnerPattern(null);
    setLastCalledLetter("");
    setActiveGameId(null);
    setGamePlayersMap(new Map());
    // Keep bookedCartelas and totalCollected for restart
    setShowWinnerVerification(false);
    setFinalPrizeAmount(null);
    
    // Update refs
    gameActiveRef.current = false;
    gamePausedRef.current = false;
    gameFinishedRef.current = false;
    winnerFoundRef.current = false;
    calledNumbersRef.current = [];
    activeGameIdRef.current = null;
    isCallingNumberRef.current = false; // Reset mutex
    
    setIsCallingNumber(false); // Reset mutex state
    stopAutomaticNumberCalling();
    
    console.log("🔄 Game reset complete, starting new game with preserved cartelas");
    
    // Immediately start a new game with the preserved cartelas
    setTimeout(() => {
      startGame();
    }, 100);
  };

  // Start game - support both pre-booked games and quick play mode
  const startGame = async () => {
    console.log("🔥 START GAME FUNCTION CALLED! This message should appear in browser console.");
    console.log("🎮 FORCING BACKEND GAME CREATION - current state:", { 
      bookedCartelasSize: bookedCartelas.size, 
      activeGameId, 
      gameAmount,
      shopData: shopData?.id 
    });

    // FORCE backend game creation regardless of current state
    console.log("🔄 FORCING comprehensive backend game creation...");
    
    try {
      // Create backend game first
      const game = await createGameMutation.mutateAsync();
      console.log("✅ FORCED backend game created with ID:", game.id);
      
      // CRITICAL: Set activeGameId immediately after game creation
      setActiveGameId(game.id);
      console.log("🎮 Set activeGameId to:", game.id);
      
      // Use your actual selected cartelas
      const cartelaArray = Array.from(bookedCartelas);
      console.log("📝 Using your selected cartelas:", cartelaArray);
      
      // If no cartelas selected, show warning but allow restart to proceed (for restart scenario)
      if (cartelaArray.length === 0) {
        console.log("⚠️ No cartelas found - this might be a restart scenario");
        // For restart, we'll generate some demo cartelas to allow the game to proceed
        const demoCartelas = [1, 2, 3]; // Default cartelas for restart
        for (const cartelaNum of demoCartelas) {
          setBookedCartelas(prev => new Set([...Array.from(prev), cartelaNum]));
          setCartelaCards(prev => ({
            ...prev,
            [cartelaNum]: generateCartela()
          }));
        }
        setTotalCollected(demoCartelas.length * parseInt(gameAmount));
        console.log("🔄 Generated demo cartelas for restart:", demoCartelas);
        // Update cartelaArray for the rest of the function
        cartelaArray.push(...demoCartelas);
      }
      
      console.log("Selected cartelas for game:", cartelaArray);
      
      // Create backend player records for all cartelas
      console.log("📝 Creating comprehensive backend players...");
      const newGamePlayersMap = new Map();
      
      for (const cartelaNum of cartelaArray) {
        const player = await addPlayerMutation.mutateAsync({
          gameId: game.id,
          cartelaNumbers: [cartelaNum],
          playerName: `Player ${cartelaNum}`
        });
        newGamePlayersMap.set(cartelaNum, player.id);
        console.log(`✅ Created backend player ${player.id} for cartela #${cartelaNum}`);
      }
      
      setGamePlayersMap(newGamePlayersMap);
      
      // Update total collected
      const newTotal = cartelaArray.length * parseInt(gameAmount);
      setTotalCollected(newTotal);
      
      toast({
        title: "Backend Game Created!",
        description: `Game ${game.id} with ${cartelaArray.length} players (${newTotal} ETB)`,
      });
      
    } catch (error) {
      console.error("❌ Failed to create backend records:", error);
      toast({
        title: "Critical Error",
        description: "Backend game creation failed. No recording will occur.",
        variant: "destructive"
      });
      return;
    }

    // Verify backend game was created and activeGameId is set
    if (!activeGameId) {
      console.error("Critical error: No backend game exists after comprehensive setup");
      toast({
        title: "Error",
        description: "Failed to create backend game record",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Starting game with ID:", activeGameId);
      await startGameMutation.mutateAsync(activeGameId);
      
      setGameActive(true);
      setGameFinished(false);
      setGamePaused(false);
      setCalledNumbers([]);
      setCurrentNumber(null);
      setWinnerFound(null);
      setLastCalledLetter("");
      
      // Update refs for real-time state tracking
      gameActiveRef.current = true;
      gamePausedRef.current = false;
      gameFinishedRef.current = false;
      winnerFoundRef.current = false;
      calledNumbersRef.current = [];
      activeGameIdRef.current = activeGameId;
      
      console.log("Game started successfully, beginning number calling...");
      console.log("Final gamePlayersMap before starting:", Array.from(gamePlayersMap.entries()));
      
      // Start the game immediately - no delay
      console.log("🎯 Starting game immediately with automatic calling");
      
      // Call first number to start the game
      setTimeout(() => {
        callNumber();
        // Start the automatic calling system
        startAutomaticNumberCalling();
      }, 100);
    } catch (error) {
      console.error("Failed to start game:", error);
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive"
      });
    }
  };

  // Calculate winner payout based on profit margin
  const calculateWinnerPayout = (collectedAmount: number): number => {
    if (!shopData?.profitMargin) return collectedAmount;
    
    const margin = parseFloat(shopData.profitMargin) || 0;
    const adminProfit = (collectedAmount * margin) / 100;
    return collectedAmount - adminProfit;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCallInterval) {
        clearInterval(autoCallInterval);
      }
    };
  }, [autoCallInterval]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
          <p className="text-gray-600">Welcome, {employeeName}</p>
        </div>
        <Button onClick={onLogout} variant="outline">
          Logout
        </Button>
      </div>

      {/* Winner Verification Dialog */}
      <Dialog open={showWinnerVerification} onOpenChange={setShowWinnerVerification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 BINGO! Winner Found!</DialogTitle>
            <DialogDescription>
              {winnerFound} claims {winnerPattern}!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                Prize: {calculateWinnerPayout(totalCollected).toFixed(2)} ETB
              </p>
              <p className="text-sm text-gray-600">
                (From {totalCollected} ETB total collected)
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyWinner} className="flex-1 bg-green-500 hover:bg-green-600">
                Verify & Pay Winner
              </Button>
              <Button 
                onClick={() => {
                  setShowWinnerVerification(false);
                  setWinnerFound(null);
                  setGameActive(true);
                  startAutomaticNumberCalling();
                }} 
                variant="outline" 
                className="flex-1"
              >
                Continue Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Winner Checking Dialog */}
      <Dialog open={showWinnerDialog} onOpenChange={setShowWinnerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Winner</DialogTitle>
            <DialogDescription>
              Enter the cartela number to verify if it has won with the current called numbers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cartela Number (1-100)
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={verificationCartela}
                onChange={(e) => setVerificationCartela(e.target.value)}
                placeholder="Enter cartela number"
                className="w-full"
              />
            </div>

            {/* Show available cartelas */}
            {bookedCartelas.size > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Available cartelas in this game:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(bookedCartelas).map(num => (
                    <Button
                      key={num}
                      variant="outline"
                      size="sm"
                      onClick={() => setVerificationCartela(num.toString())}
                      className="text-xs"
                    >
                      #{num}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const cartelaNum = parseInt(verificationCartela);
                  if (cartelaNum >= 1 && cartelaNum <= 100) {
                    const card = cartelaCards[cartelaNum];
                    if (card) {
                      const result = checkForBingo(card, calledNumbers);
                      if (result.hasWin) {
                        setWinnerFound(`Cartela #${cartelaNum}`);
                        setWinnerPattern(result.pattern || "Bingo");
                        setShowWinnerDialog(false);
                        setGameActive(false);
                        setGameFinished(true);
                        stopAutomaticNumberCalling();
                        declareWinnerAutomatically(cartelaNum);
                      } else {
                        // No winner - resume game immediately
                        toast({
                          title: "No Bingo",
                          description: `Cartela #${cartelaNum} has not won yet. Game resumed.`,
                        });
                        setShowWinnerDialog(false);
                        
                        // Resume game
                        setGamePaused(false);
                        gamePausedRef.current = false;
                        
                        // Restart automatic calling after a brief delay
                        setTimeout(() => {
                          if (gameActiveRef.current && !gamePausedRef.current) {
                            callNumber();
                            startAutomaticNumberCalling();
                          }
                        }, 1000);
                      }
                    } else {
                      toast({
                        title: "Invalid Cartela",
                        description: "This cartela is not registered in the game.",
                        variant: "destructive"
                      });
                    }
                  }
                }}
                disabled={!verificationCartela || parseInt(verificationCartela) < 1 || parseInt(verificationCartela) > 100}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                Check Winner
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowWinnerDialog(false);
                  setVerificationCartela("");
                  
                  // Resume game if it was paused
                  if (gameActive && gamePaused) {
                    setGamePaused(false);
                    gamePausedRef.current = false;
                    
                    setTimeout(() => {
                      if (gameActiveRef.current && !gamePausedRef.current) {
                        callNumber();
                        startAutomaticNumberCalling();
                      }
                    }, 1000);
                  }
                }}
                className="flex-1"
              >
                Cancel & Resume
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Game Settings */}
        <div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-lg mb-4">Game Settings</h3>
            
            {/* Current Number Display at Top */}
            {(gameActive || gameFinished) && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center mb-4">
                <div className="text-sm text-blue-600 font-medium mb-2">Current Number</div>
                <div className="text-4xl font-bold text-blue-800">
                  {currentNumber ? `${getLetterForNumber(currentNumber)}${currentNumber}` : '---'}
                </div>
                {gameActive && !gamePaused && (
                  <div className="text-xs text-blue-500 mt-2">Auto-calling every {autoplaySpeed / 1000} seconds</div>
                )}
                {gamePaused && (
                  <div className="text-xs text-red-500 mt-2">Game Paused</div>
                )}
              </div>
            )}
            
            {/* Game Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Game Amount (Birr)
              </label>
              <Input
                type="number"
                value={gameAmount}
                onChange={(e) => setGameAmount(e.target.value)}
                disabled={gameActive || bookedCartelas.size > 0}
                className="w-full text-center"
              />
              <p className="text-sm text-gray-600 mt-1">Current: {gameAmount} Birr per card</p>
            </div>

            {/* Autoplay Speed Control */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Autoplay Speed (seconds)
              </label>
              <select
                value={autoplaySpeed / 1000}
                onChange={(e) => setAutoplaySpeed(parseInt(e.target.value) * 1000)}
                className="w-full p-2 border border-gray-300 rounded"
                disabled={gameActive}
              >
                <option value="1">1 second</option>
                <option value="2">2 seconds</option>
                <option value="3">3 seconds</option>
                <option value="4">4 seconds</option>
                <option value="5">5 seconds</option>
              </select>
            </div>

            {/* Selected Cartelas */}
            {bookedCartelas.size > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Selected Cartelas ({bookedCartelas.size})</h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(bookedCartelas).map((num: number) => (
                    <span key={num} className="inline-block bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                      #{num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Total Collected & Win Amount */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-blue-900">Total Collected</h3>
              <p className="text-2xl font-bold text-blue-600">{totalCollected.toFixed(2)} Birr</p>
              <p className="text-sm text-blue-700">{bookedCartelas.size} cards × {gameAmount} Birr</p>
              
              {/* Profit Margin Based Win Amount */}
              {totalCollected > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h4 className="font-medium text-yellow-800">Possible Win Amount</h4>
                  <p className="text-xl font-bold text-yellow-700">
                    {(() => {
                      const profitMargin = (shopData as any)?.profitMargin || 20;
                      const winAmount = Math.floor(totalCollected * (100 - profitMargin) / 100);
                      return `${winAmount} ETB`;
                    })()}
                  </p>

                </div>
              )}
            </div>

            {/* Winner Announcement */}
            {winnerFound && (
              <div className="bg-green-100 border-2 border-green-300 p-4 rounded-lg text-center mb-4">
                <div className="text-2xl mb-2">🎉 BINGO! 🎉</div>
                <div className="font-bold text-green-800">{winnerFound} WINS!</div>
                <div className="text-green-700">Prize: {(finalPrizeAmount ?? calculateWinnerPayout(totalCollected)).toFixed(2)} Birr</div>
              </div>
            )}

            {/* Start Game Button */}
            <Button 
              onClick={() => {
                console.log("🚀 Start Game button clicked");
                startGame();
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 mb-4"
              disabled={gameActive || startGameMutation.isPending}
            >
              {startGameMutation.isPending ? "Starting..." : gameActive ? "Game Running..." : "Start Game"}
            </Button>

            {/* Quick Test Auto Calling */}
            {!gameActive && (
              <Button 
                onClick={() => {
                  console.log("🧪 Quick test auto calling");
                  setGameActive(true);
                  gameActiveRef.current = true;
                  gamePausedRef.current = false;
                  gameFinishedRef.current = false;
                  setCalledNumbers([]);
                  setCurrentNumber(null);
                  
                  setTimeout(() => {
                    console.log("Starting auto calling test");
                    callNumber();
                    startAutomaticNumberCalling();
                  }, 500);
                }}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 mb-4"
              >
                Test Auto Calling
              </Button>
            )}

            {/* Cartela Selector */}
            <Dialog open={showCartelaSelector} onOpenChange={setShowCartelaSelector}>
              <DialogTrigger asChild>
                <Button 
                  onClick={showCartelaSelectorDialog}
                  className="w-full bg-blue-500 hover:bg-blue-600 mb-2"
                  disabled={gameActive}
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
                  
                  {/* Cartela Number Grid - One Click Book/Unbook */}
                  <div className="grid grid-cols-10 gap-2 p-4">
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(num => {
                      const isBooked = bookedCartelas.has(num);
                      
                      return (
                        <Button
                          key={num}
                          variant={isBooked ? "default" : "outline"}
                          className={`h-12 w-12 ${
                            isBooked 
                              ? "bg-green-500 text-white hover:bg-red-500" 
                              : "hover:bg-blue-500 hover:text-white"
                          }`}
                          onClick={async () => {
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
                              
                              toast({
                                title: "Unbooked",
                                description: `Cartela #${num} removed from selection`,
                              });
                            } else {
                              // Book cartela instantly with fixed card based on cartela number
                              const newCard = generateFixedCartela(num);
                              setCartelaCards(prev => ({
                                ...prev,
                                [num]: newCard
                              }));
                              setBookedCartelas(prev => new Set([...Array.from(prev), num]));
                              setTotalCollected(prev => prev + parseInt(gameAmount));
                              
                              toast({
                                title: "Booked",
                                description: `Cartela #${num} added to selection`,
                              });
                            }
                          }}
                        >
                          {num}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Preview any booked cartela */}
                  {bookedCartelas.size > 0 && (
                    <div className="mt-6 p-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 text-center">
                        Selected Cartelas Preview
                      </h3>
                      <div className="grid gap-4 max-h-96 overflow-y-auto">
                        {Array.from(bookedCartelas).map((cartelaNum: number) => {
                          // Ensure card is stored and use fixed generation
                          if (!cartelaCards[cartelaNum]) {
                            const fixedCard = generateFixedCartela(cartelaNum);
                            setCartelaCards(prev => ({
                              ...prev,
                              [cartelaNum]: fixedCard
                            }));
                          }
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
                      </div>
                    </div>
                  )}
                  
                  {/* Old preview for backward compatibility */}
                  {selectedCartela && cartelaCards[selectedCartela] && bookedCartelas.size === 0 && (
                    <div className="mt-6 p-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 text-center">
                        Cartela #{selectedCartela} - Bingo Card Preview
                      </h3>
                      <div className="max-w-sm mx-auto">
                        {/* BINGO Headers */}
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          {['B', 'I', 'N', 'G', 'O'].map((letter, index) => {
                            const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                            return (
                              <div key={letter} className={`h-8 ${colors[index]} text-white rounded flex items-center justify-center font-bold text-lg`}>
                                {letter}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Numbers Grid */}
                        <div className="grid grid-cols-5 gap-1">
                          {cartelaCards[selectedCartela].flat().map((num, index) => (
                            <div
                              key={index}
                              className={`h-8 border border-gray-400 flex items-center justify-center text-sm font-medium ${
                                num === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-white'
                              }`}
                            >
                              {num === 0 ? 'FREE' : num}
                            </div>
                          ))}
                        </div>
                        
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
                </DialogContent>
              </Dialog>

              {/* Additional Control Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={resetGame}
                  variant="outline"
                  className="w-full"
                >
                  Reset Game
                </Button>

                <Button 
                  onClick={restartGame}
                  variant="outline"
                  className="w-full"
                >
                  Restart Game
                </Button>

                {gameActive && (
                  <Button 
                    onClick={() => {
                      if (gamePaused) {
                        // Resume game
                        setGamePaused(false);
                        gamePausedRef.current = false;
                        startAutomaticNumberCalling();
                        toast({
                          title: "Game Resumed",
                          description: "Automatic number calling resumed",
                        });
                      } else {
                        // Pause game
                        setGamePaused(true);
                        gamePausedRef.current = true;
                        stopAutomaticNumberCalling();
                        toast({
                          title: "Game Paused",
                          description: "Automatic number calling paused",
                        });
                      }
                    }}
                    className={`w-full ${gamePaused ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                  >
                    {gamePaused ? 'Resume Game' : 'Pause Game'}
                  </Button>
                )}
              </div>

              {/* Check Bingo Button - Only show during active game */}
              {gameActive && (
                <Button 
                  onClick={() => {
                    // Pause game immediately
                    setGamePaused(true);
                    gamePausedRef.current = true;
                    stopAutomaticNumberCalling();
                    setShowWinnerDialog(true);
                  }}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 mt-4"
                >
                  Check Bingo
                </Button>
              )}
          </div>
        </div>

        {/* Middle Section - Current Number Display */}
        <div className="flex-1 flex justify-center items-center p-4">
          <div className="text-center space-y-6">
            {/* Current Number Display */}
            {currentNumber && (
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  <div className="w-20 h-20 bg-red-500 text-white rounded-lg flex items-center justify-center font-bold text-2xl">
                    {lastCalledLetter}
                  </div>
                  <div className="w-20 h-20 bg-gray-700 text-white rounded-lg flex items-center justify-center font-bold text-2xl">
                    {currentNumber}
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-700">
                  {lastCalledLetter}-{currentNumber}
                </div>
              </div>
            )}

            {/* Main Game Button */}
            <div className="space-y-4">
              <div className="w-40 h-40 rounded-full bg-blue-500 text-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
                   onClick={() => {
                     if (gameActive && !gamePaused) {
                       callNumber();
                     }
                   }}>
                <div className="text-lg font-bold">Let's Play</div>
                <div className="text-2xl font-bold">BINGO!</div>
              </div>
              

            </div>
          </div>
        </div>

        {/* Right Panel - Called Numbers Board */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Called Numbers</span>
                {currentNumber && (
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-green-100 text-green-800">
                    {lastCalledLetter}{currentNumber}
                  </Badge>
                )}
              </CardTitle>
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
                {Array.from({length: 5}, (_, colIndex) => {
                  const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
                  const [start, end] = ranges[colIndex];
                  return Array.from({length: end - start + 1}, (_, rowIndex) => start + rowIndex);
                }).map((column, colIndex) => (
                  <div key={colIndex} className="space-y-1">
                    {column.map(number => (
                      <div
                        key={number}
                        className={`h-8 w-full rounded flex items-center justify-center text-sm font-medium border transition-all ${
                          calledNumbers.includes(number)
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 border-gray-300 text-gray-700'
                        } ${
                          currentNumber === number ? 'ring-2 ring-yellow-400 bg-yellow-200 text-yellow-800' : ''
                        }`}
                      >
                        {number}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center text-sm text-gray-600">
                {calledNumbers.length} / 75 numbers called
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}