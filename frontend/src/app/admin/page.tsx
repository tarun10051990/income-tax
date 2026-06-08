"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card, { CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

const MOCK_STATS = {
  totalUsers: 15420,
  activeFilings: 8235,
  completedFilings: 5120,
  totalRevenue: 2540000,
  avgFilingTime: "8.5 min",
  refundsProcessed: 3200,
};

const RECENT_USERS = [
  { name: "Priya Singh", email: "priya@email.com", status: "filing", itrType: "ITR-1", date: "2025-07-14" },
  { name: "Amit Kumar", email: "amit@email.com", status: "completed", itrType: "ITR-1", date: "2025-07-14" },
  { name: "Sneha Patel", email: "sneha@email.com", status: "review", itrType: "ITR-2", date: "2025-07-13" },
  { name: "Rajesh Gupta", email: "rajesh@email.com", status: "completed", itrType: "ITR-1", date: "2025-07-13" },
  { name: "Meera Nair", email: "meera@email.com", status: "draft", itrType: "ITR-4", date: "2025-07-12" },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    if (user?.role !== "admin") { router.push("/dashboard"); return; }
  }, [isAuthenticated, user, router]);

  if (user?.role !== "admin") return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted mt-1">Platform overview and management</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/users">
            <button className="text-sm px-4 py-2 bg-surface border border-border rounded-lg hover:bg-gray-50 transition-colors">
              Manage Users
            </button>
          </Link>
          <Link href="/admin/rules">
            <button className="text-sm px-4 py-2 bg-surface border border-border rounded-lg hover:bg-gray-50 transition-colors">
              Tax Rules
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={formatNumber(MOCK_STATS.totalUsers)} change="+12%" />
        <StatCard label="Active Filings" value={formatNumber(MOCK_STATS.activeFilings)} change="+8%" />
        <StatCard label="Completed Filings" value={formatNumber(MOCK_STATS.completedFilings)} change="+15%" />
        <StatCard label="Revenue" value={formatCurrency(MOCK_STATS.totalRevenue)} change="+22%" />
        <StatCard label="Avg Filing Time" value={MOCK_STATS.avgFilingTime} change="-2.5min" />
        <StatCard label="Refunds Processed" value={formatNumber(MOCK_STATS.refundsProcessed)} change="+10%" />
      </div>

      {/* Charts / Analytics Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card variant="bordered">
          <CardTitle>Filing Trend (Last 7 Days)</CardTitle>
          <div className="mt-4 h-48 flex items-end gap-2">
            {[65, 45, 78, 52, 90, 72, 85].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/40"
                  style={{ height: `${(val / 100) * 180}px` }}
                />
                <span className="text-xs text-muted">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="bordered">
          <CardTitle>ITR Type Distribution</CardTitle>
          <div className="mt-4 space-y-4">
            {[
              { type: "ITR-1 (Sahaj)", pct: 72, color: "bg-primary" },
              { type: "ITR-2", pct: 15, color: "bg-secondary" },
              { type: "ITR-3", pct: 8, color: "bg-accent" },
              { type: "ITR-4 (Sugam)", pct: 5, color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.type}</span>
                  <span className="font-medium">{item.pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-full rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Users */}
      <Card variant="bordered">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Users</CardTitle>
          <Link href="/admin/users">
            <button className="text-sm text-primary hover:underline">View All</button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-muted">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted">ITR Type</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_USERS.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-muted">{u.email}</td>
                  <td className="py-3 px-4">{u.itrType}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        u.status === "completed" ? "success" :
                        u.status === "filing" ? "info" :
                        u.status === "review" ? "warning" : "default"
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted">{u.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, change }: { label: string; value: string; change: string }) {
  const isPositive = change.startsWith("+") || change.startsWith("-");
  return (
    <Card variant="bordered">
      <p className="text-sm text-muted">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold">{value}</p>
        <span className={`text-xs font-medium ${isPositive ? "text-secondary" : "text-muted"}`}>
          {change}
        </span>
      </div>
    </Card>
  );
}
