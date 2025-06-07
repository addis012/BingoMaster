import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Settings, Percent, DollarSign, Save, History } from "lucide-react";

interface SystemSettingsProps {
  userRole: 'admin' | 'super_admin';
}

export function SystemSettings({ userRole }: SystemSettingsProps) {
  const { toast } = useToast();
  const [commissionRate, setCommissionRate] = useState("15");
  const [adminProfitMargin, setAdminProfitMargin] = useState("70");
  const [prizePoolPercentage, setPrizePoolPercentage] = useState("15");

  const { data: gameHistory = [] } = useQuery({
    queryKey: ["/api/admin/game-history"],
    enabled: userRole === 'admin' || userRole === 'super_admin',
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch("/api/admin/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settings = {
      commissionRate: parseFloat(commissionRate),
      adminProfitMargin: parseFloat(adminProfitMargin),
      prizePoolPercentage: parseFloat(prizePoolPercentage),
    };

    // Validate percentages add up correctly
    const total = settings.commissionRate + settings.prizePoolPercentage;
    if (total > 100 || settings.adminProfitMargin > 100) {
      toast({
        title: "Invalid Settings",
        description: "Percentages must not exceed 100%",
        variant: "destructive",
      });
      return;
    }

    updateSettingsMutation.mutate(settings);
  };

  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6" />
        <h2 className="text-2xl font-bold">System Settings & Game History</h2>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Profit & Commission Settings</TabsTrigger>
          <TabsTrigger value="history">Game History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-600" />
                  Commission Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="commissionRate">Super Admin Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Percentage of game revenue that goes to super admin
                  </p>
                </div>

                <div>
                  <Label htmlFor="prizePoolPercentage">Prize Pool Percentage (%)</Label>
                  <Input
                    id="prizePoolPercentage"
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={prizePoolPercentage}
                    onChange={(e) => setPrizePoolPercentage(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Percentage of game revenue allocated to prize pool
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Admin Profit Margin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminProfitMargin">Admin Profit Margin (%)</Label>
                  <Input
                    id="adminProfitMargin"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={adminProfitMargin}
                    onChange={(e) => setAdminProfitMargin(e.target.value)}
                    placeholder="70"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Percentage of remaining revenue that goes to shop admin
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Revenue Distribution Preview</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div>Super Admin Commission: {commissionRate}%</div>
                    <div>Prize Pool: {prizePoolPercentage}%</div>
                    <div>Admin Profit: {adminProfitMargin}% of remaining {100 - parseFloat(commissionRate) - parseFloat(prizePoolPercentage)}%</div>
                    <div className="font-medium border-t border-blue-200 pt-1">
                      Admin Gets: {((100 - parseFloat(commissionRate) - parseFloat(prizePoolPercentage)) * parseFloat(adminProfitMargin) / 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="w-full md:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Game History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(gameHistory) && gameHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gameHistory.map((game: any) => (
                      <Card key={game.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-medium">Game #{game.id}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(game.completedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Shop:</span>
                                <span className="font-medium">{game.shop?.name || `ID: ${game.shopId}`}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Employee:</span>
                                <span className="font-medium">{game.employee?.name || `ID: ${game.employeeId}`}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Players:</span>
                                <span className="font-medium">{game.playerCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Revenue:</span>
                                <span className="font-medium text-green-600">ETB {game.totalRevenue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Prize Amount:</span>
                                <span className="font-medium text-blue-600">ETB {game.prizeAmount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Super Admin Commission:</span>
                                <span className="font-medium text-purple-600">ETB {game.superAdminCommission}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Admin Profit:</span>
                                <span className="font-medium text-orange-600">ETB {game.adminProfit}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No game history available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}