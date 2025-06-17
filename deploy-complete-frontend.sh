#!/bin/bash

# Complete Bingo Game Frontend Deployment
SERVER_IP="91.99.161.246"
USER="root"

echo "Deploying complete Bingo game frontend to $SERVER_IP..."

# Create all frontend files on server
ssh -o StrictHostKeyChecking=no $USER@$SERVER_IP << 'ENDSSH'
cd /var/www/bingo-app

# Create complete frontend structure
mkdir -p client/src/components/ui client/src/pages client/src/lib client/src/hooks

# Create main index.html
cat > client/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bingo Management System</title>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

# Create main App component with complete routing
cat > client/src/App.tsx << 'EOF'
import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import GamePlay from "@/pages/GamePlay";
import ProtectedRoute from "@/components/ProtectedRoute";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/game/:gameId">
                {(params) => (
                  <ProtectedRoute>
                    <GamePlay gameId={params.gameId} />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/admin">
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/employee">
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/">
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              </Route>
            </Switch>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
EOF

# Create main entry point
cat > client/src/main.tsx << 'EOF'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

# Create authentication context
cat > client/src/lib/auth.tsx << 'EOF'
import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  role: string;
  name?: string;
  shopId?: number;
  creditBalance?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      setUser(null);
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  useEffect(() => {
    if (authData?.user) {
      setUser(authData.user);
    }
  }, [authData]);

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
EOF

# Create complete game play component
cat > client/src/pages/GamePlay.tsx << 'EOF'
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface GamePlayProps {
  gameId: string;
}

interface BingoCard {
  id: number;
  numbers: number[][];
  markedNumbers: boolean[][];
}

interface Game {
  id: number;
  status: string;
  playerCount: number;
  prizeAmount: string;
  calledNumbers: string;
  currentNumber?: number;
  winningCartela?: string;
}

export default function GamePlay({ gameId }: GamePlayProps) {
  const [bingoCards, setBingoCards] = useState<BingoCard[]>([]);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch game data
  const { data: game, isLoading } = useQuery<Game>({
    queryKey: [`/api/games/${gameId}`],
    refetchInterval: 2000,
  });

  // Generate bingo cards
  const generateBingoCard = (cardId: number): BingoCard => {
    const numbers: number[][] = [];
    const ranges = [
      [1, 15],   // B
      [16, 30],  // I
      [31, 45],  // N
      [46, 60],  // G
      [61, 75],  // O
    ];

    for (let col = 0; col < 5; col++) {
      const columnNumbers: number[] = [];
      const [min, max] = ranges[col];
      const availableNumbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          columnNumbers.push(0); // Free space
        } else {
          const randomIndex = Math.floor(Math.random() * availableNumbers.length);
          columnNumbers.push(availableNumbers.splice(randomIndex, 1)[0]);
        }
      }
      numbers.push(columnNumbers);
    }

    // Transpose to get proper row-column format
    const transposedNumbers: number[][] = [];
    for (let row = 0; row < 5; row++) {
      transposedNumbers.push(numbers.map(col => col[row]));
    }

    return {
      id: cardId,
      numbers: transposedNumbers,
      markedNumbers: Array(5).fill(null).map(() => Array(5).fill(false))
    };
  };

  // Initialize bingo cards
  useEffect(() => {
    if (game && bingoCards.length === 0) {
      const cards = Array.from({ length: 4 }, (_, i) => generateBingoCard(i + 1));
      setBingoCards(cards);
    }
  }, [game, bingoCards.length]);

  // Parse called numbers from game data
  useEffect(() => {
    if (game?.calledNumbers) {
      try {
        const numbers = JSON.parse(game.calledNumbers);
        setCalledNumbers(numbers);
      } catch (e) {
        setCalledNumbers([]);
      }
    }
    if (game?.currentNumber) {
      setCurrentNumber(game.currentNumber);
    }
  }, [game]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const websocket = new WebSocket(`ws://${window.location.hostname}:8080`);
    
    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "number_called" && data.gameId === parseInt(gameId)) {
          setCurrentNumber(data.number);
          setCalledNumbers(prev => [...prev, data.number]);
          queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}`] });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return () => {
      websocket.close();
    };
  }, [gameId, queryClient]);

  // Mark number on bingo card
  const markNumber = (cardIndex: number, row: number, col: number) => {
    const card = bingoCards[cardIndex];
    const number = card.numbers[row][col];
    
    if (number === 0 || calledNumbers.includes(number)) {
      setBingoCards(prev => {
        const newCards = [...prev];
        newCards[cardIndex] = {
          ...newCards[cardIndex],
          markedNumbers: newCards[cardIndex].markedNumbers.map((r, rIndex) =>
            rIndex === row
              ? r.map((c, cIndex) => (cIndex === col ? true : c))
              : r
          )
        };
        return newCards;
      });
    }
  };

  // Check for bingo win
  const checkBingo = (markedNumbers: boolean[][]): boolean => {
    // Check rows
    for (let row = 0; row < 5; row++) {
      if (markedNumbers[row].every(marked => marked)) return true;
    }

    // Check columns
    for (let col = 0; col < 5; col++) {
      if (markedNumbers.every(row => row[col])) return true;
    }

    // Check diagonals
    if (markedNumbers.every((row, index) => row[index])) return true;
    if (markedNumbers.every((row, index) => row[4 - index])) return true;

    return false;
  };

  // Declare bingo win
  const declareBingo = useMutation({
    mutationFn: async (cardIndex: number) => {
      const response = await fetch(`/api/games/${gameId}/declare-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cardIndex, 
          cardNumbers: bingoCards[cardIndex].numbers 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to declare bingo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bingo!",
        description: "Congratulations! You won!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading game...</div>;
  }

  if (!game) {
    return <div className="flex justify-center items-center h-screen">Game not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Info Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Game #{game.id}</CardTitle>
              <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
                {game.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Prize Amount</p>
                <p className="text-2xl font-bold">${game.prizeAmount}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="text-lg">{game.playerCount}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Number</p>
                {currentNumber ? (
                  <div className="text-4xl font-bold text-center p-4 bg-primary text-primary-foreground rounded-lg">
                    {currentNumber}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted rounded-lg">
                    Waiting for next number...
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Called Numbers</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {calledNumbers.map((number) => (
                    <Badge key={number} variant="outline" className="text-xs">
                      {number}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bingo Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bingoCards.map((card, cardIndex) => (
              <Card key={card.id} className="p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-center">
                    Card {card.id}
                    {checkBingo(card.markedNumbers) && (
                      <Badge className="ml-2" variant="destructive">BINGO!</Badge>
                    )}
                  </CardTitle>
                  <div className="flex justify-center space-x-4 text-xl font-bold">
                    <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-1">
                    {card.numbers.map((row, rowIndex) =>
                      row.map((number, colIndex) => (
                        <Button
                          key={`${rowIndex}-${colIndex}`}
                          variant={card.markedNumbers[rowIndex][colIndex] ? "default" : "outline"}
                          size="sm"
                          className="aspect-square p-0 text-xs font-semibold"
                          onClick={() => markNumber(cardIndex, rowIndex, colIndex)}
                          disabled={number !== 0 && !calledNumbers.includes(number)}
                        >
                          {number === 0 ? "FREE" : number}
                        </Button>
                      ))
                    )}
                  </div>
                  
                  {checkBingo(card.markedNumbers) && game.status === 'active' && (
                    <Button
                      className="w-full mt-4"
                      onClick={() => declareBingo.mutate(cardIndex)}
                      disabled={declareBingo.isPending}
                    >
                      {declareBingo.isPending ? "Declaring..." : "DECLARE BINGO!"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

echo "Complete frontend deployed successfully!"
ENDSSH

echo "Complete Bingo game frontend deployed to $SERVER_IP"