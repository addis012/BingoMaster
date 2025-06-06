import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RetailReport } from "@/components/retail-report";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, TrendingUp, GamepadIcon, Settings, Calendar, History, UserCog, Building2, Plus, UserX } from "lucide-react";
import { useState } from "react";

interface SimpleAdminDashboardProps {
  onLogout: () => void;
}

export default function SimpleAdminDashboard({ onLogout }: SimpleAdminDashboardProps) {
  const { toast } = useToast();
  const [commissionRate, setCommissionRate] = useState("");
  const [profitMargin, setProfitMargin] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeUsername, setEmployeeUsername] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [createEmployeeDialogOpen, setCreateEmployeeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

  // Mock shop ID for demo (in real app this would come from auth)
  const shopId = 1;

  // Fetch employees for this shop
  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["/api/users/shop", shopId],
  });

  // Fetch shop data
  const { data: shopData, refetch: refetchShop } = useQuery({
    queryKey: ["/api/shops", shopId],
    queryFn: () => fetch(`/api/shops/${shopId}`).then(res => res.json()),
  });

  // Fetch today's games
  const { data: todayGames = [] } = useQuery({
    queryKey: ["/api/games/shop", shopId],
  });

  // Fetch game history
  const { data: gameHistory = [] } = useQuery({
    queryKey: ["/api/game-history", shopId],
    queryFn: () => fetch(`/api/game-history/${shopId}`).then(res => res.json()),
  });

  // Fetch today's stats
  const { data: todayStats } = useQuery({
    queryKey: ["/api/stats/today", shopId],
    queryFn: () => fetch(`/api/stats/today/${shopId}`).then(res => res.json()),
    enabled: !!shopId,
  });

  // Update commission settings
  const updateCommissionMutation = useMutation({
    mutationFn: async (data: { profitMargin: string }) => {
      return await apiRequest("PATCH", `/api/shops/${shopId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Commission settings updated successfully",
      });
      refetchShop();
      setCommissionRate("");
      setProfitMargin("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update commission settings",
        variant: "destructive",
      });
    },
  });

  // Create employee
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users", {
        ...data,
        role: "employee",
        shopId: shopId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      refetchEmployees();
      setCreateEmployeeDialogOpen(false);
      setEmployeeName("");
      setEmployeeUsername("");
      setEmployeePassword("");
      setEmployeeEmail("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  // Reset employee password
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { employeeId: number; newPassword: string }) => {
      return await apiRequest("PATCH", `/api/users/${data.employeeId}/password`, {
        password: data.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedEmployee(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  // Delete employee
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return await apiRequest("DELETE", `/api/users/${employeeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      refetchEmployees();
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const handleUpdateCommission = () => {
    if (!profitMargin) {
      toast({
        title: "Error",
        description: "Please enter a profit margin",
        variant: "destructive",
      });
      return;
    }
    // Only send profit margin for regular admins (commission rate is super admin only)
    updateCommissionMutation.mutate({ profitMargin });
  };

  const handleCreateEmployee = () => {
    if (!employeeName || !employeeUsername || !employeePassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate({
      name: employeeName,
      username: employeeUsername,
      password: employeePassword,
      email: employeeEmail,
    });
  };

  const handleResetPassword = () => {
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({
      employeeId: selectedEmployee.id,
      newPassword,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commission">Commission Settings</TabsTrigger>
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
            <TabsTrigger value="history">Game History</TabsTrigger>
            <TabsTrigger value="reports">Retail Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Daily Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Today's Income</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        Br {todayStats?.netIncome?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <GamepadIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Games Today</p>
                      <p className="text-2xl font-semibold text-gray-900">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Players Today</p>
                      <p className="text-2xl font-semibold text-gray-900">0</p>
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
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900">Br 0.00</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Current Settings</CardTitle>
                  <CardDescription>Shop commission and profit settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Commission Rate</span>
                    <span className="text-lg font-bold text-blue-600">5.0%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className="text-lg font-bold text-green-600">15.0%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Update Commission Settings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <UserCog className="mr-2 h-4 w-4" />
                    Manage Employees
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <History className="mr-2 h-4 w-4" />
                    View Game History
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="commission" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Commission Settings</CardTitle>
                <CardDescription>Update commission rates and profit margins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commission">Commission Rate (%) - Super Admin Only</Label>
                    <Input 
                      id="commission"
                      type="number" 
                      placeholder="5.0" 
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      disabled={true}
                      className="bg-gray-100"
                    />
                    <p className="text-sm text-gray-500">Contact Super Admin to change commission rates</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profit">Profit Margin (%)</Label>
                    <Input 
                      id="profit"
                      type="number" 
                      placeholder="15.0" 
                      value={profitMargin}
                      onChange={(e) => setProfitMargin(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleUpdateCommission}
                  disabled={updateCommissionMutation.isPending}
                >
                  {updateCommissionMutation.isPending ? "Updating..." : "Update Settings"}
                </Button>
                
                {shopData && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Settings</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Commission Rate: </span>
                        <span className="font-medium">{shopData.commissionRate || "0"}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Profit Margin: </span>
                        <span className="font-medium">{shopData.profitMargin || "0"}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Game History</CardTitle>
                <CardDescription>View completed games with financial details (Ethiopian Birr)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Game ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Winner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Players
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Collected (ETB)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prize Amount (ETB)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Admin Profit (ETB)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Super Admin Commission (ETB)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {gameHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                            No game history available
                          </td>
                        </tr>
                      ) : (
                        gameHistory.map((game: any) => (
                          <tr key={game.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{game.gameId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(game.completedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {game.winnerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {game.playerCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {parseFloat(game.totalCollected).toFixed(2)} ETB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                              {parseFloat(game.prizeAmount).toFixed(2)} ETB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                              {parseFloat(game.adminProfit).toFixed(2)} ETB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                              {parseFloat(game.superAdminCommission).toFixed(2)} ETB
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {gameHistory.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Financial Summary (Ethiopian Birr)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Games: </span>
                        <span className="font-medium">{gameHistory.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Collected: </span>
                        <span className="font-medium text-green-600">
                          {gameHistory.reduce((sum: number, game: any) => sum + parseFloat(game.totalCollected || "0"), 0).toFixed(2)} ETB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Admin Profit: </span>
                        <span className="font-medium text-purple-600">
                          {gameHistory.reduce((sum: number, game: any) => sum + parseFloat(game.adminProfit || "0"), 0).toFixed(2)} ETB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Commission: </span>
                        <span className="font-medium text-orange-600">
                          {gameHistory.reduce((sum: number, game: any) => sum + parseFloat(game.superAdminCommission || "0"), 0).toFixed(2)} ETB
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Employee Management</CardTitle>
                    <CardDescription>Manage employees and reset passwords</CardDescription>
                  </div>
                  <Dialog open={createEmployeeDialogOpen} onOpenChange={setCreateEmployeeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Employee
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Employee</DialogTitle>
                        <DialogDescription>
                          Add a new employee to your shop
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="empName">Full Name</Label>
                          <Input
                            id="empName"
                            placeholder="Employee Name"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="empUsername">Username</Label>
                          <Input
                            id="empUsername"
                            placeholder="username"
                            value={employeeUsername}
                            onChange={(e) => setEmployeeUsername(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="empPassword">Password</Label>
                          <Input
                            id="empPassword"
                            type="password"
                            placeholder="Password"
                            value={employeePassword}
                            onChange={(e) => setEmployeePassword(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="empEmail">Email (Optional)</Label>
                          <Input
                            id="empEmail"
                            type="email"
                            placeholder="employee@example.com"
                            value={employeeEmail}
                            onChange={(e) => setEmployeeEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateEmployeeDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateEmployee}
                          disabled={createEmployeeMutation.isPending}
                        >
                          {createEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No employees found. Click "Add Employee" to create your first employee.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee: any) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.username}</TableCell>
                          <TableCell>{employee.email || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              employee.isBlocked 
                                ? "bg-red-100 text-red-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {employee.isBlocked ? "Blocked" : "Active"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
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
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setEmployeeToDelete(employee);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Game History</CardTitle>
                <CardDescription>Today's completed games</CardDescription>
              </CardHeader>
              <CardContent>
                {todayGames.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <GamepadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No games played today. Game history will appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game ID</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Entry Fee</TableHead>
                        <TableHead>Prize Pool</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Started At</TableHead>
                        <TableHead>Completed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayGames.map((game: any) => (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium">#{game.id}</TableCell>
                          <TableCell>{game.employeeName || `Employee ${game.employeeId}`}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              game.status === 'completed' 
                                ? "bg-green-100 text-green-800"
                                : game.status === 'active'
                                ? "bg-blue-100 text-blue-800"
                                : game.status === 'cancelled'
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>Br {game.entryFee || "0.00"}</TableCell>
                          <TableCell>Br {game.prizePool || "0.00"}</TableCell>
                          <TableCell>{game.playerCount || 0}</TableCell>
                          <TableCell>
                            {game.startedAt ? new Date(game.startedAt).toLocaleTimeString() : "-"}
                          </TableCell>
                          <TableCell>
                            {game.completedAt ? new Date(game.completedAt).toLocaleTimeString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <RetailReport />
          </TabsContent>
        </Tabs>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Employee Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedEmployee?.name}
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
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete employee "{employeeToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setEmployeeToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteEmployeeMutation.mutate(employeeToDelete?.id)}
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? "Deleting..." : "Delete Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}