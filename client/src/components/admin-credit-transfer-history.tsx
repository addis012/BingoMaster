import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface CreditTransfer {
  id: number;
  fromAdminId: number;
  toAdminId: number;
  amount: string;
  description?: string;
  status: string;
  createdAt: string;
  fromAdmin?: {
    name: string;
    username: string;
    accountNumber: string;
  };
  toAdmin?: {
    name: string;
    username: string;
    accountNumber: string;
  };
}

interface AdminCreditTransferHistoryProps {
  adminId: number;
}

export function AdminCreditTransferHistory({ adminId }: AdminCreditTransferHistoryProps) {
  const { data: transfers = [], isLoading, refetch } = useQuery({
    queryKey: ['credit-transfers', adminId],
    queryFn: async () => {
      const response = await fetch(`/api/credit/transfers`);
      if (!response.ok) throw new Error('Failed to fetch credit transfers');
      return response.json();
    }
  });

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const getTransferIcon = (transfer: CreditTransfer) => {
    const isReceived = transfer.toAdminId === adminId;
    return isReceived ? (
      <ArrowDownLeft className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  const getTransferLabel = (transfer: CreditTransfer) => {
    const isReceived = transfer.toAdminId === adminId;
    return isReceived ? "Received" : "Sent";
  };

  const getTransferDetails = (transfer: CreditTransfer) => {
    const isReceived = transfer.toAdminId === adminId;
    if (isReceived) {
      return {
        label: "From",
        name: transfer.fromAdmin?.name || "Unknown",
        accountNumber: transfer.fromAdmin?.accountNumber || "N/A"
      };
    } else {
      return {
        label: "To",
        name: transfer.toAdmin?.name || "Unknown",
        accountNumber: transfer.toAdmin?.accountNumber || "N/A"
      };
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading Transfer History...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 h-16 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Credit Transfer History
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No credit transfers found.
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer: CreditTransfer) => {
              const details = getTransferDetails(transfer);
              const isReceived = transfer.toAdminId === adminId;
              
              return (
                <div
                  key={transfer.id}
                  className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTransferIcon(transfer)}
                      <Badge className={isReceived ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {getTransferLabel(transfer)}
                      </Badge>
                      <span className={`font-semibold text-lg ${isReceived ? 'text-green-600' : 'text-red-600'}`}>
                        {isReceived ? '+' : '-'} {formatAmount(transfer.amount)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(new Date(transfer.createdAt), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{details.label}: </span>
                      <span className="font-medium">{details.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Account: </span>
                      <span className="font-mono text-xs">{details.accountNumber}</span>
                    </div>
                  </div>
                  
                  {transfer.description && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Note: </span>
                      <span>{transfer.description}</span>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Transfer ID: #{transfer.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}