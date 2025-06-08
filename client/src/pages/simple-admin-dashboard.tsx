import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavigationHeader } from "@/components/navigation-header";
import { EmployeeCreationForm } from "@/components/employee-creation-form";
import { SystemSettings } from "@/components/system-settings";
import { FileUpload } from "@/components/file-upload";
import { AdminCreditLoadHistory } from "@/components/admin-credit-load-history";
import { AdminReferralCommissions } from "@/components/admin-referral-commissions";
import { EnhancedGameHistory } from "@/components/enhanced-game-history";
import { ErrorDisplay, LoadingState } from "@/components/error-display";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, DollarSign, GamepadIcon, BarChart3, UserPlus, CreditCard, Plus, ArrowRight, History, AlertCircle, Gift } from "lucide-react";

interface SimpleAdminDashboardProps {
  onLogout: () => void;
}

export default function SimpleAdminDashboard({ onLogout }: SimpleAdminDashboardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Credit management states
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loadAmount, setLoadAmount] = useState("");
  const [loadBankAccount, setLoadBankAccount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transferScreenshot, setTransferScreenshot] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const { data: employees = [], refetch: refetchEmployees, error: employeesError, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const { data: shopStats, error: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/shop-stats"],
  });

  const { data: creditBalance, error: balanceError, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ["/api/credit/balance"],
  });

  const handleEmployeeCreated = () => {
    refetchEmployees();
  };

  // Credit load mutation
  const loadCreditMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/credit/load", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit/balance"] });
      setShowLoadDialog(false);
      setLoadAmount("");
      setLoadBankAccount("");
      toast({
        title: "Credit Load Requested",
        description: "Your credit load request has been submitted for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit credit load request",
        variant: "destructive",
      });
    },
  });

  // Credit transfer mutation
  const transferCreditMutation = useMutation({
    mutationFn: async (data: { amount: string; toAdminId: number }) => {
      const response = await fetch("/api/credit/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transfer credit");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit/balance"] });
      setShowTransferDialog(false);
      setTransferAmount("");
      setTransferRecipient("");
      toast({
        title: "Credit Transferred",
        description: "Credit has been successfully transferred.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer credit",
        variant: "destructive",
      });
    },
  });

  const handleLoadCredit = async () => {
    if (!loadAmount || !screenshotFile) {
      toast({
        title: "Error",
        description: "Please provide amount and bank transfer screenshot",
        variant: "destructive",
      });
      return;
    }
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64Screenshot = reader.result as string;
      
      loadCreditMutation.mutate({
        amount: loadAmount,
        paymentMethod: paymentMethod,
        bankAccount: userAccountNumber,
        transferScreenshot: base64Screenshot,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined
      });
    };
    reader.readAsDataURL(screenshotFile);
  };

  const handleTransferCredit = () => {
    if (!transferAmount || !transferRecipient) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    transferCreditMutation.mutate({
      amount: transferAmount,
      toAdminId: parseInt(transferRecipient),
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = shopStats as any || {};
  const balance = creditBalance as any || {};
  const employeeList = employees as any[] || [];
  const userAccountNumber = (user as any).accountNumber || `ACC${String(user.id).padStart(6, '0')}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader user={user} onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your shop operations and employees</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="credit-history">Credit History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Error handling for overview data */}
            {(employeesError || statsError || balanceError) && (
              <div className="space-y-2">
                {employeesError && (
                  <ErrorDisplay 
                    error={employeesError} 
                    title="Failed to load employees" 
                    onRetry={refetchEmployees}
                  />
                )}
                {statsError && (
                  <ErrorDisplay 
                    error={statsError} 
                    title="Failed to load shop statistics" 
                  />
                )}
                {balanceError && (
                  <ErrorDisplay 
                    error={balanceError} 
                    title="Failed to load credit balance" 
                    onRetry={refetchBalance}
                  />
                )}
              </div>
            )}
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Shop Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <LoadingState message="Loading revenue..." />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ETB {stats.totalRevenue || '0'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This month
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  {employeesLoading ? (
                    <LoadingState message="Loading employees..." />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{employeeList.length || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Active staff members
                      </p>
                    </>
                  )}
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
                  {balanceLoading ? (
                    <LoadingState message="Loading balance..." />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ETB {typeof creditBalance === 'string' ? parseFloat(creditBalance).toLocaleString() : '0.00'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available credits
                      </p>
                    </>
                  )}
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
                        <span className="font-mono">{userAccountNumber}</span>
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
                    <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Load Credits
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Load Credits</DialogTitle>
                          <DialogDescription>
                            Request to load credits into your account. All requests require approval.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="loadAmount">Amount (ETB)</Label>
                            <Input
                              id="loadAmount"
                              type="number"
                              placeholder="Enter amount"
                              value={loadAmount}
                              onChange={(e) => setLoadAmount(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="paymentMethod">Payment Method</Label>
                            <select
                              id="paymentMethod"
                              className="w-full p-2 border rounded"
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="telebirr">TeleBirr</option>
                              <option value="cash">Cash</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                            <Input
                              id="referenceNumber"
                              placeholder="Enter transaction reference"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                          </div>
                          <div>
                            <FileUpload
                              label="Bank Transfer Screenshot"
                              onFileSelect={(file) => setScreenshotFile(file)}
                              onFileRemove={() => setScreenshotFile(null)}
                              selectedFile={screenshotFile}
                              accept="image/*"
                              maxSize={5}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                              Upload proof of bank transfer to your account: {userAccountNumber}
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="notes">Additional Notes (Optional)</Label>
                            <textarea
                              id="notes"
                              className="w-full p-2 border rounded h-16"
                              placeholder="Any additional information about this request"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowLoadDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleLoadCredit}
                              disabled={loadCreditMutation.isPending}
                            >
                              {loadCreditMutation.isPending ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" size="lg">
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Transfer Credits
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Transfer Credits</DialogTitle>
                          <DialogDescription>
                            Transfer credits to another admin account.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="transferAmount">Amount (ETB)</Label>
                            <Input
                              id="transferAmount"
                              type="number"
                              placeholder="Enter amount"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="recipient">Recipient Admin ID</Label>
                            <Input
                              id="recipient"
                              type="number"
                              placeholder="Enter admin ID"
                              value={transferRecipient}
                              onChange={(e) => setTransferRecipient(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowTransferDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleTransferCredit}
                              disabled={transferCreditMutation.isPending}
                            >
                              {transferCreditMutation.isPending ? "Transferring..." : "Transfer"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-4">Account Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Account Number:</span>
                        <span className="font-mono">{userAccountNumber}</span>
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

          <TabsContent value="credit-history" className="space-y-6">
            <AdminCreditLoadHistory />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettings userRole="admin" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}