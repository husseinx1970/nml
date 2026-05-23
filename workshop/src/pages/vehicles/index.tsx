import { useState } from "react";
import { Link } from "wouter";
import { useListVehicles, useDeleteVehicle, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

export default function VehicleList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useListVehicles(
    { search: search || undefined },
    { query: { queryKey: getListVehiclesQueryKey({ search: search || undefined }) } }
  );

  const deleteMutation = useDeleteVehicle();

  const handleDelete = (e: React.MouseEvent, id: number, reg: string) => {
    e.stopPropagation();
    if (!confirm(`Ta bort fordon "${reg}"? Åtgärden kan inte ångras.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Fordon</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Laddar..." : `${vehicles?.length ?? 0} registrerade fordon`}
          </p>
        </div>
        <Link href="/vehicles/new">
          <button className="btn btn-primary btn-lg" data-testid="button-new-vehicle">
            <Plus size={15} strokeWidth={2} />
            Nytt fordon
          </button>
        </Link>
      </div>

      <div className="p-5">
        <div className="relative mb-4 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Sök reg.nr, märke, modell, VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input pl-8"
            data-testid="input-search-vehicle"
          />
        </div>

        <div className="panel overflow-hidden">
          <table className="data-table" data-testid="table-vehicles">
            <thead>
              <tr>
                <th>Reg.nr</th>
                <th>Märke / Modell</th>
                <th>Årsmodell</th>
                <th>Bränsle</th>
                <th className="num">Mätarst.</th>
                <th>Kund</th>
                <th>VIN (sista 8)</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="no-pointer">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j}><div className="skel h-3.5 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && (vehicles ?? []).map((v) => (
                <tr
                  key={v.id}
                  onClick={() => window.location.href = `/vehicles/${v.id}`}
                  data-testid={`row-vehicle-${v.id}`}
                >
                  <td>
                    <Link
                      href={`/vehicles/${v.id}`}
                      className="font-mono font-bold hover:underline tracking-wider"
                      style={{ color: "hsl(var(--primary))" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {v.registrationNumber}
                    </Link>
                  </td>
                  <td>
                    <p className="font-medium">{[v.make, v.model].filter(Boolean).join(" ") || "—"}</p>
                  </td>
                  <td className="font-mono text-xs">{v.year ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{v.fuelType ?? "—"}</td>
                  <td className="num font-mono text-xs">
                    {v.mileage != null ? `${v.mileage.toLocaleString("sv-SE")} km` : "—"}
                  </td>
                  <td className="text-xs text-muted-foreground">{(v as any).customerName ?? "—"}</td>
                  <td className="font-mono text-xs text-muted-foreground">
                    {v.vin ? v.vin.slice(-8) : "—"}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Link href={`/vehicles/${v.id}`}>
                        <button className="btn btn-ghost btn-sm" title="Redigera" data-testid={`button-edit-vehicle-${v.id}`}>
                          <Pencil size={12} />
                        </button>
                      </Link>
                      <button
                        onClick={(e) => handleDelete(e, v.id, v.registrationNumber)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "hsl(var(--destructive))" }}
                        title="Ta bort fordon"
                        data-testid={`button-delete-vehicle-${v.id}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (vehicles ?? []).length === 0 && (
                <tr className="no-pointer">
                  <td colSpan={8} className="py-14 text-center text-muted-foreground">
                    <p className="font-medium mb-1">Inga fordon hittades</p>
                    <p className="text-xs mb-3">
                      {search ? "Prova ett annat sökord" : "Registrera ditt första fordon för att komma igång"}
                    </p>
                    <Link href="/vehicles/new">
                      <button className="btn btn-primary btn-sm">
                        <Plus size={13} /> Nytt fordon
                      </button>
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
