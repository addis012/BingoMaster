import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NavigationHeader } from "@/components/navigation-header";
import { FinancialDashboard } from "@/components/financial-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Users, DollarSign, TrendingUp, GamepadIcon } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/users/shop", user?.shopId],
    enabled: !!user?.shopId,
  });

  const { data: shopStats } = useQuery({
    queryKey: ["/api/shops", user?.shopId, "stats"],
    enabled: !!user?.shopId,
  });

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
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">${shopStats?.totalRevenue || "0"}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Games</p>
                  <p className="text-2xl font-semibold text-gray-900">{shopStats?.totalGames || 0}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Players</p>
                  <p className="text-2xl font-semibold text-gray-900">{shopStats?.totalPlayers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employee Management */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>Monitor your employees' performance</CardDescription>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Financial Dashboard */}
          <FinancialDashboard userRole="admin" />
        </div>
      </div>
    </div>
  );
}
