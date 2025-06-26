import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, CheckCircle, Clock, Users, TrendingUp, Eye, LogOut } from "lucide-react";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  shopId: number;
  supervisorId: number;
}

interface Cartela {
  id: number;
  cartelaNumber: number;
  name: string;
  pattern: number[][];
  numbers: number[];
  isBooked: boolean;
  bookedBy?: number;
  collectorId?: number;
  markedAt?: string;
  gameId?: number;
}

interface CollectorStats {
  totalMarked: number;
  todayMarked: number;
  availableCartelas: number;
  bookedCartelas: number;
}

export function CollectorDashboard({ user }: { user: User }) {
  const [searchCartela, setSearchCartela] = useState("");
  const [selectedCartela, setSelectedCartela] = useState<Cartela | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Logout function
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  // Get supervisor (employee) information
  const { data: supervisor } = useQuery({
    queryKey: [`/api/users/${user.supervisorId}`],
    enabled: !!user.supervisorId,
  });

  // Fetch cartelas for this shop
  const { data: cartelas = [], isLoading: cartelasLoading } = useQuery({
    queryKey: [`/api/cartelas/${user.shopId}`],
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });

  // Fetch collector stats
  const { data: stats } = useQuery<CollectorStats>({
    queryKey: [`/api/collectors/${user.id}/stats`],
    refetchInterval: 5000,
  });

  // Mark cartela mutation
  const markCartelaMutation = useMutation({
    mutationFn: async (cartelaId: number) => {
      return apiRequest(`/api/collectors/mark-cartela`, "POST", { cartelaId, collectorId: user.id });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cartela marked for collection successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user.shopId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collectors/${user.id}/stats`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark cartela",
        variant: "destructive",
      });
    },
  });

  // Unmark cartela mutation
  const unmarkCartelaMutation = useMutation({
    mutationFn: async (cartelaId: number) => {
      return apiRequest(`/api/collectors/unmark-cartela`, "POST", { cartelaId, collectorId: user.id });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cartela unbooking completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user.shopId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collectors/${user.id}/stats`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unbook cartela",
        variant: "destructive",
      });
    },
  });

  // Filter cartelas based on search
  const filteredCartelas = (cartelas as Cartela[]).filter((cartela: Cartela) =>
    cartela.cartelaNumber.toString().includes(searchCartela) ||
    cartela.name.toLowerCase().includes(searchCartela.toLowerCase())
  );

  // Available cartelas (not booked and not marked by any collector)
  const availableCartelas = filteredCartelas.filter(
    (cartela: Cartela) => !cartela.collectorId && !cartela.isBooked
  );

  // Cartelas marked by this collector
  const myMarkedCartelas = filteredCartelas.filter(
    (cartela: Cartela) => cartela.collectorId === user.id
  );

  const handleMarkCartela = (cartelaId: number) => {
    markCartelaMutation.mutate(cartelaId);
  };

  const handleUnmarkCartela = (cartelaId: number) => {
    unmarkCartelaMutation.mutate(cartelaId);
  };

  const handleViewCartela = (cartela: Cartela) => {
    setSelectedCartela(cartela);
    setIsViewDialogOpen(true);
  };

  // Render cartela grid for viewing
  const renderCartelaGrid = (pattern: number[][]) => {
    return (
      <div className="w-full max-w-xs mx-auto">
        <div className="grid grid-cols-5 gap-1 text-xs">
          {["B", "I", "N", "G", "O"].map((letter) => (
            <div key={letter} className="text-center font-bold p-1 bg-gray-100">
              {letter}
            </div>
          ))}
          {pattern.map((row, rowIndex) =>
            row.map((number, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="text-center p-1 border border-gray-200 bg-white text-xs"
              >
                {number === 0 ? "FREE" : number}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Collector Dashboard
            </h1>
            <p className="text-gray-600">
              Working under: {(supervisor as any)?.name || 'Loading...'} | Shop: {user.shopId}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="ml-4">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Marked</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMarked || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayMarked || 0}</div>
              <p className="text-xs text-muted-foreground">Today's count</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableCartelas.length}</div>
              <p className="text-xs text-muted-foreground">Ready to mark</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Marked</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myMarkedCartelas.length}</div>
              <p className="text-xs text-muted-foreground">Collected</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="mark" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mark">Mark Cartelas</TabsTrigger>
            <TabsTrigger value="my-marked">My Marked ({myMarkedCartelas.length})</TabsTrigger>
            <TabsTrigger value="available">Available ({availableCartelas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mark" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Cartelas for Collection</CardTitle>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search cartela number..."
                      value={searchCartela}
                      onChange={(e) => setSearchCartela(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cartelasLoading ? (
                  <div className="text-center py-8">Loading cartelas...</div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                      {availableCartelas.map((cartela: Cartela) => (
                        <div key={cartela.id} className="flex flex-col items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-12 text-xs flex flex-col gap-1 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleMarkCartela(cartela.id)}
                            disabled={markCartelaMutation.isPending}
                          >
                            <span className="font-semibold">{cartela.cartelaNumber}</span>
                            <span className="text-xs text-muted-foreground truncate w-full">
                              {cartela.name}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-full mt-1 text-xs"
                            onClick={() => handleViewCartela(cartela)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                    {availableCartelas.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No available cartelas found
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-marked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Marked Cartelas</CardTitle>
                <p className="text-sm text-muted-foreground">Cartelas you have collected - click to unbook if needed</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                    {myMarkedCartelas.map((cartela: Cartela) => (
                      <div key={cartela.id} className="flex flex-col items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-12 text-xs flex flex-col gap-1 bg-green-50 border-green-300 hover:bg-green-100"
                        >
                          <span className="font-semibold">{cartela.cartelaNumber}</span>
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {cartela.name}
                          </span>
                        </Button>
                        <div className="flex gap-1 mt-1 w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 flex-1 text-xs"
                            onClick={() => handleViewCartela(cartela)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 flex-1 text-xs text-red-600 hover:text-red-700"
                            onClick={() => handleUnmarkCartela(cartela.id)}
                            disabled={unmarkCartelaMutation.isPending}
                          >
                            {unmarkCartelaMutation.isPending ? "..." : "Unbook"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {myMarkedCartelas.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No marked cartelas yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Available Cartelas</CardTitle>
                <p className="text-sm text-muted-foreground">Overview of all available cartelas in this shop</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                    {availableCartelas.map((cartela: Cartela) => (
                      <div key={cartela.id} className="flex flex-col items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-12 text-xs flex flex-col gap-1 hover:bg-gray-50"
                        >
                          <span className="font-semibold">{cartela.cartelaNumber}</span>
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {cartela.name}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-full mt-1 text-xs"
                          onClick={() => handleViewCartela(cartela)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                  {availableCartelas.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No available cartelas
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Cartela View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Cartela #{selectedCartela?.cartelaNumber} - {selectedCartela?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCartela && renderCartelaGrid(selectedCartela.pattern)}
              <div className="flex gap-2 justify-center">
                <Badge variant="outline">
                  {selectedCartela?.collectorId === user.id ? "Marked by You" : "Available"}
                </Badge>
                {selectedCartela?.markedAt && (
                  <Badge variant="secondary">
                    Marked: {new Date(selectedCartela.markedAt).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}