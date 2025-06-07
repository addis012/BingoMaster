import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavigationHeader } from "@/components/navigation-header";
import { EmployeeCreationForm } from "@/components/employee-creation-form";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Users, DollarSign, GamepadIcon, BarChart3, UserPlus, CreditCard } from "lucide-react";

interface SimpleAdminDashboardProps {
  onLogout: () => void;
}

export default function SimpleAdminDashboard({ onLogout }: SimpleAdminDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const { data: shopStats } = useQuery({
    queryKey: ["/api/admin/shop-stats"],
  });

  const { data: creditBalance } = useQuery({
    queryKey: ["/api/credit/balance"],
  });

  const handleEmployeeCreated = () => {
    refetchEmployees();
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = shopStats as any || {};
  const balance = creditBalance as any || {};
  const employeeList = employees as any[] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your shop operations and employees</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Shop Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ETB {stats.totalRevenue || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employeeList.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active staff members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Games Completed</CardTitle>
                  <GamepadIcon className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalGames || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total games played
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
                  <CreditCard className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">ETB {balance.balance || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">
                    Available credits
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Performance</CardTitle>
                <CardDescription>
                  Your shop's recent performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium">Today's Revenue</h4>
                    <p className="text-2xl font-bold text-green-600">ETB {stats.todayRevenue || '0'}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium">Active Games</h4>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeGames || 0}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium">Players Today</h4>
                    <p className="text-2xl font-bold text-purple-600">{stats.todayPlayers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Employee Creation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Add New Employee
                  </CardTitle>
                  <CardDescription>
                    Create a new employee account for your shop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmployeeCreationForm onSuccess={handleEmployeeCreated} />
                </CardContent>
              </Card>

              {/* Employee List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Current Employees
                  </CardTitle>
                  <CardDescription>
                    Manage your shop's staff members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employeeList.map((employee: any) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-muted-foreground">@{employee.username}</p>
                          <p className="text-sm text-muted-foreground">{employee.email || 'No email'}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={employee.isBlocked ? "destructive" : "default"}>
                            {employee.isBlocked ? "Blocked" : "Active"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {employeeList.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No employees found. Create your first employee to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
                <CardDescription>
                  Detailed financial insights for your shop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Revenue Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Revenue:</span>
                        <span className="font-bold">ETB {stats.totalRevenue || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Games Played:</span>
                        <span className="font-bold">{stats.totalGames || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Players:</span>
                        <span className="font-bold">{stats.totalPlayers || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Account Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Account Number:</span>
                        <span className="font-mono">{user.accountNumber || `ID: ${user.id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Holder:</span>
                        <span>{user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shop ID:</span>
                        <span>{user.shopId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Credit Management
                </CardTitle>
                <CardDescription>
                  Manage your shop's credit balance and transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center p-6 border-2 border-dashed rounded-lg">
                    <h3 className="text-2xl font-bold">Current Balance</h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">ETB {balance.balance || '0.00'}</p>
                    <p className="text-muted-foreground mt-2">Available for transfers and operations</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button className="w-full" size="lg">
                      Load Credits
                    </Button>
                    <Button variant="outline" className="w-full" size="lg">
                      Transfer Credits
                    </Button>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Account Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Account Number:</span>
                        <span className="font-mono">{user.accountNumber || `ID: ${user.id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Holder:</span>
                        <span>{user.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shop ID:</span>
                        <span>{user.shopId}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}