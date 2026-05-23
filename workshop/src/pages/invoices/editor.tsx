import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { pdf } from "@react-pdf/renderer";
import {
  useGetInvoice, useCreateInvoice, useUpdateInvoice,
  useCreateInvoiceItem, useUpdateInvoiceItem, useDeleteInvoiceItem,
  useListCustomers, useListVehicles,
  getGetInvoiceQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, todayStr, addDays, itemTypeLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoicePdf, DOCUMENT_TYPE_LABELS, type DocumentType } from "@/components/InvoicePdf";

// Bump on HMR of InvoicePdf so the live preview rebuilds the blob
if (import.meta.hot) {
  import.meta.hot.accept("@/components/InvoicePdf", () => {
    window.dispatchEvent(new CustomEvent("invoice-pdf-hmr"));
  });
}
import {
  Download, Save, Copy, Trash2, ChevronUp, ChevronDown,
  Plus, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2
} from "lucide-react";

interface Props { id?: number }

const ITEM_TYPES = [
  "part","labor","oil","tire_fee","environmental_fee",
  "diagnostic","fixed_price","discount","other"
] as const;

const PAYMENT_TERMS = ["10 dagar","15 dagar","30 dagar","45 dagar","60 dagar","Mot förskott","Kontant"];
const MECHANICS = ["Anders Svensson","Maria Johansson","Erik Lindgren","Lars Petersson"];

interface LocalItem {
  id?: number;
  itemType: string;
  articleNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  lineTotal: number;
  mechanicName: string;
  sortOrder: number;
  _dirty?: boolean;
  _new?: boolean;
}

function calcLineTotal(qty: number, price: number, discount: number, vat: number): number {
  const net = qty * price * (1 - discount / 100);
  return net + net * (vat / 100);
}

function calcNet(qty: number, price: number, discount: number): number {
  return qty * price * (1 - discount / 100);
}

