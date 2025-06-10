import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, RefreshCw, DollarSign, TrendingUp, Users, GamepadIcon, Clock, LogOut, CheckCircle, XCircle, AlertCircle, Image, Eye, UserPlus, Settings } from "lucide-react";
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

interface CreditLoad {
  id: number;
  adminId: number;
  amount: string;
  paymentMethod: string;
  referenceNumber?: string;
  transferScreenshot?: string;
  adminAccountNumber?: string;
  notes?: string;
  status: string;
  processedBy?: number;
  processedAt?: string;
  requestedAt: string;
  admin?: {
    id: number;
    name: string;
    username: string;
    accountNumber: string;
  };
}

interface WithdrawalRequest {
  id: number;
  adminId: number;
  amount: string;
  bankAccount: string;
  type: string;
  status: string;
  processedBy?: number;
  processedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  adminName?: string;
}

interface SuperAdminDashboardProps {
  onLogout?: () => void;
}

export default function SuperAdminDashboard({ onLogout }: SuperAdminDashboardProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
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

  // Get pending credit requests
  const { data: creditRequests = [], isLoading: creditRequestsLoading, refetch: refetchCreditRequests } = useQuery({
    queryKey: ["/api/admin/credit-loads"],
    queryFn: async () => {
      const response = await fetch("/api/admin/credit-loads");
      if (!response.ok) throw new Error("Failed to fetch credit requests");
      return response.json() as CreditLoad[];
    },
  });

  // Get withdrawal requests
  const { data: withdrawalRequests = [], isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ["/api/withdrawal-requests"],
    queryFn: async () => {
      const response = await fetch("/api/withdrawal-requests");
      if (!response.ok) throw new Error("Failed to fetch withdrawal requests");
      return response.json() as WithdrawalRequest[];
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

  // Credit request approval/rejection mutation
  const creditRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'approve' | 'reject' }) => {
      const endpoint = action === 'approve' ? 'confirm' : 'reject';
      const response = await fetch(`/api/admin/credit-loads/${requestId}/${endpoint}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error(`Failed to ${action} credit request`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Credit Request ${variables.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Credit request has been ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      refetchCreditRequests();
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Withdrawal request approval/rejection mutation
  const withdrawalRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, rejectionReason }: { 
      requestId: number; 
      action: 'approve' | 'reject';
      rejectionReason?: string;
    }) => {
      const response = await fetch(`/api/withdrawal-requests/${requestId}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} withdrawal request`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Withdrawal Request ${variables.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Withdrawal request has been ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
      refetchWithdrawals();
    },
    onError: (error) => {
      toast({
        title: "Action Failed",
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
          
          <div className="flex gap-2">
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
            
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="revenues">Revenue Details</TabsTrigger>
            <TabsTrigger value="summaries">Daily Summaries</TabsTrigger>
            <TabsTrigger value="credit-requests">Credit Requests</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="admin-management">Admin Management</TabsTrigger>
            <TabsTrigger value="referrals">Referral System</TabsTrigger>
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

          <TabsContent value="credit-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Load Requests</CardTitle>
                <CardDescription>
                  Pending and processed credit load requests from admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {creditRequestsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2">Loading credit requests...</span>
                  </div>
                ) : creditRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No credit requests found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {creditRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {request.admin?.name || request.admin?.username || `Admin ID: ${request.adminId}`}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Amount: {formatCurrency(request.amount)} • Method: {request.paymentMethod}
                            </div>
                            {request.referenceNumber && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Reference: {request.referenceNumber}
                              </div>
                            )}
                            {request.adminAccountNumber && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Admin Account: {request.adminAccountNumber}
                              </div>
                            )}
                            {request.admin?.accountNumber && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                System Account: {request.admin.accountNumber}
                              </div>
                            )}
                            {request.notes && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                Notes: {request.notes}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Requested: {formatDate(request.requestedAt)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <Badge 
                              className={
                                request.status === 'pending' 
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : request.status === 'confirmed'
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }
                            >
                              {request.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {request.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                              {request.status}
                            </Badge>
                            
                            <div className="flex gap-1 flex-wrap">
                              {request.transferScreenshot && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedScreenshot(request.transferScreenshot!);
                                    setShowScreenshotModal(true);
                                  }}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Screenshot
                                </Button>
                              )}
                              
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => creditRequestMutation.mutate({ 
                                      requestId: request.id, 
                                      action: 'approve' 
                                    })}
                                    disabled={creditRequestMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => creditRequestMutation.mutate({ 
                                      requestId: request.id, 
                                      action: 'reject' 
                                    })}
                                    disabled={creditRequestMutation.isPending}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {request.processedAt && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 border-t pt-2 mt-2">
                            Processed: {formatDate(request.processedAt)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>
                  Pending and processed withdrawal requests from admins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2">Loading withdrawal requests...</span>
                  </div>
                ) : withdrawalRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No withdrawal requests found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {request.adminName || `Admin ID: ${request.adminId}`}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Amount: {formatCurrency(request.amount)} • Type: {request.type}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Bank Account: {request.bankAccount}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Requested: {formatDate(request.createdAt)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 sm:mt-0">
                            <Badge 
                              className={
                                request.status === 'pending' 
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : request.status === 'approved'
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }
                            >
                              {request.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                              {request.status}
                            </Badge>
                            
                            {request.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => withdrawalRequestMutation.mutate({ 
                                    requestId: request.id, 
                                    action: 'approve' 
                                  })}
                                  disabled={withdrawalRequestMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => withdrawalRequestMutation.mutate({ 
                                    requestId: request.id, 
                                    action: 'reject' 
                                  })}
                                  disabled={withdrawalRequestMutation.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {request.rejectionReason && (
                          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded mt-2">
                            Rejection reason: {request.rejectionReason}
                          </div>
                        )}
                        
                        {request.processedAt && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 border-t pt-2 mt-2">
                            Processed: {formatDate(request.processedAt)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Admin Management
                </CardTitle>
                <CardDescription>
                  Manage admin accounts, commissions, and system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Admin management features will be restored here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Referral System
                </CardTitle>
                <CardDescription>
                  Manage referral commissions and tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Referral management features will be restored here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Screenshot Modal */}
        {showScreenshotModal && selectedScreenshot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Transfer Screenshot</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowScreenshotModal(false);
                    setSelectedScreenshot(null);
                  }}
                >
                  <XCircle className="w-4 h-4" />
                  Close
                </Button>
              </div>
              <div className="p-4">
                <img
                  src={selectedScreenshot}
                  alt="Transfer Screenshot"
                  className="max-w-full h-auto rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwTDE3NSAxMjVIMTUwVjE3NUgxNzVMMjAwIDE1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHR5cGUgZm9udC1mYW1pbHk9IkludGVyIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3Mjg0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSIyMDAiIHk9IjIwMCI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+';
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}