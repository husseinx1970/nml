import { useState } from "react";
import { Link } from "wouter";
import { useListCustomers, useDeleteCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Pencil, Trash2 } from "lucide-react";

export default function CustomerList() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useListCustomers(
    { search: search || undefined },
    { query: { queryKey: getListCustomersQueryKey({ search: search || undefined }) } }
  );

  const deleteMutation = useDeleteCustomer();

  const handleDelete = (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!confirm(`Ta bort kund "${name}"? Åtgärden kan inte ångras.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }),
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Kunder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Laddar..." : `${customers?.length ?? 0} registrerade kunder`}
          </p>
        </div>
        <Link href="/customers/new">
          <button className="btn btn-primary btn-lg" data-testid="button-new-customer">
            <UserPlus size={15} strokeWidth={2} />
            Ny kund
          </button>
        </Link>
      </div>

      <div className="p-5">
        <div className="relative mb-4 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Sök kund (namn, e-post, telefon)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input pl-8"
            data-testid="input-search-customer"
          />
        </div>

        <div className="panel overflow-hidden">
          <table className="data-table" data-testid="table-customers">
            <thead>
              <tr>
                <th>Namn</th>
                <th>Org.nr</th>
                <th>Telefon</th>
                <th>E-post</th>
                <th>Adress</th>
                <th>Stad</th>
                <th>Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="no-pointer">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}><div className="skel h-3.5 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && (customers ?? []).map((c) => (
                <tr
                  key={c.id}
                  onClick={() => window.location.href = `/customers/${c.id}`}
                  data-testid={`row-customer-${c.id}`}
                >
                  <td>
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-semibold hover:underline"
                      style={{ color: "hsl(var(--primary))" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{c.organizationNumber ?? "—"}</td>
                  <td className="text-xs">{c.phone ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{c.address ?? "—"}</td>
                  <td className="text-xs">{c.city ?? "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Link href={`/customers/${c.id}`}>
                        <button className="btn btn-ghost btn-sm" title="Redigera" data-testid={`button-edit-customer-${c.id}`}>
                          <Pencil size={12} />
                        </button>
                      </Link>
                      <button
                        onClick={(e) => handleDelete(e, c.id, c.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "hsl(var(--destructive))" }}
                        title="Ta bort kund"
                        data-testid={`button-delete-customer-${c.id}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (customers ?? []).length === 0 && (
                <tr className="no-pointer">
                  <td colSpan={7} className="py-14 text-center text-muted-foreground">
                    <p className="font-medium mb-1">Inga kunder hittades</p>
                    <p className="text-xs mb-3">
                      {search ? "Prova ett annat sökord" : "Lägg till din första kund för att komma igång"}
                    </p>
                    <Link href="/customers/new">
                      <button className="btn btn-primary btn-sm">
                        <UserPlus size={13} /> Ny kund
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
