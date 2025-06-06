import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavigationHeader } from "@/components/navigation-header";
import { FinancialDashboard } from "@/components/financial-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, DollarSign, TrendingUp, GamepadIcon, Settings, Calendar, History, UserCog } from "lucide-react";
import { useState } from "react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commissionRate, setCommissionRate] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/users/shop", user?.shopId],
    enabled: !!user?.shopId,
  });

  const { data: shopData } = useQuery({
    queryKey: ["/api/shops", user?.shopId],
    enabled: !!user?.shopId,
  });

  const { data: shopStats } = useQuery({
    queryKey: ["/api/shops", user?.shopId, "stats"],
    enabled: !!user?.shopId,
  });

  const { data: todayGames = [] } = useQuery({
    queryKey: ["/api/games/shop", user?.shopId, "today"],
    enabled: !!user?.shopId,
  });

  const { data: dailyIncome } = useQuery({
    queryKey: ["/api/shops", user?.shopId, "daily-income"],
    enabled: !!user?.shopId,
  });

  // Update commission settings
  const updateCommissionMutation = useMutation({
    mutationFn: async (data: { commissionRate?: string; profitMargin?: string }) => {
      const response = await fetch(`/api/shops/${user?.shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update commission settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops", user?.shopId] });
      toast({ title: "Commission settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update commission settings", variant: "destructive" });
    }
  });

  // Update employee password
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { employeeId: number; password: string }) => {
      const response = await fetch(`/api/users/${data.employeeId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password })
      });
      if (!response.ok) throw new Error('Failed to update password');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Employee password updated successfully" });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedEmployee(null);
    },
    onError: () => {
      toast({ title: "Failed to update password", variant: "destructive" });
    }
  });

  const handleCommissionUpdate = () => {
    if (commissionRate || profitMargin) {
      const updates: any = {};
      if (commissionRate) updates.commissionRate = commissionRate;
      if (profitMargin) updates.profitMargin = profitMargin;
      updateCommissionMutation.mutate(updates);
    }
  };

  const handlePasswordUpdate = () => {
    if (selectedEmployee && newPassword) {
      updatePasswordMutation.mutate({
        employeeId: selectedEmployee.id,
        password: newPassword
      });
    }
  };

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];
  const todayStats = {
    gamesPlayed: todayGames.length,
    totalWinnings: todayGames.reduce((sum: number, game: any) => 
      sum + parseFloat(game.prizePool || "0"), 0
    ),
    totalCollected: todayGames.reduce((sum: number, game: any) => 
      sum + (game.players?.length || 0) * parseFloat(game.entryFee || "0"), 0
    )
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader user={user} title="Admin Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-semibold text-gray-900">{employees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Income</p>
                  <p className="text-2xl font-semibold text-gray-900">${dailyIncome?.amount || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <GamepadIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Games</p>
                  <p className="text-2xl font-semibold text-gray-900">{todayStats.gamesPlayed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">${shopStats?.totalRevenue || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Commission Settings</TabsTrigger>
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
            <TabsTrigger value="history">Game History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Income Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Summary ({today})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Games Played</span>
                    <span className="text-lg font-bold text-green-600">{todayStats.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Total Collected</span>
                    <span className="text-lg font-bold text-blue-600">${todayStats.totalCollected.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Total Winnings</span>
                    <span className="text-lg font-bold text-purple-600">${todayStats.totalWinnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className="text-lg font-bold text-orange-600">
                      ${(todayStats.totalCollected - todayStats.totalWinnings).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Shop Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-sm font-medium">Commission Rate</span>
                    <span className="text-lg font-bold">{shopData?.commissionRate || "0"}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className="text-lg font-bold">{shopData?.profitMargin || "0"}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-sm font-medium">Shop Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      shopData?.isBlocked 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {shopData?.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Commission & Profit Settings
                </CardTitle>
                <CardDescription>
                  Set commission rates and profit margins for your shop
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Commission Rate (%)</Label>
                    <Input
                      id="commission"
                      type="number"
                      placeholder={shopData?.commissionRate || "Enter commission rate"}
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profit">Profit Margin (%)</Label>
                    <Input
                      id="profit"
                      type="number"
                      placeholder={shopData?.profitMargin || "Enter profit margin"}
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCommissionUpdate}
                  disabled={updateCommissionMutation.isPending || (!commissionRate && !profitMargin)}
                  className="w-full md:w-auto"
                >
                  {updateCommissionMutation.isPending ? "Updating..." : "Update Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Employee Management
                </CardTitle>
                <CardDescription>
                  Manage employee accounts and reset passwords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee: any) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.username}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              employee.isBlocked 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {employee.isBlocked ? 'Blocked' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize">{employee.role}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setPasswordDialogOpen(true);
                              }}
                            >
                              Reset Password
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Today's Game History ({today})
                </CardTitle>
                <CardDescription>
                  Complete history of all games played today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Prize Pool</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayGames.map((game: any) => (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium">#{game.id}</TableCell>
                          <TableCell>{game.employee?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              game.status === 'completed' ? 'bg-green-100 text-green-800' :
                              game.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              game.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {game.status}
                            </span>
                          </TableCell>
                          <TableCell>${game.entryFee}</TableCell>
                          <TableCell>${game.prizePool}</TableCell>
                          <TableCell>{game.players?.length || 0}</TableCell>
                          <TableCell>
                            {game.startedAt ? new Date(game.startedAt).toLocaleTimeString() : '-'}
                          </TableCell>
                          <TableCell>
                            {game.completedAt ? new Date(game.completedAt).toLocaleTimeString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {todayGames.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No games played today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Reset Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Employee Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedEmployee?.name} ({selectedEmployee?.username})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePasswordUpdate}
                disabled={updatePasswordMutation.isPending || !newPassword}
              >
                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
