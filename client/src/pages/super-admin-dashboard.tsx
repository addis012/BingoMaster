import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NavigationHeader } from "@/components/navigation-header";
import { FinancialDashboard } from "@/components/financial-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, GamepadIcon, BarChart3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: shops = [], refetch: refetchShops } = useQuery({
    queryKey: ["/api/shops"],
  });

  const handleBlockShop = async (shopId: number, isBlocked: boolean) => {
    try {
      await apiRequest("PATCH", `/api/shops/${shopId}`, { isBlocked: !isBlocked });
      toast({
        title: "Success",
        description: `Shop ${!isBlocked ? 'blocked' : 'unblocked'} successfully`,
      });
      refetchShops();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      });
    }
  };

  const totalShops = shops.length;
  const activeShops = shops.filter((shop: any) => !shop.isBlocked).length;
  const totalRevenue = shops.reduce((sum: number, shop: any) => sum + parseFloat(shop.totalRevenue || "0"), 0);

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader user={user} title="Admin Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Shop Management Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Shop Management</CardTitle>
              <CardDescription className="text-sm">
                Manage shops and employees
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Manage Shops
              </Button>
            </CardContent>
          </Card>

          {/* Financial Reports Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Financial Reports</CardTitle>
              <CardDescription className="text-sm">
                View revenue and commissions
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                View Reports
              </Button>
            </CardContent>
          </Card>

          {/* Game Monitoring Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <GamepadIcon className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Game Monitoring</CardTitle>
              <CardDescription className="text-sm">
                Monitor active games
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                View Games
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Shops</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalShops}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Shops</p>
                  <p className="text-2xl font-semibold text-gray-900">{activeShops}</p>
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
                  <p className="text-2xl font-semibold text-gray-900">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked Shops</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalShops - activeShops}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Shops */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Shops</CardTitle>
              <CardDescription>Latest registered shops</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.slice(0, 5).map((shop: any) => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell>
                          <Badge variant={shop.isBlocked ? "destructive" : "default"}>
                            {shop.isBlocked ? "Blocked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>{shop.commissionRate}%</TableCell>
                        <TableCell>
                          <Button
                            variant={shop.isBlocked ? "default" : "destructive"}
                            size="sm"
                            onClick={() => handleBlockShop(shop.id, shop.isBlocked)}
                          >
                            {shop.isBlocked ? "Unblock" : "Block"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Platform performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Total Shops</span>
                <span className="text-lg font-bold text-blue-600">{totalShops}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Active Shops</span>
                <span className="text-lg font-bold text-green-600">{activeShops}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Total Revenue</span>
                <span className="text-lg font-bold text-purple-600">${totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium">Commission Rate Avg</span>
                <span className="text-lg font-bold text-orange-600">
                  {shops.length > 0 
                    ? (shops.reduce((sum: number, shop: any) => sum + parseFloat(shop.commissionRate || "0"), 0) / shops.length).toFixed(1)
                    : "0"
                  }%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
