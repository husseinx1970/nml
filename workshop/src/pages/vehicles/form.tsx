import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useSearch } from "wouter";
import {
  useGetVehicle, useCreateVehicle, useUpdateVehicle,
  getListVehiclesQueryKey, getGetVehicleQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

interface Props { id?: number }

const VEHICLE_FIELDS = [
  { name: "registrationNumber", label: "Registreringsnummer *", required: true, colSpan: 1, placeholder: "ABC123", mono: true, upper: true },
  { name: "vin", label: "Chassinummer / VIN", colSpan: 1, placeholder: "YV2R4X209KA123456", mono: true, upper: true },
  { name: "make", label: "Märke", colSpan: 1, placeholder: "Volvo" },
  { name: "model", label: "Modell", colSpan: 1, placeholder: "FH16 750" },
  { name: "year", label: "Årsmodell", colSpan: 1, type: "number", placeholder: "2022", mono: true },
  { name: "fuelType", label: "Bränsletyp", colSpan: 1, placeholder: "Diesel" },
  { name: "engineInfo", label: "Motorinformation", colSpan: 2, placeholder: "13.0 D13K 750hk" },
  { name: "mileage", label: "Mätarställning (km)", colSpan: 1, type: "number", placeholder: "125000", mono: true },
  { name: "firstRegistrationDate", label: "Första registreringsdatum", colSpan: 1, type: "date" },
] as const;

export default function VehicleForm({ id }: Props) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const params = new URLSearchParams(search);
  const defaultCustomerId = params.get("customerId");

  const { data: vehicle } = useGetVehicle(id!, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id!) }
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Record<string, string>>();

  useEffect(() => {
    if (vehicle) reset(vehicle as any);
    else if (defaultCustomerId) reset({ customerId: defaultCustomerId });
  }, [vehicle, defaultCustomerId, reset]);

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const onSubmit = async (data: Record<string, string>) => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== "" && v != null) {
        if (k === "customerId" || k === "year" || k === "mileage") {
          cleaned[k] = parseInt(v);
        } else {
          cleaned[k] = v;
        }
      }
    }
    if (isEdit) {
      updateMutation.mutate({ id: id!, data: cleaned as any }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
          setLocation(`/vehicles/${id}`);
        },
      });
    } else {
      createMutation.mutate({ data: cleaned as any }, {
        onSuccess: (v) => {
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
          setLocation(`/vehicles/${v.id}`);
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
            <Link href="/vehicles" className="hover:underline">Fordon</Link>
            <span className="breadcrumb-sep">/</span>
            <span>{isEdit ? "Redigera fordon" : "Nytt fordon"}</span>
          </div>
          <h1 className="text-base font-bold tracking-tight">
            {isEdit ? "Redigera fordonsinformation" : "Registrera nytt fordon"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/vehicles">
            <button type="button" className="btn btn-secondary">Avbryt</button>
          </Link>
          <button
            form="vehicle-form"
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
            data-testid="button-submit-vehicle"
          >
            <Save size={14} />
            {isPending ? "Sparar…" : isEdit ? "Spara" : "Skapa fordon"}
          </button>
        </div>
      </div>

      <div className="p-5 max-w-2xl">
        <form id="vehicle-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="panel">
            <div className="panel-header">
              <p className="panel-title">Fordonsinformation</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {VEHICLE_FIELDS.map((f) => (
                <div key={f.name} className={(f as any).colSpan === 2 ? "col-span-2" : ""}>
                  <label className="field-label">{f.label}</label>
                  <input
                    {...register(f.name, { required: (f as any).required ? "Obligatoriskt fält" : false })}
                    type={(f as any).type ?? "text"}
                    placeholder={(f as any).placeholder}
                    className={`field-input ${(f as any).mono ? "font-mono" : ""}`}
                    data-testid={`input-${f.name}`}
                  />
                </div>
              ))}

              <div className="col-span-2">
                <label className="field-label">Anteckningar / Servicehistorik</label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="field-input resize-none"
                  placeholder="Tidigare serviceåtgärder, kända fel, kundönskemål..."
                  data-testid="input-notes"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
