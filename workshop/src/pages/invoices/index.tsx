import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useListInvoices, useDeleteInvoice, useUpdateInvoiceStatus, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, statusLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { FilePlus, Search, Pencil, Trash2, Send, CheckCircle } from "lucide-react";

const STATUSES = ["", "draft", "sent", "paid", "overdue", "cancelled"] as const;

export default function InvoiceList() {
  const search_ = useSearch();
  const params = new URLSearchParams(search_);
  const defaultStatus = params.get("status") ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useListInvoices(
    { search: search || undefined, status: (status as any) || undefined },
    { query: { queryKey: getListInvoicesQueryKey({ search: search || undefined, status: (status as any) || undefined }) } }
  );

  const deleteMutation = useDeleteInvoice();
  const statusMutation = useUpdateInvoiceStatus();

  const handleDelete = (e: React.MouseEvent, id: number, num: string) => {
    e.stopPropagation();
    if (!confirm(`Ta bort faktura ${num}? Åtgärden kan inte ångras.`)) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
    });
  };

  const handleStatusChange = (e: React.MouseEvent, id: number, newStatus: string) => {
    e.stopPropagation();
    statusMutation.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
    });
  };

  const total = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Fakturor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Laddar..." : `${invoices?.length ?? 0} fakturor`}
            {!isLoading && (invoices?.length ?? 0) > 0 && (
              <span className="ml-2 text-muted-foreground">
                · Totalt <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
              </span>
            )}
          </p>
        </div>
        <Link href="/invoices/new">
          <button className="btn btn-primary btn-lg" data-testid="button-new-invoice">
            <FilePlus size={15} strokeWidth={2} />
            Ny faktura
          </button>
        </Link>
      </div>

      <div className="p-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Sök fakturanr, kund, reg.nr..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-input pl-8"
              data-testid="input-search-invoice"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map((s) => {
              const active = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                  data-testid={`filter-status-${s || "all"}`}
                >
                  {s ? statusLabel(s) : "Alla"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table" data-testid="table-invoices">
              <thead>
                <tr>
                  <th>Fakturanr</th>
                  <th>Order/Ref</th>
                  <th>Kund</th>
                  <th>Reg.nr</th>
                  <th>Fakturadatum</th>
                  <th>Förfaller</th>
                  <th className="num">Netto</th>
                  <th className="num">Moms</th>
                  <th className="num">Inkl. moms</th>
                  <th>Status</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="no-pointer">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j}><div className="skel h-3.5 w-full" /></td>
                    ))}
                  </tr>
                ))}

                {!isLoading && (invoices ?? []).map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => window.location.href = `/invoices/${inv.id}`}
                    data-testid={`row-invoice-${inv.id}`}
                  >
                    <td>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono font-bold text-xs hover:underline"
                        style={{ color: "hsl(var(--primary))" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="text-xs text-muted-foreground font-mono">
                      {inv.orderNumber ?? "—"}
                    </td>
                    <td>
                      <p className="font-medium text-sm truncate max-w-[170px]">{inv.customerName ?? "—"}</p>
                    </td>
                    <td className="font-mono text-xs font-semibold">{inv.registrationNumber ?? "—"}</td>
                    <td className="text-xs tabular-nums">{formatDate(inv.invoiceDate)}</td>
                    <td className={`text-xs tabular-nums ${inv.status === "overdue" ? "font-semibold text-destructive" : ""}`}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="num text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(Number(inv.subtotal))}
                    </td>
                    <td className="num text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(Number(inv.vatAmount))}
                    </td>
                    <td className="num text-sm font-semibold tabular-nums">
                      {formatCurrency(inv.total)}
                    </td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Link href={`/invoices/${inv.id}`}>
                          <button className="btn btn-ghost btn-sm" title="Redigera" data-testid={`button-edit-invoice-${inv.id}`}>
                            <Pencil size={12} />
                          </button>
                        </Link>
                        {inv.status === "draft" && (
                          <button
                            onClick={(e) => handleStatusChange(e, inv.id, "sent")}
                            className="btn btn-sm"
                            style={{ color: "hsl(213 80% 36%)", border: "1px solid hsl(213 80% 82%)", background: "hsl(213 80% 96%)" }}
                            title="Markera som skickad"
                            data-testid={`button-send-invoice-${inv.id}`}
                          >
                            <Send size={11} />
                            <span className="hidden sm:inline">Skicka</span>
                          </button>
                        )}
                        {inv.status === "sent" && (
                          <button
                            onClick={(e) => handleStatusChange(e, inv.id, "paid")}
                            className="btn btn-sm"
                            style={{ color: "hsl(145 55% 28%)", border: "1px solid hsl(145 55% 78%)", background: "hsl(145 55% 94%)" }}
                            title="Markera som betald"
                            data-testid={`button-pay-invoice-${inv.id}`}
                          >
                            <CheckCircle size={11} />
                            <span className="hidden sm:inline">Betald</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, inv.id, inv.invoiceNumber)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "hsl(var(--destructive))" }}
                          title="Ta bort faktura"
                          data-testid={`button-delete-invoice-${inv.id}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!isLoading && (invoices ?? []).length === 0 && (
                  <tr className="no-pointer">
                    <td colSpan={11} className="py-14 text-center text-muted-foreground">
                      <p className="font-medium mb-1">Inga fakturor hittades</p>
                      <p className="text-xs mb-3">
                        {search || status ? "Prova att ändra sökfilter" : "Kom igång genom att skapa din första faktura"}
                      </p>
                      <Link href="/invoices/new">
                        <button className="btn btn-primary btn-sm">
                          <FilePlus size={13} />
                          Ny faktura
                        </button>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Summary row */}
              {!isLoading && (invoices ?? []).length > 1 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid hsl(var(--border))", background: "hsl(210 14% 97%)" }}>
                    <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                      Totalt {invoices?.length} fakturor
                    </td>
                    <td className="num px-4 py-2 text-xs font-semibold tabular-nums text-muted-foreground">
                      {formatCurrency((invoices ?? []).reduce((s, i) => s + Number(i.subtotal), 0))}
                    </td>
                    <td className="num px-4 py-2 text-xs font-semibold tabular-nums text-muted-foreground">
                      {formatCurrency((invoices ?? []).reduce((s, i) => s + Number(i.vatAmount), 0))}
                    </td>
                    <td className="num px-4 py-2 text-sm font-bold tabular-nums">
                      {formatCurrency(total)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
