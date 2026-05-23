import { useGetDashboardStats, useGetRecentInvoices, useGetRevenueByMonth } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, formatDate, monthName } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from "recharts";
import {
  Users, Truck, FileText, TrendingUp,
  AlertTriangle, Clock, CheckCircle2, FilePlus, ArrowRight
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent } = useGetRecentInvoices({ limit: 10 });
  const { data: revenue } = useGetRevenueByMonth();

  const chartData = (revenue ?? []).map((r) => ({
    name: monthName(r.month),
    intäkt: Number(r.revenue),
    count: r.invoiceCount,
  }));

  const maxVal = Math.max(...chartData.map((d) => d.intäkt), 1);

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Översikt</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Utby Snabb Bilservice — Göteborg</p>
        </div>
        <Link href="/invoices/new">
          <button className="btn btn-primary btn-lg" data-testid="button-new-invoice">
            <FilePlus size={15} strokeWidth={2} />
            Ny faktura
          </button>
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Totalt kunder",
              value: stats?.totalCustomers ?? 0,
              icon: Users,
              sub: "registrerade kunder",
              href: "/customers",
              color: "hsl(218 50% 44%)",
            },
            {
              label: "Totalt fordon",
              value: stats?.totalVehicles ?? 0,
              icon: Truck,
              sub: "registrerade fordon",
              href: "/vehicles",
              color: "hsl(218 50% 44%)",
            },
            {
              label: "Fakturor utfärdade",
              value: stats?.totalInvoices ?? 0,
              icon: FileText,
              sub: "totalt antal",
              href: "/invoices",
              color: "hsl(var(--primary))",
            },
            {
              label: "Betalda intäkter",
              value: formatCurrency(stats?.totalRevenue ?? 0),
              icon: TrendingUp,
              sub: "ackumulerat inkl. moms",
              href: "/invoices?status=paid",
              color: "hsl(145 55% 30%)",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.label} href={card.href}>
                <div className="stat-card group cursor-pointer">
                  {statsLoading ? (
                    <div className="space-y-2">
                      <div className="skel h-3 w-20" />
                      <div className="skel h-7 w-28" />
                      <div className="skel h-3 w-16" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <p className="stat-card-label">{card.label}</p>
                        <Icon size={16} style={{ color: card.color, opacity: 0.7 }} />
                      </div>
                      <p className="stat-card-value" style={{ color: card.color }}>{card.value}</p>
                      <p className="stat-card-sub">{card.sub}</p>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Invoice status strip */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            {
              label: "Utkast",
              count: stats?.draftCount ?? 0,
              status: "draft",
              icon: FileText,
              desc: "ej skickade",
            },
            {
              label: "Skickade",
              count: stats?.sentCount ?? 0,
              status: "sent",
              icon: Clock,
              desc: "väntar betalning",
            },
            {
              label: "Betalda",
              count: stats?.paidCount ?? 0,
              status: "paid",
              icon: CheckCircle2,
              desc: "avklarade",
            },
            {
              label: "Förfallna",
              count: stats?.overdueCount ?? 0,
              status: "overdue",
              icon: AlertTriangle,
              desc: "kräver åtgärd",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.status} href={`/invoices?status=${s.status}`}>
                <div
                  className="bg-card border border-card-border rounded-md px-3 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums">{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Chart + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Revenue chart */}
          <div className="panel lg:col-span-3">
            <div className="panel-header">
              <p className="panel-title">Intäkter per månad (SEK)</p>
              <p className="text-xs text-muted-foreground">Senaste 12 månader</p>
            </div>
            <div className="p-4">
              {chartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Ingen data tillgänglig ännu</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={196}>
                  <BarChart data={chartData} barSize={22} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="hsl(214 18% 88%)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(214 14% 46%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(214 14% 46%)" }}
                      tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), "Intäkt"]}
                      labelStyle={{ fontSize: 11, fontWeight: 600 }}
                      contentStyle={{
                        fontSize: 11,
                        border: "1px solid hsl(214 18% 82%)",
                        borderRadius: 4,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="intäkt" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.intäkt === maxVal
                              ? "hsl(38 96% 54%)"
                              : "hsl(38 96% 54% / 0.45)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent invoices */}
          <div className="panel lg:col-span-2 flex flex-col">
            <div className="panel-header">
              <p className="panel-title">Senaste fakturor</p>
            </div>
            <div className="flex-1 divide-y divide-border/70">
              {(recent ?? []).slice(0, 7).map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`}>
                  <div
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                    data-testid={`row-recent-invoice-${inv.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.customerName ?? "—"}</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-xs font-semibold tabular-nums mb-0.5">{formatCurrency(inv.total)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                </Link>
              ))}
              {(recent ?? []).length === 0 && (
                <p className="px-4 py-8 text-sm text-center text-muted-foreground">Inga fakturor ännu</p>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border/70">
              <Link href="/invoices" className="text-xs font-semibold flex items-center gap-1" style={{ color: "hsl(var(--primary))" }}>
                Visa alla fakturor <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Ny kund", href: "/customers/new", sub: "Lägg till kundkort" },
            { label: "Nytt fordon", href: "/vehicles/new", sub: "Registrera fordon" },
            { label: "Alla fakturor", href: "/invoices", sub: "Hantera fakturor" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="panel px-4 py-3 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
