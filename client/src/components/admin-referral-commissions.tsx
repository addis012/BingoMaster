import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ReferralCommission {
  id: number;
  referrerId: number;
  referredId: number;
  sourceType: string;
  sourceId: number;
  sourceAmount: string;
  commissionRate: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
  processedAt?: string;
}

interface AdminReferralCommissionsProps {
  adminId: number;
}

export function AdminReferralCommissions({ adminId }: AdminReferralCommissionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['referral-commissions', adminId],
    queryFn: async () => {
      const response = await fetch(`/api/referral-commissions/${adminId}`);
      if (!response.ok) throw new Error('Failed to fetch referral commissions');
      return response.json();
    }
  });

  const processCommissionMutation = useMutation({
    mutationFn: async ({ commissionId, action }: { commissionId: number; action: 'withdraw' | 'convert_to_credit' }) => {
      const response = await fetch(`/api/referral-commissions/${commissionId}/${action}`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to process commission');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['referral-commissions'] });
      toast({
        title: "Success",
        description: variables.action === 'withdraw' 
          ? "Commission withdrawn successfully" 
          : "Commission converted to credit successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process commission",
        variant: "destructive"
      });
    }
  });

  const totalPendingCommissions = commissions
    .filter((c: ReferralCommission) => c.status === 'pending')
    .reduce((sum: number, c: ReferralCommission) => sum + parseFloat(c.commissionAmount), 0);

  const totalEarnedCommissions = commissions
    .reduce((sum: number, c: ReferralCommission) => sum + parseFloat(c.commissionAmount), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading referral commissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEarnedCommissions.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">All-time referral earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendingCommissions.toFixed(2)} ETB</div>
            <p className="text-xs text-muted-foreground">Available for withdrawal/conversion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referral commissions yet. Start referring admins to earn 3% commission on their deposits!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Deposit Amount</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Commission Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission: ReferralCommission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">Admin Deposit</span>
                        <span className="text-xs text-muted-foreground">
                          {commission.sourceType === 'credit_load' ? 'Credit Load' : commission.sourceType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{parseFloat(commission.sourceAmount).toFixed(2)} ETB</TableCell>
                    <TableCell>{commission.commissionRate}%</TableCell>
                    <TableCell className="font-medium">
                      {parseFloat(commission.commissionAmount).toFixed(2)} ETB
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          commission.status === 'pending' ? 'default' :
                          commission.status === 'paid' ? 'secondary' :
                          commission.status === 'converted_to_credit' ? 'outline' : 'destructive'
                        }
                      >
                        {commission.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {commission.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processCommissionMutation.mutate({
                              commissionId: commission.id,
                              action: 'withdraw'
                            })}
                            disabled={processCommissionMutation.isPending}
                          >
                            Withdraw
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => processCommissionMutation.mutate({
                              commissionId: commission.id,
                              action: 'convert_to_credit'
                            })}
                            disabled={processCommissionMutation.isPending}
                          >
                            Convert to Credit
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}