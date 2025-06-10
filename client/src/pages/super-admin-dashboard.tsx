import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Eye, Check, X, Calendar, Filter } from "lucide-react";

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

  // Fetch data
  const { data: revenues = [] } = useQuery({
    queryKey: ["/api/super-admin/revenues"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/revenues");
      if (!response.ok) throw new Error("Failed to fetch revenues");
      return response.json();
    },
  });

  const { data: totalRevenue = { total: "0" } } = useQuery({
    queryKey: ["/api/super-admin/revenue-total"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/revenue-total");
      if (!response.ok) throw new Error("Failed to fetch total revenue");
      return response.json();
    },
  });

  const { data: dailySummaries = [] } = useQuery({
    queryKey: ["/api/super-admin/daily-summaries"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/daily-summaries");
      if (!response.ok) throw new Error("Failed to fetch daily summaries");
      return response.json();
    },
  });

  const { data: creditLoads = [] } = useQuery({
    queryKey: ["/api/admin/credit-loads"],
    queryFn: async () => {
      const response = await fetch("/api/admin/credit-loads");
      if (!response.ok) throw new Error("Failed to fetch credit loads");
      return response.json();
    },
  });

  const { data: withdrawalRequests = [] } = useQuery({
    queryKey: ["/api/withdrawal-requests"],
    queryFn: async () => {
      const response = await fetch("/api/withdrawal-requests");
      if (!response.ok) throw new Error("Failed to fetch withdrawal requests");
      return response.json();
    },
  });

  const { data: allAdmins = [] } = useQuery({
    queryKey: ["/api/super-admin/admins"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/admins");
      if (!response.ok) throw new Error("Failed to fetch admins");
      return response.json();
    },
  });

  // Admin Form Component
  const AdminForm = ({ admin, onSubmit, onCancel, isSubmitting }: {
    admin?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isSubmitting: boolean;
  }) => {
    const [formData, setFormData] = useState({
      name: admin?.name || '',
      username: admin?.username || '',
      password: '',
      shopName: admin?.shopName || '',
      commissionRate: admin?.commissionRate || '15',
      referredBy: admin?.referredBy || '',
    });

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Admin Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Full Name"
            className="h-9"
          />
        </div>
        
        <div>
          <Label>Username</Label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Login Username"
            disabled={!!admin}
            className="h-9"
          />
        </div>

        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={admin ? "Leave blank to keep current" : "New Password"}
            className="h-9"
          />
        </div>

        <div>
          <Label>Shop Name</Label>
          <Input
            value={formData.shopName}
            onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
            placeholder="Shop/Branch Name"
            className="h-9"
          />
        </div>

        <div>
          <Label>Commission Rate (%)</Label>
          <Input
            type="number"
            value={formData.commissionRate}
            onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
            placeholder="15"
            min="0"
            max="100"
            className="h-9"
          />
        </div>

        <div>
          <Label>Referred By (Optional)</Label>
          <select 
            value={formData.referredBy}
            onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
            className="w-full h-9 px-3 border border-gray-300 rounded-md text-sm"
          >
            <option value="">No Referrer</option>
            {allAdmins.map((a: any) => (
              <option key={a.id} value={a.id}>{a.name} ({a.username})</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex gap-2 pt-2">
          <Button
            onClick={() => onSubmit(formData)}
            disabled={isSubmitting}
            className="flex-1 h-9"
          >
            {isSubmitting ? "Saving..." : admin ? "Update Admin" : "Create Admin"}
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1 h-9"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Create Admin Mutation
  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      setShowAddAdmin(false);
      toast({
        title: "Success",
        description: "Admin created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update Admin Mutation
  const updateAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/super-admin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      setEditingAdmin(null);
      toast({
        title: "Success",
        description: "Admin updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => `${parseFloat(amount).toFixed(2)} ETB`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
          <Button onClick={onLogout} variant="outline">
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="admins">Admin Management</TabsTrigger>
            <TabsTrigger value="credits">Credit Loads</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalRevenue.total)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allAdmins.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Games Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dailySummaries.length > 0 ? dailySummaries[0].totalGamesPlayed : 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="admins" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Admin Management</h2>
              <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                  </DialogHeader>
                  <AdminForm
                    onSubmit={(data) => createAdminMutation.mutate(data)}
                    onCancel={() => setShowAddAdmin(false)}
                    isSubmitting={createAdminMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {allAdmins.map((admin: any) => (
                <Card key={admin.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{admin.name}</h3>
                        <p className="text-sm text-gray-600">@{admin.username}</p>
                        <p className="text-sm text-gray-600">Shop: {admin.shopName || 'Not assigned'}</p>
                        <p className="text-sm text-gray-600">Commission: {admin.commissionRate}%</p>
                        {admin.referredBy && (
                          <p className="text-sm text-green-600">Referred by: {admin.referrerName}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={admin.isBlocked ? "destructive" : "default"}>
                          {admin.isBlocked ? "Blocked" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}