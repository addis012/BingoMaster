import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, RefreshCw, DollarSign, TrendingUp, Users, GamepadIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SuperAdminRevenue {
  id: number;
  amount: string;
  adminId: number;
  adminName: string;
  gameId: number;
  dateEAT: string;
  createdAt: string;
}

interface DailyRevenueSummary {
  id: number;
  date: string;
  totalSuperAdminRevenue: string;
  totalAdminRevenue: string;
  totalGamesPlayed: number;
  totalPlayersRegistered: number;
  createdAt: string;
  updatedAt: string;
}

interface SuperAdminDashboardProps {
  onLogout?: () => void;
}

export default function SuperAdminDashboard({ onLogout }: SuperAdminDashboardProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current EAT date
  const { data: currentDate } = useQuery({
    queryKey: ["/api/super-admin/current-eat-date"],
  });

  // Get Super Admin revenues with date filtering
  const { data: revenues = [], isLoading: revenuesLoading } = useQuery({
    queryKey: ["/api/super-admin/revenues", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      
      const response = await fetch(`/api/super-admin/revenues?${params}`);
      if (!response.ok) throw new Error("Failed to fetch revenues");
      return response.json() as SuperAdminRevenue[];
    },
  });

  // Get total revenue
  const { data: totalRevenue } = useQuery({
    queryKey: ["/api/super-admin/revenue-total", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      
      const response = await fetch(`/api/super-admin/revenue-total?${params}`);
      if (!response.ok) throw new Error("Failed to fetch total revenue");
      return response.json() as { total: string };
    },
  });

  // Get daily summaries
  const { data: dailySummaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ["/api/super-admin/daily-summaries", dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      
      const response = await fetch(`/api/super-admin/daily-summaries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch daily summaries");
      return response.json() as DailyRevenueSummary[];
    },
  });

  // Daily reset mutation
  const dailyResetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/super-admin/daily-reset", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to perform daily reset");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Daily Reset Completed",
        description: "Revenue data has been archived and counters reset successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin"] });
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDateFilter = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/super-admin"] });
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin"] });
    }, 100);
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toLocaleString()} ETB`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  // Calculate summary statistics
  const totalRevenueAmount = totalRevenue?.total || "0.00";
  const totalGames = dailySummaries.reduce((sum, day) => sum + day.totalGamesPlayed, 0);
  const totalPlayers = dailySummaries.reduce((sum, day) => sum + day.totalPlayersRegistered, 0);
  const averageDailyRevenue = dailySummaries.length > 0 
    ? (parseFloat(totalRevenueAmount) / dailySummaries.length).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Super Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Revenue tracking and system management
            </p>
            {currentDate && (
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                Current EAT Date: {currentDate.date}
              </p>
            )}
          </div>
          
          <Button
            onClick={() => dailyResetMutation.mutate()}
            disabled={dailyResetMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {dailyResetMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Daily Reset (EAT Midnight)
          </Button>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Date Filter
            </CardTitle>
            <CardDescription>
              Filter revenue data by date range (YYYY-MM-DD format)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDateFilter} variant="outline">
                  Apply Filter
                </Button>
                <Button onClick={clearDateFilter} variant="ghost">
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenueAmount)}
              </div>
              <p className="text-green-100 text-xs mt-1">
                Super Admin Commission (25% of Admin Profits)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg Daily Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(averageDailyRevenue)}
              </div>
              <p className="text-blue-100 text-xs mt-1">
                {dateFrom || dateTo ? "Filtered period" : "All time"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GamepadIcon className="w-4 h-4" />
                Total Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalGames.toLocaleString()}
              </div>
              <p className="text-purple-100 text-xs mt-1">
                Games completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalPlayers.toLocaleString()}
              </div>
              <p className="text-orange-100 text-xs mt-1">
                Players registered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="revenues" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenues">Revenue Details</TabsTrigger>
            <TabsTrigger value="summaries">Daily Summaries</TabsTrigger>
          </TabsList>

          <TabsContent value="revenues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Super Admin Revenue Log</CardTitle>
                <CardDescription>
                  Detailed breakdown of Super Admin commission earnings from admin profits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2">Loading revenue data...</span>
                  </div>
                ) : revenues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No revenue data found for the selected period
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revenues.map((revenue) => (
                      <div
                        key={revenue.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {revenue.adminName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Game ID: {revenue.gameId} • Date: {revenue.dateEAT}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(revenue.createdAt)}
                          </div>
                        </div>
                        <div className="text-right mt-2 sm:mt-0">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            +{formatCurrency(revenue.amount)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summaries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Summaries</CardTitle>
                <CardDescription>
                  Daily aggregated data with automatic reset functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summariesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2">Loading summary data...</span>
                  </div>
                ) : dailySummaries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No daily summaries found for the selected period
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dailySummaries.map((summary) => (
                      <div
                        key={summary.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {summary.date}
                          </h3>
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-2 sm:mt-0">
                            {formatCurrency(summary.totalSuperAdminRevenue)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Games:</span>
                            <span className="ml-2 font-medium">{summary.totalGamesPlayed}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Players:</span>
                            <span className="ml-2 font-medium">{summary.totalPlayersRegistered}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Admin Revenue:</span>
                            <span className="ml-2 font-medium">{formatCurrency(summary.totalAdminRevenue)}</span>
                          </div>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Last updated: {formatDate(summary.updatedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}