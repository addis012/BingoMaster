import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Building2, Users, DollarSign, Grid3X3, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { UnifiedCartelaManager } from '@/components/unified-cartela-manager';

interface SimpleAdminDashboardFixedProps {
  onLogout: () => void;
}

export function SimpleAdminDashboardFixed({ onLogout }: SimpleAdminDashboardFixedProps) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  // All queries declared at top level unconditionally
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/admin/employees"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin')
  });

  const { data: shopStats } = useQuery({
    queryKey: ["/api/admin/shop-stats"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin')
  });

  const { data: creditBalance } = useQuery({
    queryKey: ["/api/credit/balance"],
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin')
  });

  // Early returns after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need admin privileges to access this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onLogout} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = shopStats as any || {};
  const balance = creditBalance as any || {};
  const employeeList = employees as any[] || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue || '0.00'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGames || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPlayers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance.balance || '0.00'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="cartelas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cartelas">Cartela Management</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="cartelas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5" />
                  Unified Cartela Management
                </CardTitle>
                <CardDescription>
                  Manage all cartelas for your shop - edit, update, and delete any cartela including previously fixed ones
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && user.shopId && (
                  <UnifiedCartelaManager 
                    shopId={user.shopId} 
                    adminId={user.id}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Management</CardTitle>
                <CardDescription>
                  Manage your shop employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employeeList.length > 0 ? (
                    employeeList.map((employee: any) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{employee.name}</h3>
                          <p className="text-sm text-gray-600">@{employee.username}</p>
                        </div>
                        <Badge variant="secondary">{employee.role}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">No employees found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Overview</CardTitle>
                <CardDescription>
                  Overview of your shop performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Shop ID</p>
                      <p className="text-2xl font-bold">{user.shopId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Account Number</p>
                      <p className="text-lg font-mono">{(user as any).accountNumber || 'N/A'}</p>
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