import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, CheckCircle, Clock, Users, TrendingUp } from "lucide-react";

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
  const [selectedCartelaId, setSelectedCartelaId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get supervisor (employee) information
  const { data: supervisor } = useQuery({
    queryKey: [`/api/users/${user.supervisorId}`],
    enabled: !!user.supervisorId,
  });

  // Get available cartelas for this shop
  const { data: cartelas = [], isLoading: cartelasLoading } = useQuery({
    queryKey: [`/api/cartelas/${user.shopId}`],
  });

  // Get collector statistics
  const { data: stats } = useQuery<CollectorStats>({
    queryKey: [`/api/collectors/${user.id}/stats`],
  });

  // Mark cartela mutation
  const markCartelaMutation = useMutation({
    mutationFn: async (cartelaId: number) => {
      const response = await fetch(`/api/collectors/mark-cartela`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cartelaId,
          collectorId: user.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to mark cartela");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cartela marked successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user.shopId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collectors/${user.id}/stats`] });
      setSelectedCartelaId(null);
      setSearchCartela("");
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
      const response = await fetch(`/api/collectors/unmark-cartela`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cartelaId,
          collectorId: user.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to unmark cartela");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cartela unmarked successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/cartelas/${user.shopId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/collectors/${user.id}/stats`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unmark cartela",
        variant: "destructive",
      });
    },
  });

  // Filter cartelas based on search
  const filteredCartelas = Array.isArray(cartelas) ? cartelas.filter((cartela: Cartela) =>
    cartela.cartelaNumber.toString().includes(searchCartela) ||
    cartela.name.toLowerCase().includes(searchCartela.toLowerCase())
  ) : [];

  // Get cartelas marked by this collector
  const myMarkedCartelas = Array.isArray(cartelas) ? cartelas.filter((cartela: Cartela) => 
    cartela.collectorId === user.id
  ) : [];

  // Get available cartelas (not booked)
  const availableCartelas = Array.isArray(cartelas) ? cartelas.filter((cartela: Cartela) => 
    !cartela.isBooked && !cartela.collectorId
  ) : [];

  const handleMarkCartela = (cartelaId: number) => {
    markCartelaMutation.mutate(cartelaId);
  };

  const handleUnmarkCartela = (cartelaId: number) => {
    unmarkCartelaMutation.mutate(cartelaId);
  };

  const renderCartelaGrid = (pattern: number[][]) => {
    return (
      <div className="grid grid-cols-5 gap-1 w-fit mx-auto">
        {pattern.map((row, rowIndex) =>
          row.map((num, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-8 h-8 flex items-center justify-center text-xs font-medium border border-gray-300 bg-white rounded"
            >
              {num === 0 ? "FREE" : num}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Collector Dashboard
          </h1>
          <p className="text-gray-600">
            Working under: {(supervisor as any)?.name || 'Loading...'} | Shop: {user.shopId}
          </p>
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
              <CardTitle className="text-sm font-medium">Today Marked</CardTitle>
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
              <CardTitle className="text-sm font-medium">Booked</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.bookedCartelas || 0}</div>
              <p className="text-xs text-muted-foreground">In games</p>
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
                <CardTitle>Mark Cartela for Collection</CardTitle>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search cartela number or name..."
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCartelas
                      .filter((cartela: Cartela) => !cartela.collectorId && !cartela.isBooked)
                      .map((cartela: Cartela) => (
                        <Card key={cartela.id} className="border-2 hover:border-blue-300 transition-colors">
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">#{cartela.cartelaNumber}</CardTitle>
                              <Badge variant="outline">{cartela.name}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {renderCartelaGrid(cartela.pattern)}
                            <Button
                              onClick={() => handleMarkCartela(cartela.id)}
                              disabled={markCartelaMutation.isPending}
                              className="w-full"
                            >
                              {markCartelaMutation.isPending ? "Marking..." : "Mark as Collected"}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-marked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Marked Cartelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myMarkedCartelas.map((cartela: Cartela) => (
                    <Card key={cartela.id} className="border-2 border-green-200">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">#{cartela.cartelaNumber}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{cartela.name}</Badge>
                            <Badge variant="default" className="bg-green-500">Marked</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {renderCartelaGrid(cartela.pattern)}
                        <div className="text-sm text-gray-600">
                          Marked: {cartela.markedAt ? new Date(cartela.markedAt).toLocaleString() : "N/A"}
                        </div>
                        <Button
                          onClick={() => handleUnmarkCartela(cartela.id)}
                          disabled={unmarkCartelaMutation.isPending}
                          variant="outline"
                          className="w-full"
                        >
                          {unmarkCartelaMutation.isPending ? "Unmarking..." : "Unmark"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Available Cartelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableCartelas.map((cartela: Cartela) => (
                    <Card key={cartela.id} className="border-2">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">#{cartela.cartelaNumber}</CardTitle>
                          <Badge variant="outline">{cartela.name}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {renderCartelaGrid(cartela.pattern)}
                        <Badge variant="secondary" className="w-full justify-center">
                          Available
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}