export default function InvoiceEditor({ id }: Props) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: invoice } = useGetInvoice(id!, {
    query: { enabled: !!id, queryKey: getGetInvoiceQueryKey(id!) }
  });
  const { data: customers } = useListCustomers();
  const { data: vehicles } = useListVehicles();

  const [documentType, setDocumentType] = useState<DocumentType>("faktura");
  const [fields, setFields] = useState({
    invoiceDate: todayStr(),
    dueDate: addDays(todayStr(), 30),
    paymentTerms: "30 dagar",
    orderNumber: "",
    offerNumber: "",
    internalReference: "",
    mechanic: "",
    workshopNotes: "",
    customerName: "",
    customerOrgNumber: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerPostalCode: "",
    customerCity: "",
    registrationNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "" as string | number,
    vin: "",
    mileage: "" as string | number,
  });

  const [items, setItems] = useState<LocalItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [splitPos, setSplitPos] = useState(55);
  const [previewNumbers, setPreviewNumbers] = useState<{ invoiceNumber: string; orderNumber: string } | null>(null);
  const lastDescRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEdit) return;
    fetch("/api/invoices/next-numbers")
      .then((r) => r.json())
      .then((data) => setPreviewNumbers(data))
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!invoice) return;
    setFields({
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate ?? addDays(invoice.invoiceDate, 30),
      paymentTerms: invoice.paymentTerms ?? "30 dagar",
      orderNumber: invoice.orderNumber ?? "",
      offerNumber: invoice.offerNumber ?? "",
      internalReference: invoice.internalReference ?? "",
      mechanic: invoice.mechanic ?? "",
      workshopNotes: invoice.workshopNotes ?? "",
      customerName: invoice.customerName ?? "",
      customerOrgNumber: invoice.customerOrgNumber ?? "",
      customerEmail: invoice.customerEmail ?? "",
      customerPhone: invoice.customerPhone ?? "",
      customerAddress: invoice.customerAddress ?? "",
      customerPostalCode: invoice.customerPostalCode ?? "",
      customerCity: invoice.customerCity ?? "",
      registrationNumber: invoice.registrationNumber ?? "",
      vehicleMake: invoice.vehicleMake ?? "",
      vehicleModel: invoice.vehicleModel ?? "",
      vehicleYear: invoice.vehicleYear ?? "",
      vin: invoice.vin ?? "",
      mileage: invoice.mileage ?? "",
    });
    if ("items" in invoice && Array.isArray((invoice as any).items)) {
      setItems((invoice as any).items.map((it: any) => ({
        id: it.id,
        itemType: it.itemType,
        articleNumber: it.articleNumber ?? "",
        description: it.description,
        quantity: Number(it.quantity),
        unit: it.unit ?? (it.itemType === "labor" ? "tim" : "st"),
        unitPrice: Number(it.unitPrice),
        discountPercent: Number(it.discountPercent),
        vatRate: Number(it.vatRate),
        lineTotal: Number(it.lineTotal),
        mechanicName: it.mechanicName ?? "",
        sortOrder: it.sortOrder,
      })));
    }
  }, [invoice]);

  const setField = (key: string, value: string | number) =>
    setFields((f) => ({ ...f, [key]: value }));

  const handleCustomerSelect = (customerId: string) => {
    const c = customers?.find((c) => c.id === parseInt(customerId));
    if (!c) return;
    setFields((f) => ({
      ...f,
      customerName: c.name,
      customerOrgNumber: c.organizationNumber ?? "",
      customerEmail: c.email ?? "",
      customerPhone: c.phone ?? "",
      customerAddress: c.address ?? "",
      customerPostalCode: c.postalCode ?? "",
      customerCity: c.city ?? "",
    }));
  };

  const handleVehicleSelect = (vehicleId: string) => {
    const v = vehicles?.find((v) => v.id === parseInt(vehicleId));
    if (!v) return;
    setFields((f) => ({
      ...f,
      registrationNumber: v.registrationNumber,
      vehicleMake: v.make ?? "",
      vehicleModel: v.model ?? "",
      vehicleYear: v.year ?? "",
      vin: v.vin ?? "",
      mileage: v.mileage ?? "",
    }));
  };

  const addItem = (type: string = "part") => {
    const defaultUnit = type === "labor" ? "tim" : type === "oil" ? "L" : "st";
    const defaultPrice = type === "labor" ? 750 : 0;
    const newItem: LocalItem = {
      itemType: type,
      articleNumber: "",
      description: "",
      quantity: 1,
      unit: defaultUnit,
      unitPrice: defaultPrice,
      discountPercent: 0,
      vatRate: 25,
      lineTotal: calcLineTotal(1, defaultPrice, 0, 25),
      mechanicName: fields.mechanic,
      sortOrder: items.length,
      _new: true,
      _dirty: true,
    };
    setItems((prev) => [...prev, newItem]);
    setTimeout(() => lastDescRef.current?.focus(), 50);
  };

  const updateItem = (idx: number, key: string, val: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx], [key]: val, _dirty: true };
      if (key === "itemType") {
        if (val === "labor") item.unit = "tim";
        else if (val === "oil") item.unit = "L";
        else if (val === "tire_fee" || val === "environmental_fee") {
          item.unit = "st";
          item.vatRate = 25;
        }
      }
      const qty = key === "quantity" ? Number(val) : Number(item.quantity);
      const price = key === "unitPrice" ? Number(val) : Number(item.unitPrice);
      const disc = key === "discountPercent" ? Number(val) : Number(item.discountPercent);
      const vat = key === "vatRate" ? Number(val) : Number(item.vatRate);
      item.lineTotal = calcLineTotal(qty, price, disc, vat);
      updated[idx] = item;
      return updated;
    });
  };

  const removeItem = async (idx: number) => {
    const item = items[idx];
    if (item.id && id) {
      await new Promise<void>((resolve) => {
        deleteItemMutation.mutate({ invoiceId: id, itemId: item.id! }, {
          onSuccess: () => resolve(),
          onError: () => resolve(),
        });
      });
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const duplicateItem = (idx: number) => {
    const orig = items[idx];
    setItems((prev) => [
      ...prev.slice(0, idx + 1),
      { ...orig, id: undefined, _new: true, _dirty: true, sortOrder: orig.sortOrder + 0.5 },
      ...prev.slice(idx + 1),
    ]);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((it, i) => ({ ...it, sortOrder: i, _dirty: true }));
    });
  };

  // Derived totals — group by VAT rate
  const vatByRate: Record<number, number> = {};
  let subtotal = 0;
  let vatAmount = 0;
  for (const it of items) {
    const net = calcNet(Number(it.quantity), Number(it.unitPrice), Number(it.discountPercent));
    const vat = net * (Number(it.vatRate) / 100);
    subtotal += net;
    vatAmount += vat;
    vatByRate[it.vatRate] = (vatByRate[it.vatRate] ?? 0) + vat;
  }
  const total = subtotal + vatAmount;

  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const createItemMutation = useCreateInvoiceItem();
  const updateItemMutation = useUpdateInvoiceItem();
  const deleteItemMutation = useDeleteInvoiceItem();

  const handleSave = async () => {
    setSaving(true);
    setSaveOk(false);
    setSaveErr(false);
    try {
      const payload = {
        invoiceDate: fields.invoiceDate,
        dueDate: fields.dueDate || undefined,
        paymentTerms: fields.paymentTerms || undefined,
        orderNumber: fields.orderNumber || undefined,
        offerNumber: fields.offerNumber || undefined,
        internalReference: fields.internalReference || undefined,
        mechanic: fields.mechanic || undefined,
        workshopNotes: fields.workshopNotes || undefined,
        customerName: fields.customerName || undefined,
        customerOrgNumber: fields.customerOrgNumber || undefined,
        customerEmail: fields.customerEmail || undefined,
        customerPhone: fields.customerPhone || undefined,
        customerAddress: fields.customerAddress || undefined,
        customerPostalCode: fields.customerPostalCode || undefined,
        customerCity: fields.customerCity || undefined,
        registrationNumber: fields.registrationNumber || undefined,
        vehicleMake: fields.vehicleMake || undefined,
        vehicleModel: fields.vehicleModel || undefined,
        vehicleYear: fields.vehicleYear ? Number(fields.vehicleYear) : undefined,
        vin: fields.vin || undefined,
        mileage: fields.mileage ? Number(fields.mileage) : undefined,
      };

      let invoiceId = id!;
      if (!isEdit) {
        const created = await new Promise<any>((resolve, reject) => {
          createMutation.mutate({ data: payload as any }, { onSuccess: resolve, onError: reject });
        });
        invoiceId = created.id;
      } else {
        await new Promise<void>((resolve, reject) => {
          updateMutation.mutate({ id: invoiceId, data: payload as any }, {
            onSuccess: () => resolve(), onError: reject,
          });
        });
      }

      for (const item of items) {
        if (!item._dirty) continue;
        const itemPayload = {
          itemType: item.itemType as any,
          articleNumber: item.articleNumber || undefined,
          description: item.description || "Artikel",
          quantity: Number(item.quantity),
          unit: item.unit || undefined,
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent),
          vatRate: Number(item.vatRate),
          sortOrder: item.sortOrder,
          mechanicName: item.mechanicName || undefined,
        };
        if (item._new || !item.id) {
          await new Promise<void>((resolve, reject) => {
            createItemMutation.mutate({ invoiceId, data: itemPayload }, {
              onSuccess: () => resolve(), onError: reject,
            });
          });
        } else {
          await new Promise<void>((resolve, reject) => {
            updateItemMutation.mutate({ invoiceId, itemId: item.id!, data: itemPayload }, {
              onSuccess: () => resolve(), onError: reject,
            });
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
      if (!isEdit) setLocation(`/invoices/${invoiceId}`);
    } catch (e) {
      setSaveErr(true);
      setTimeout(() => setSaveErr(false), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const pdfInvNr = isEdit ? (invoice?.invoiceNumber ?? "") : (previewNumbers?.invoiceNumber ?? "");
      const pdfOrdNr = isEdit ? (fields.orderNumber || null) : (previewNumbers?.orderNumber ?? null);
      const blob = await pdf(
        <InvoicePdf
          documentType={documentType}
          invoice={{
            invoiceNumber: pdfInvNr,
            orderNumber: pdfOrdNr,
            offerNumber: fields.offerNumber || null,
            invoiceDate: fields.invoiceDate,
            dueDate: fields.dueDate || null,
            paymentTerms: fields.paymentTerms || null,
            customerName: fields.customerName || null,
            customerOrgNumber: fields.customerOrgNumber || null,
            customerEmail: fields.customerEmail || null,
            customerPhone: fields.customerPhone || null,
            customerAddress: fields.customerAddress || null,
            customerPostalCode: fields.customerPostalCode || null,
            customerCity: fields.customerCity || null,
            registrationNumber: fields.registrationNumber || null,
            vehicleMake: fields.vehicleMake || null,
            vehicleModel: fields.vehicleModel || null,
            vehicleYear: fields.vehicleYear ? Number(fields.vehicleYear) : null,
            vin: fields.vin || null,
            mileage: fields.mileage ? Number(fields.mileage) : null,
            mechanic: fields.mechanic || null,
            internalReference: fields.internalReference || null,
            workshopNotes: fields.workshopNotes || null,
            subtotal, vatAmount, total,
          }}
          items={items.map((it, idx) => ({ ...it, id: it.id ?? -(idx + 1) }))}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${DOCUMENT_TYPE_LABELS[documentType].replace(/\s+/g, "-")}-${pdfInvNr || "ny"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── HMR trigger för PDF preview ──────────────────────────────────────────
  const [pdfHmrTick, setPdfHmrTick] = useState(0);
  useEffect(() => {
    const onHmr = () => setPdfHmrTick((n) => n + 1);
    window.addEventListener("invoice-pdf-hmr", onHmr);
    return () => window.removeEventListener("invoice-pdf-hmr", onHmr);
  }, []);

  // ── Debounced live PDF preview ───────────────────────────────────────────
  useEffect(() => {
    if (!showPreview) return;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const prevInvNr = isEdit ? (invoice?.invoiceNumber ?? "") : (previewNumbers?.invoiceNumber ?? "");
        const prevOrdNr = isEdit ? (fields.orderNumber || null) : (previewNumbers?.orderNumber ?? null);
        const blob = await pdf(
          <InvoicePdf
            documentType={documentType}
            invoice={{
              invoiceNumber: prevInvNr,
              orderNumber: prevOrdNr,
              offerNumber: fields.offerNumber || null,
              invoiceDate: fields.invoiceDate,
              dueDate: fields.dueDate || null,
              paymentTerms: fields.paymentTerms || null,
              customerName: fields.customerName || null,
              customerOrgNumber: fields.customerOrgNumber || null,
              customerEmail: fields.customerEmail || null,
              customerPhone: fields.customerPhone || null,
              customerAddress: fields.customerAddress || null,
              customerPostalCode: fields.customerPostalCode || null,
              customerCity: fields.customerCity || null,
              registrationNumber: fields.registrationNumber || null,
              vehicleMake: fields.vehicleMake || null,
              vehicleModel: fields.vehicleModel || null,
              vehicleYear: fields.vehicleYear ? Number(fields.vehicleYear) : null,
              vin: fields.vin || null,
              mileage: fields.mileage ? Number(fields.mileage) : null,
              mechanic: fields.mechanic || null,
              internalReference: fields.internalReference || null,
              workshopNotes: fields.workshopNotes || null,
              subtotal, vatAmount, total,
            }}
            items={items.map((it, idx) => ({ ...it, id: it.id ?? -(idx + 1) }))}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (_e) {
        // silently ignore preview errors
      } finally {
        setPreviewLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [showPreview, fields, items, subtotal, vatAmount, total, isEdit, invoice?.status, invoice?.invoiceNumber, previewNumbers, pdfHmrTick, documentType]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, []);

  // Drag-to-resize split pane
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = Math.min(80, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPos(pct);
    };
    const onUp = () => { dragRef.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const F = "field-input";
  const L = "field-label";

  return (
    <div
      ref={splitContainerRef}
      style={showPreview ? {
        position: "fixed", inset: 0, zIndex: 50, display: "flex",
        background: "hsl(var(--background))", overflow: "hidden",
      } : {}}
    >
      {/* Left pane — form */}
      <div style={showPreview ? {
        width: `${splitPos}%`, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 320,
      } : {}}>
      {/* Sticky header */}
      <div
        className={showPreview ? "page-header" : "sticky top-0 z-10 page-header"}
        style={{ background: "hsl(var(--card))", boxShadow: "0 1px 0 hsl(var(--border)), 0 2px 8px rgba(0,0,0,0.04)", flexShrink: 0 }}
      >
        <div>
          <div className="breadcrumb mb-0.5">
            <Link href="/invoices" className="hover:underline">Fakturor</Link>
            <span className="breadcrumb-sep">/</span>
            <span>{isEdit ? (invoice?.invoiceNumber ?? "Laddar…") : "Ny faktura"}</span>
            {invoice && <StatusBadge status={invoice.status} />}
          </div>
          <h1 className="text-base font-bold tracking-tight">
            {isEdit ? "Redigera faktura" : "Ny faktura"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {saveOk && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "hsl(145 55% 28%)" }}>
              <CheckCircle2 size={13} /> Sparat
            </span>
          )}
          {saveErr && (
            <span className="flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertCircle size={13} /> Fel vid sparning
            </span>
          )}
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`btn ${showPreview ? "btn-primary" : "btn-secondary"}`}
            title={showPreview ? "Stäng förhandsgranskning" : "Visa PDF bredvid formuläret"}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPreview ? "Stäng preview" : "Förhandsgranska"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="btn btn-secondary"
            data-testid="button-download-pdf"
          >
            <Download size={14} />
            {pdfLoading ? "Genererar…" : "Ladda ner PDF"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            data-testid="button-save-invoice"
          >
            <Save size={14} />
            {saving ? "Sparar…" : isEdit ? "Spara" : "Skapa faktura"}
          </button>
        </div>
      </div>

      {/* Scrollable body wrapper — only needed in preview split */}
      <div style={showPreview ? { flex: 1, overflowY: "auto" } : {}}>
      {/* Body — two-column layout */}
      <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* LEFT — main content */}
        <div className="xl:col-span-2 space-y-4">

          {/* ── Fakturainformation ─────────────────────────── */}
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Fakturainformation</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-3">
                <label className={L}>Dokumenttyp</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  className={F}
                  data-testid="select-documentType"
                >
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((k) => (
                    <option key={k} value={k}>{DOCUMENT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={L}>Fakturadatum *</label>
                <input
                  type="date"
                  value={fields.invoiceDate}
                  onChange={(e) => {
                    setField("invoiceDate", e.target.value);
                    setField("dueDate", addDays(e.target.value, 30));
                  }}
                  className={F}
                  data-testid="input-invoiceDate"
                />
              </div>
              <div>
                <label className={L}>Förfallodatum *</label>
                <input
                  type="date"
                  value={fields.dueDate}
                  onChange={(e) => setField("dueDate", e.target.value)}
                  className={F}
                  data-testid="input-dueDate"
                />
              </div>
              <div>
                <label className={L}>Betalningsvillkor</label>
                <select
                  value={fields.paymentTerms}
                  onChange={(e) => setField("paymentTerms", e.target.value)}
                  className={F}
                  data-testid="input-paymentTerms"
                >
                  {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={L}>Fakturanummer</label>
                <input
                  type="text"
                  value={isEdit ? (invoice?.invoiceNumber ?? "") : ""}
                  readOnly
                  className={`${F} cursor-not-allowed bg-muted/50 opacity-75 select-none`}
                  placeholder="Genereras automatiskt"
                  tabIndex={-1}
                  data-testid="input-invoiceNumber"
                />
              </div>
              <div>
                <label className={L}>Ordernummer / WO</label>
                <input
                  type="text"
                  value={fields.orderNumber}
                  readOnly
                  className={`${F} cursor-not-allowed bg-muted/50 opacity-75 select-none`}
                  placeholder="Genereras automatiskt"
                  tabIndex={-1}
                  data-testid="input-orderNumber"
                />
              </div>
              <div>
                <label className={L}>Offertnummer</label>
                <input
                  type="text"
                  value={fields.offerNumber}
                  onChange={(e) => setField("offerNumber", e.target.value)}
                  className={F}
                  data-testid="input-offerNumber"
                />
              </div>
              <div>
                <label className={L}>Intern referens</label>
                <input
                  type="text"
                  value={fields.internalReference}
                  onChange={(e) => setField("internalReference", e.target.value)}
                  className={F}
                  data-testid="input-internalReference"
                />
              </div>
            </div>
          </div>

          {/* ── Kund ───────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Kunduppgifter</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Välj befintlig kund:</span>
                <select
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="field-input py-1 text-xs max-w-[200px]"
                  defaultValue=""
                  data-testid="select-customer"
                >
                  <option value="">— välj kund —</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={L}>Kundnamn / Företag *</label>
                <input
                  type="text"
                  value={fields.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  className={`${F} font-medium`}
                  placeholder="Kundnamn"
                  data-testid="input-customerName"
                />
              </div>
              <div>
                <label className={L}>Organisationsnummer</label>
                <input
                  type="text"
                  value={fields.customerOrgNumber}
                  onChange={(e) => setField("customerOrgNumber", e.target.value)}
                  className={`${F} font-mono`}
                  placeholder="556XXX-XXXX"
                  data-testid="input-customerOrgNumber"
                />
              </div>
              <div>
                <label className={L}>Referensperson</label>
                <input
                  type="text"
                  value={fields.internalReference}
                  onChange={(e) => setField("internalReference", e.target.value)}
                  className={F}
                  data-testid="input-reference"
                />
              </div>
              <div>
                <label className={L}>Telefon</label>
                <input
                  type="tel"
                  value={fields.customerPhone}
                  onChange={(e) => setField("customerPhone", e.target.value)}
                  className={F}
                  placeholder="031-XX XX XX"
                  data-testid="input-customerPhone"
                />
              </div>
              <div>
                <label className={L}>E-post</label>
                <input
                  type="email"
                  value={fields.customerEmail}
                  onChange={(e) => setField("customerEmail", e.target.value)}
                  className={F}
                  placeholder="epost@foretag.se"
                  data-testid="input-customerEmail"
                />
              </div>
              <div className="col-span-2">
                <label className={L}>Fakturaadress</label>
                <input
                  type="text"
                  value={fields.customerAddress}
                  onChange={(e) => setField("customerAddress", e.target.value)}
                  className={F}
                  placeholder="Gatuadress"
                  data-testid="input-customerAddress"
                />
              </div>
              <div>
                <label className={L}>Postnummer</label>
                <input
                  type="text"
                  value={fields.customerPostalCode}
                  onChange={(e) => setField("customerPostalCode", e.target.value)}
                  className={`${F} font-mono`}
                  placeholder="412 63"
                  data-testid="input-customerPostalCode"
                />
              </div>
              <div>
                <label className={L}>Stad</label>
                <input
                  type="text"
                  value={fields.customerCity}
                  onChange={(e) => setField("customerCity", e.target.value)}
                  className={F}
                  placeholder="Göteborg"
                  data-testid="input-customerCity"
                />
              </div>
            </div>
          </div>

          {/* ── Fordon ─────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Fordonsinformation</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Välj befintligt fordon:</span>
                <select
                  onChange={(e) => handleVehicleSelect(e.target.value)}
                  className="field-input py-1 text-xs max-w-[220px]"
                  defaultValue=""
                  data-testid="select-vehicle"
                >
                  <option value="">— välj fordon —</option>
                  {(vehicles ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} — {[v.make, v.model].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={L}>Registreringsnummer *</label>
                <input
                  type="text"
                  value={fields.registrationNumber}
                  onChange={(e) => setField("registrationNumber", e.target.value.toUpperCase())}
                  className={`${F} font-mono font-bold tracking-wider`}
                  placeholder="ABC123"
                  data-testid="input-registrationNumber"
                />
              </div>
              <div>
                <label className={L}>Märke</label>
                <input
                  type="text"
                  value={fields.vehicleMake}
                  onChange={(e) => setField("vehicleMake", e.target.value)}
                  className={F}
                  placeholder="Volvo"
                  data-testid="input-vehicleMake"
                />
              </div>
              <div>
                <label className={L}>Modell</label>
                <input
                  type="text"
                  value={fields.vehicleModel}
                  onChange={(e) => setField("vehicleModel", e.target.value)}
                  className={F}
                  placeholder="FH16 750"
                  data-testid="input-vehicleModel"
                />
              </div>
              <div>
                <label className={L}>Årsmodell</label>
                <input
                  type="number"
                  value={fields.vehicleYear}
                  onChange={(e) => setField("vehicleYear", e.target.value)}
                  className={`${F} font-mono`}
                  placeholder="2022"
                  min={1900}
                  max={2030}
                  data-testid="input-vehicleYear"
                />
              </div>
              <div>
                <label className={L}>Mätarställning (km)</label>
                <input
                  type="number"
                  value={fields.mileage}
                  onChange={(e) => setField("mileage", e.target.value)}
                  className={`${F} font-mono`}
                  placeholder="150000"
                  data-testid="input-mileage"
                />
              </div>
              <div>
                <label className={L}>VIN / Chassinummer</label>
                <input
                  type="text"
                  value={fields.vin}
                  onChange={(e) => setField("vin", e.target.value.toUpperCase())}
                  className={`${F} font-mono text-xs`}
                  placeholder="YV2R4X209KA123456"
                  data-testid="input-vin"
                />
              </div>
            </div>
          </div>

          {/* ── Fakturarader ───────────────────────────────── */}
          <div className="panel overflow-hidden">
            <div className="panel-header">
              <p className="panel-title">Fakturarader</p>
              <div className="flex gap-1.5">
                {[
                  { type: "part", label: "Reservdel" },
                  { type: "labor", label: "Arbete" },
                  { type: "other", label: "Övrigt" },
                ].map((t) => (
                  <button
                    key={t.type}
                    onClick={() => addItem(t.type)}
                    className="btn btn-secondary btn-sm"
                    data-testid={`button-add-${t.type}`}
                  >
                    <Plus size={11} />
                    {t.label}
                  </button>
                ))}
                <button onClick={() => addItem()} className="btn btn-ghost btn-sm" data-testid="button-add-item">
                  + Ny rad
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="item-table w-full text-xs" style={{ minWidth: 860 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid hsl(var(--border))", background: "hsl(210 14% 97%)" }}>
                    <th className="w-6 px-2 py-2" />
                    <th className="px-2 py-2 text-left w-28" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Typ</th>
                    <th className="px-2 py-2 text-left w-24" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Art.nr</th>
                    <th className="px-2 py-2 text-left" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Beskrivning</th>
                    <th className="px-2 py-2 text-right w-16" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Antal</th>
                    <th className="px-2 py-2 text-center w-12" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Enhet</th>
                    <th className="px-2 py-2 text-right w-24" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>À-pris</th>
                    <th className="px-2 py-2 text-right w-14" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rab.%</th>
                    <th className="px-2 py-2 text-right w-12" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Moms</th>
                    <th className="px-2 py-2 text-right w-28" style={{ color: "hsl(var(--muted-foreground))", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Belopp</th>
                    <th className="w-20 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="group" data-testid={`row-item-${idx}`}>
                      {/* Move buttons */}
                      <td className="px-1 w-6">
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveItem(idx, -1)}
                            disabled={idx === 0}
                            className="hover:text-primary disabled:opacity-20 transition-colors"
                            tabIndex={-1}
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            onClick={() => moveItem(idx, 1)}
                            disabled={idx === items.length - 1}
                            className="hover:text-primary disabled:opacity-20 transition-colors"
                            tabIndex={-1}
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2">
                        <select
                          value={item.itemType}
                          onChange={(e) => updateItem(idx, "itemType", e.target.value)}
                          data-testid={`select-itemType-${idx}`}
                          style={{ fontSize: "0.7rem" }}
                        >
                          {ITEM_TYPES.map((t) => <option key={t} value={t}>{itemTypeLabel(t)}</option>)}
                        </select>
                      </td>
                      <td className="px-2">
                        <input
                          value={item.articleNumber}
                          onChange={(e) => updateItem(idx, "articleNumber", e.target.value)}
                          placeholder="Art.nr"
                          style={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                          data-testid={`input-articleNumber-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          ref={idx === items.length - 1 ? lastDescRef : undefined}
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addItem(); }
                          }}
                          placeholder="Beskrivning av artikel eller arbete..."
                          data-testid={`input-description-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.25}
                          style={{ textAlign: "right", fontFamily: "monospace" }}
                          data-testid={`input-quantity-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          placeholder="st"
                          style={{ textAlign: "center", fontSize: "0.7rem" }}
                          data-testid={`input-unit-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                          min={0}
                          step={1}
                          style={{ textAlign: "right", fontFamily: "monospace" }}
                          data-testid={`input-unitPrice-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                          min={0}
                          max={100}
                          step={1}
                          style={{ textAlign: "right", fontFamily: "monospace" }}
                          data-testid={`input-discount-${idx}`}
                        />
                      </td>
                      <td className="px-2">
                        <select
                          value={item.vatRate}
                          onChange={(e) => updateItem(idx, "vatRate", parseFloat(e.target.value))}
                          style={{ fontSize: "0.7rem" }}
                          data-testid={`select-vatRate-${idx}`}
                        >
                          <option value={25}>25%</option>
                          <option value={12}>12%</option>
                          <option value={6}>6%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>
                      <td className="px-2 text-right font-mono font-semibold" style={{ fontSize: "0.75rem" }}>
                        {formatCurrency(item.lineTotal)}
                      </td>
                      <td className="px-2">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => duplicateItem(idx)}
                            className="btn btn-ghost btn-sm"
                            title="Duplicera rad"
                            tabIndex={-1}
                            data-testid={`button-duplicate-item-${idx}`}
                          >
                            <Copy size={11} />
                          </button>
                          <button
                            onClick={() => removeItem(idx)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "hsl(var(--destructive))" }}
                            title="Ta bort rad"
                            tabIndex={-1}
                            data-testid={`button-remove-item-${idx}`}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-muted-foreground">
                        <p className="text-sm mb-2">Inga fakturarader ännu</p>
                        <p className="text-xs mb-4">Använd knapparna ovan för att lägga till rader snabbt</p>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => addItem("part")} className="btn btn-secondary btn-sm">
                            <Plus size={11} /> Reservdel
                          </button>
                          <button onClick={() => addItem("labor")} className="btn btn-secondary btn-sm">
                            <Plus size={11} /> Arbete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div
              className="px-5 py-3 flex justify-end"
              style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(210 14% 98%)" }}
            >
              <div className="w-72">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground">Netto (exkl. moms)</span>
                    <span className="tabular-nums font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  {Object.entries(vatByRate).map(([rate, amt]) => (
                    <div key={rate} className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">Moms {rate}%</span>
                      <span className="tabular-nums font-mono text-muted-foreground">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  <div
                    className="flex justify-between pt-2 mt-1 font-bold text-base"
                    style={{ borderTop: "2px solid hsl(var(--border))" }}
                  >
                    <span>Att betala</span>
                    <span className="tabular-nums font-mono" style={{ color: "hsl(var(--primary))" }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sidebar info */}
        <div className="space-y-4">
          {/* Workshop */}
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Verkstad &amp; Mekaniker</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className={L}>Ansvarig mekaniker</label>
                <input
                  type="text"
                  value={fields.mechanic}
                  onChange={(e) => setField("mechanic", e.target.value)}
                  className={F}
                  placeholder="Förnamn Efternamn"
                  list="mechanic-suggestions"
                  data-testid="input-mechanic"
                />
                <datalist id="mechanic-suggestions">
                  {MECHANICS.map((m) => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div>
                <label className={L}>Verkstadsanteckningar</label>
                <textarea
                  value={fields.workshopNotes}
                  onChange={(e) => setField("workshopNotes", e.target.value)}
                  rows={4}
                  className={`${F} resize-none leading-relaxed`}
                  placeholder="Felsymptom, utförda arbeten, kundönskemål, interna noteringar..."
                  data-testid="input-workshopNotes"
                />
              </div>
            </div>
          </div>

          {/* Invoice summary card */}
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Sammanfattning</p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fakturanummer</span>
                <span className="font-mono font-semibold">
                  {isEdit ? (invoice?.invoiceNumber ?? "—") : "Auto"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fakturadatum</span>
                <span className="font-mono text-xs">{fields.invoiceDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Förfallodatum</span>
                <span className="font-mono text-xs">{fields.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kund</span>
                <span className="font-medium truncate max-w-[140px] text-right">{fields.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fordon</span>
                <span className="font-mono font-semibold">{fields.registrationNumber || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rader</span>
                <span>{items.length}</span>
              </div>
              <div
                className="flex justify-between pt-2 font-bold"
                style={{ borderTop: "1px solid hsl(var(--border))" }}
              >
                <span>Totalt inkl. moms</span>
                <span className="tabular-nums" style={{ color: "hsl(var(--primary))" }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="panel">
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Kortkommandon</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Ny rad</span>
                  <kbd className="font-mono bg-muted px-1 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Flytta rad upp/ner</span>
                  <span className="font-mono">⬆ ⬇ hover</span>
                </div>
                <div className="flex justify-between">
                  <span>Duplicera rad</span>
                  <span className="font-mono">⧉ hover</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* end scrollable body wrapper */}
      </div>{/* end left pane */}

      {/* ── Resize handle ─────────────────────────────────────── */}
      {showPreview && (
        <div
          onMouseDown={() => { dragRef.current = true; }}
          style={{
            width: 5,
            flexShrink: 0,
            cursor: "col-resize",
            background: "hsl(var(--border))",
            transition: "background 0.15s",
            userSelect: "none",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--primary))"; }}
          onMouseLeave={(e) => { if (!dragRef.current) (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--border))"; }}
        />
      )}

      {/* ── Right pane — live PDF preview ─────────────────────── */}
      {showPreview && (
        <div
          style={{
            flex: 1,
            minWidth: 300,
            borderLeft: "none",
            background: "#e5e7eb",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Preview toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: "hsl(var(--card))",
              borderBottom: "1px solid hsl(var(--border))",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
              PDF-förhandsgranskning
            </span>
            <span
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {previewLoading && (
                <>
                  <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  Uppdaterar…
                </>
              )}
              {!previewLoading && pdfUrl && (
                <span style={{ color: "hsl(145 55% 32%)", fontWeight: 500 }}>✓ Aktuell</span>
              )}
            </span>
          </div>

          {/* iframe */}
          {pdfUrl ? (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              style={{ flex: 1, border: "none", width: "100%" }}
              title="PDF-förhandsgranskning"
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "hsl(var(--muted-foreground))",
                gap: 10,
              }}
            >
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", opacity: 0.4 }} />
              <span style={{ fontSize: 13 }}>Genererar PDF-förhandsgranskning…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
