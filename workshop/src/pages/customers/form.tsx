import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import {
  useGetCustomer, useCreateCustomer, useUpdateCustomer,
  getListCustomersQueryKey, getGetCustomerQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

interface Props { id?: number }

const FIELDS = [
  { name: "name", label: "Namn *", required: true, colSpan: 2, placeholder: "Bergström & Son HB" },
  { name: "organizationNumber", label: "Organisationsnummer", colSpan: 1, placeholder: "556123-4567", mono: true },
  { name: "reference", label: "Referensperson", colSpan: 1 },
  { name: "phone", label: "Telefon", colSpan: 1, placeholder: "031-XX XX XX" },
  { name: "email", label: "E-post", type: "email", colSpan: 1, placeholder: "kontakt@foretag.se" },
  { name: "address", label: "Fakturaadress", colSpan: 2, placeholder: "Industrigatan 88" },
  { name: "postalCode", label: "Postnummer", colSpan: 1, placeholder: "412 63", mono: true },
  { name: "city", label: "Stad", colSpan: 1, placeholder: "Göteborg" },
  { name: "notes", label: "Anteckningar", type: "textarea", colSpan: 2 },
] as const;

export default function CustomerForm({ id }: Props) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: customer } = useGetCustomer(id!, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id!) }
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Record<string, string>>();

  useEffect(() => {
    if (customer) reset(customer as any);
  }, [customer, reset]);

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const onSubmit = async (data: Record<string, string>) => {
    const cleaned = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ""));
    if (isEdit) {
      updateMutation.mutate({ id: id!, data: cleaned as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetCustomerQueryKey(id!) });
          setLocation(`/customers/${id}`);
        },
      });
    } else {
      createMutation.mutate({ data: cleaned as any }, {
        onSuccess: (c) => {
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          setLocation(`/customers/${c.id}`);
        },
      });
    }
  };

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="breadcrumb mb-0.5">
            <Link href="/customers" className="hover:underline">Kunder</Link>
            <span className="breadcrumb-sep">/</span>
            <span>{isEdit ? "Redigera kund" : "Ny kund"}</span>
          </div>
          <h1 className="text-base font-bold tracking-tight">
            {isEdit ? "Redigera kunduppgifter" : "Lägg till ny kund"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/customers">
            <button type="button" className="btn btn-secondary">Avbryt</button>
          </Link>
          <button
            form="customer-form"
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            data-testid="button-submit-customer"
          >
            <Save size={14} />
            {isPending ? "Sparar…" : isEdit ? "Spara" : "Skapa kund"}
          </button>
        </div>
      </div>

      <div className="p-5 max-w-2xl">
        <form id="customer-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Kunduppgifter</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.name} className={(f as any).colSpan === 2 ? "col-span-2" : ""}>
                  <label className="field-label">{f.label}</label>
                  {(f as any).type === "textarea" ? (
                    <textarea
                      {...register(f.name)}
                      rows={3}
                      className="field-input resize-none"
                      data-testid={`input-${f.name}`}
                    />
                  ) : (
                    <input
                      {...register(f.name, { required: (f as any).required ? "Obligatoriskt fält" : false })}
                      type={(f as any).type ?? "text"}
                      placeholder={(f as any).placeholder}
                      className={`field-input ${(f as any).mono ? "font-mono" : ""}`}
                      data-testid={`input-${f.name}`}
                    />
                  )}
                  {errors[f.name] && (
                    <p className="text-xs text-destructive mt-1">{errors[f.name]?.message as string}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
