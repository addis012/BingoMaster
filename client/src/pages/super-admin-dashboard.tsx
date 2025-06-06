import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NavigationHeader } from "@/components/navigation-header";
import { FinancialDashboard } from "@/components/financial-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Users, DollarSign, AlertTriangle } from "lucide-react";
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
      <NavigationHeader user={user} title="Super Admin Panel" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shops Management */}
          <Card>
            <CardHeader>
              <CardTitle>Shop Management</CardTitle>
              <CardDescription>Manage all shops and their status</CardDescription>
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
                    {shops.map((shop: any) => (
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

          {/* Financial Dashboard */}
          <FinancialDashboard userRole="super_admin" />
        </div>
      </div>
    </div>
  );
}
