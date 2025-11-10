import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, DollarSign, MessageSquare, Mail } from "lucide-react";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  transactionType: 'purchase' | 'usage' | 'refund' | 'adjustment' | 'initial_grant';
  smsCredits: number;
  emailCredits: number;
  balanceAfterSms: number;
  balanceAfterEmail: number;
  amount: string | null;
  description: string | null;
  createdAt: string;
  package?: {
    name: string;
  };
}

interface CreditTransactionHistoryProps {
  limit?: number;
}

export function CreditTransactionHistory({ limit = 50 }: CreditTransactionHistoryProps) {
  const { data: transactions, isLoading } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/credits/transactions', limit],
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'usage':
        return <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'refund':
        return <RefreshCw className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'adjustment':
        return <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'initial_grant':
        return <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      default:
        return null;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700">Purchase</Badge>;
      case 'usage':
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">Usage</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">Refund</Badge>;
      case 'adjustment':
        return <Badge variant="outline">Adjustment</Badge>;
      case 'initial_grant':
        return <Badge variant="outline">Initial Grant</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="transaction-history-loading">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="transaction-history">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">SMS</TableHead>
                  <TableHead className="text-right">Email</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                    <TableCell className="text-sm" data-testid={`transaction-date-${transaction.id}`}>
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell data-testid={`transaction-type-${transaction.id}`}>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transactionType)}
                        {getTransactionBadge(transaction.transactionType)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" data-testid={`transaction-description-${transaction.id}`}>
                      {transaction.description || transaction.package?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`transaction-sms-${transaction.id}`}>
                      {transaction.smsCredits !== 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className={transaction.smsCredits > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400'}>
                            {transaction.smsCredits > 0 ? '+' : ''}{transaction.smsCredits}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`transaction-email-${transaction.id}`}>
                      {transaction.emailCredits !== 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <Mail className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span className={transaction.emailCredits > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400'}>
                            {transaction.emailCredits > 0 ? '+' : ''}{transaction.emailCredits}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`transaction-amount-${transaction.id}`}>
                      {transaction.amount ? `$${parseFloat(transaction.amount).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground" data-testid={`transaction-balance-${transaction.id}`}>
                      <div className="flex flex-col items-end gap-1">
                        {transaction.smsCredits !== 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{transaction.balanceAfterSms}</span>
                          </div>
                        )}
                        {transaction.emailCredits !== 0 && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span>{transaction.balanceAfterEmail}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Purchase credits or send messages to see your transaction history</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
