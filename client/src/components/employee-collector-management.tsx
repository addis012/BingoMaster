import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, UserCheck, Clock } from "lucide-react";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  shopId: number;
  supervisorId?: number;
  createdAt: string;
  isBlocked: boolean;
}

const createCollectorSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type CreateCollectorData = z.infer<typeof createCollectorSchema>;

export function EmployeeCollectorManagement({ user }: { user: User }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateCollectorData>({
    resolver: zodResolver(createCollectorSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
    },
  });

  // Get collectors under this employee
  const { data: collectors = [], isLoading } = useQuery({
    queryKey: [`/api/employees/${user.id}/collectors`],
  });

  // Create collector mutation
  const createCollectorMutation = useMutation({
    mutationFn: async (data: CreateCollectorData) => {
      const response = await fetch("/api/employees/create-collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create collector");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Collector created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${user.id}/collectors`] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create collector",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCollectorData) => {
    createCollectorMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collector Management</h2>
          <p className="text-gray-600">Manage cartela collectors under your supervision</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Collector
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collector</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="collector123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="collector@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCollectorMutation.isPending}
                  >
                    {createCollectorMutation.isPending ? "Creating..." : "Create Collector"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectors.length}</div>
            <p className="text-xs text-muted-foreground">Active collectors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collectors.filter((c: User) => !c.isBlocked).length}
            </div>
            <p className="text-xs text-muted-foreground">Working collectors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Additions</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collectors.filter((c: User) => {
                const created = new Date(c.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Collectors List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Collectors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading collectors...</div>
          ) : collectors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No collectors yet</h3>
              <p className="text-sm mb-4">Create your first collector to help with cartela collection.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Collector
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectors.map((collector: User) => (
                <Card key={collector.id} className="border-2">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{collector.name}</CardTitle>
                        <p className="text-sm text-gray-600">@{collector.username}</p>
                      </div>
                      <Badge 
                        variant={collector.isBlocked ? "destructive" : "default"}
                        className={collector.isBlocked ? "bg-red-500" : "bg-green-500"}
                      >
                        {collector.isBlocked ? "Blocked" : "Active"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Role:</span> Collector
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Shop:</span> {collector.shopId}
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Created:</span> {new Date(collector.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Stats
                      </Button>
                      <Button 
                        variant={collector.isBlocked ? "default" : "outline"} 
                        size="sm"
                        className="flex-1"
                      >
                        {collector.isBlocked ? "Unblock" : "Block"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}