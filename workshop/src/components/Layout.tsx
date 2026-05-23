import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Users, Truck,
  Plus, Settings, Wrench
} from "lucide-react";

const NAV_MAIN = [
  { href: "/", label: "Översikt", icon: LayoutDashboard, exact: true },
  { href: "/invoices", label: "Fakturor", icon: FileText },
  { href: "/customers", label: "Kunder", icon: Users },
  { href: "/vehicles", label: "Fordon", icon: Truck },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 shrink-0"
        style={{ background: "hsl(var(--sidebar))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
      >
        {/* Brand */}
        <div
          className="px-4 pt-5 pb-4"
          style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
        >
          <div className="flex items-center gap-2.5 mb-0.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--sidebar-primary))" }}
            >
              <Wrench size={15} style={{ color: "hsl(var(--sidebar-primary-foreground))" }} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight tracking-tight" style={{ color: "hsl(var(--sidebar-primary))" }}>
                VERKSTADSSYSTEM
              </p>
              <p className="text-xs leading-tight" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.55 }}>
                v1.0
              </p>
            </div>
          </div>
          <p
            className="text-xs mt-3 font-medium leading-snug"
            style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.75 }}
          >
            Utby Snabb Bilservice
          </p>
        </div>

        {/* Quick action */}
        <div className="px-3 pt-3 pb-2">
          <Link href="/invoices/new">
            <button
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: "hsl(var(--sidebar-primary) / 0.14)",
                color: "hsl(var(--sidebar-primary))",
                border: "1px solid hsl(var(--sidebar-primary) / 0.25)",
              }}
              data-testid="sidebar-new-invoice"
            >
              <Plus size={12} strokeWidth={2.5} />
              Ny faktura
            </button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          <p
            className="px-2 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.35 }}
          >
            Meny
          </p>
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? location === "/"
              : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-item", active && "active")}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
