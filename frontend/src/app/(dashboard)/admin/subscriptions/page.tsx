"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api";
import type { ApiResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, DollarSign, Users, TrendingUp } from "lucide-react";

/**
 * Admin Subscriptions Page
 *
 * Overview of subscription metrics and recent transactions.
 * Read-only — no manual cancel/refund (use Stripe Dashboard for that).
 */

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeSubscribers: number;
  recentTransactions: {
    id: string;
    amount: number;
    currency: string;
    type: string;
    createdAt: string;
    user: { name: string | null; email: string };
  }[];
}

export default function AdminSubscriptionsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<ApiResponse<{ kpis: RevenueStats }>>(
          "/admin/dashboard",
        );
      return data.data.kpis;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscriptions & Billing</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.totalRevenue ?? 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.monthlyRevenue ?? 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Year
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.yearlyRevenue ?? 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeSubscribers ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.recentTransactions ||
          stats.recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium">
                            {txn.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {txn.user?.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {txn.currency} {txn.amount.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="text-xs">
                          {txn.type}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
