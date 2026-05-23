import { Link } from "wouter";
import {
  useGetVehicle, useListInvoices,
  getGetVehicleQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

interface Props { id: number }

export default function VehicleDetail({ id }: Props) {
  const { data: vehicle, isLoading } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) }
  });
  const { data: invoices } = useListInvoices({}, {
    query: { queryKey: getListInvoicesQueryKey() }
  });

  const vehicleInvoices = (invoices ?? []).filter(
    (inv) => inv.vehicleId === id || inv.registrationNumber === vehicle?.registrationNumber
  );

  if (isLoading) return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="h-4 bg-muted rounded w-48" />
      </div>
    </div>
  );

  if (!vehicle) return (
    <div className="p-6 text-center text-muted-foreground">Fordonet hittades inte.</div>
  );

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/vehicles" className="hover:underline">Fordon</Link>
        <span>/</span>
        <span className="font-mono font-bold">{vehicle.registrationNumber}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{vehicle.registrationNumber}</h1>
          <p className="text-sm text-muted-foreground">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}</p>
        </div>
        <Link href={`/vehicles/${id}/edit`}>
          <button className="px-3 py-1.5 rounded text-sm border hover:bg-muted transition-colors">Redigera</button>
        </Link>
      </div>

      <div className="rounded-md border bg-card p-4 grid grid-cols-2 gap-3 text-sm">
        {[
          { label: "VIN / Chassinummer", value: vehicle.vin },
          { label: "Bränsletyp", value: vehicle.fuelType },
          { label: "Motorinformation", value: vehicle.engineInfo },
          { label: "Mätarställning", value: vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("sv-SE")} km` : null },
          { label: "Första reg.datum", value: formatDate(vehicle.firstRegistrationDate) !== "-" ? formatDate(vehicle.firstRegistrationDate) : null },
          { label: "Anteckningar", value: vehicle.notes },
        ].filter((f) => f.value).map((f) => (
          <div key={f.label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</p>
            <p className="mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-2">Servicehistorik</h2>
        <div className="rounded-md border bg-card divide-y">
          {vehicleInvoices.map((inv) => (
            <Link key={inv.id} href={`/invoices/${inv.id}`}>
              <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer" data-testid={`row-invoice-${inv.id}`}>
                <div>
                  <p className="font-mono text-sm font-semibold">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)} — {inv.mechanic ?? ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-sm">{formatCurrency(inv.total)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            </Link>
          ))}
          {vehicleInvoices.length === 0 && (
            <p className="px-4 py-4 text-sm text-center text-muted-foreground">Ingen servicehistorik</p>
          )}
        </div>
      </div>
    </div>
  );
}
