import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/dashboard";
import InvoiceList from "@/pages/invoices/index";
import InvoiceEditor from "@/pages/invoices/editor";
import CustomerList from "@/pages/customers/index";
import CustomerForm from "@/pages/customers/form";
import CustomerDetail from "@/pages/customers/detail";
import VehicleList from "@/pages/vehicles/index";
import VehicleForm from "@/pages/vehicles/form";
import VehicleDetail from "@/pages/vehicles/detail";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />

        {/* Invoices */}
        <Route path="/invoices" component={InvoiceList} />
        <Route path="/invoices/new" component={() => <InvoiceEditor />} />
        <Route path="/invoices/:id/edit" component={({ params }) => <InvoiceEditor id={parseInt(params.id)} />} />
        <Route path="/invoices/:id" component={({ params }) => <InvoiceEditor id={parseInt(params.id)} />} />

        {/* Customers */}
        <Route path="/customers" component={CustomerList} />
        <Route path="/customers/new" component={() => <CustomerForm />} />
        <Route path="/customers/:id/edit" component={({ params }) => <CustomerForm id={parseInt(params.id)} />} />
        <Route path="/customers/:id" component={({ params }) => <CustomerDetail id={parseInt(params.id)} />} />

        {/* Vehicles */}
        <Route path="/vehicles" component={VehicleList} />
        <Route path="/vehicles/new" component={() => <VehicleForm />} />
        <Route path="/vehicles/:id/edit" component={({ params }) => <VehicleForm id={parseInt(params.id)} />} />
        <Route path="/vehicles/:id" component={({ params }) => <VehicleDetail id={parseInt(params.id)} />} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    let cancelled = false;
    fetch(`${base}/api/auth/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { authed?: boolean }) => {
        if (cancelled) return;
        setState(d.authed ? "in" : "out");
      })
      .catch(() => !cancelled && setState("out"));
    return () => { cancelled = true; };
  }, [base]);

  if (state === "loading") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#1f242b", color: "#9ca3af",
        fontSize: 13, fontFamily: "system-ui, sans-serif",
      }}>
        Laddar…
      </div>
    );
  }
  if (state === "out") {
    return <LoginPage onLoggedIn={() => setState("in")} />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthGate>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
