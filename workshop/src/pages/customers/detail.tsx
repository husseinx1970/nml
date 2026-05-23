import { Link } from "wouter";
import {
  useGetCustomer, useListVehicles, useListInvoices,
  getGetCustomerQueryKey, getListVehiclesQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import CustomerForm from "./form";

interface Props { id: number }

export default function CustomerDetail({ id }: Props) {
  const { data: customer, isLoading } = useGetCustomer(id, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) }
  });
  const { data: vehicles } = useListVehicles({ customerId: id }, {
    query: { queryKey: getListVehiclesQueryKey({ customerId: id }) }
  });
  const { data: invoices } = useListInvoices({ customerId: id }, {
    query: { queryKey: getListInvoicesQueryKey({ customerId: id }) }
  });

  if (isLoading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
    </div>
  );

  if (!customer) return (
    <div className="p-6 text-center text-muted-foreground">Kunden hittades inte.</div>
  );

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
        <Link href="/customers" className="hover:underline">Kunder</Link>
        <span>/</span>
        <span>{customer.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{customer.name}</h1>
          {customer.organizationNumber && (
            <p className="text-sm text-muted-foreground font-mono">Org.nr {customer.organizationNumber}</p>
          )}
        </div>
        <Link href={`/customers/${id}/edit`}>
          <button className="px-3 py-1.5 rounded text-sm border hover:bg-muted transition-colors">Redigera</button>
        </Link>
      </div>

      {/* Info grid */}
      <div className="rounded-md border bg-card p-4 grid grid-cols-2 gap-3 text-sm">
        {[
          { label: "Telefon", value: customer.phone },
          { label: "E-post", value: customer.email },
          { label: "Adress", value: [customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ") },
          { label: "Referensperson", value: customer.reference },
          { label: "Anteckningar", value: customer.notes },
        ].map((f) => f.value ? (
          <div key={f.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</p>
            <p className="mt-0.5">{f.value}</p>
          </div>
        ) : null)}
      </div>

      {/* Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Fordon</h2>
          <Link href={`/vehicles/new?customerId=${id}`}>
            <button className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors">+ Lägg till fordon</button>
          </Link>
        </div>
        <div className="rounded-md border bg-card divide-y">
          {(vehicles ?? []).map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`}>
              <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer" data-testid={`row-vehicle-${v.id}`}>
                <div>
                  <p className="font-mono font-bold text-sm">{v.registrationNumber}</p>
                  <p className="text-xs text-muted-foreground">{[v.make, v.model, v.year].filter(Boolean).join(" ")}</p>
                </div>
                <p className="text-xs text-muted-foreground">{v.mileage != null ? `${v.mileage.toLocaleString("sv-SE")} km` : ""}</p>
              </div>
            </Link>
          ))}
          {(vehicles ?? []).length === 0 && (
            <p className="px-4 py-4 text-sm text-center text-muted-foreground">Inga fordon registrerade</p>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="font-semibold mb-2">Fakturor</h2>
        <div className="rounded-md border bg-card divide-y">
          {(invoices ?? []).map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer" data-testid={`row-invoice-${inv.id}`}>
                <div>
                  <p className="font-mono text-sm font-semibold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-sm">{formatCurrency(inv.total)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            </Link>
          ))}
          {(invoices ?? []).length === 0 && (
            <p className="px-4 py-4 text-sm text-center text-muted-foreground">Inga fakturor</p>
          )}
        </div>
      </div>
    </div>
  );
}
