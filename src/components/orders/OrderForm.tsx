import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "@/components/orders/Field";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { PackagePlus } from "lucide-react";

interface Props {
  products: string[];
  suppliers: string[];
  currencies: string[];
  serverError?: string | null;
}

interface FormState {
  orderNumber: string;
  productName: string;
  supplierName: string;
  quantityKg: string;
  portPricePerKg: string;
  orderValue: string;
  currencyCode: string;
  containerNumber: string;
  etaPortDate: string;
  etaDestinationDate: string;
  hasEur1Certificate: boolean;
  notes: string;
}

const initialState: FormState = {
  orderNumber: "",
  productName: "",
  supplierName: "",
  quantityKg: "",
  portPricePerKg: "",
  orderValue: "",
  currencyCode: "",
  containerNumber: "",
  etaPortDate: "",
  etaDestinationDate: "",
  hasEur1Certificate: false,
  notes: "",
};

export default function OrderForm({ products, suppliers, currencies, serverError }: Props) {
  const [form, setForm] = useState<FormState>(initialState);
  const [orderValueTouched, setOrderValueTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onQuantityOrPriceChange(quantityKg: string, portPricePerKg: string) {
    if (orderValueTouched) return;
    const qty = Number(quantityKg);
    const price = Number(portPricePerKg.replace(",", "."));
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price >= 0) {
      setForm((prev) => ({ ...prev, orderValue: (qty * price).toFixed(4) }));
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.productName.trim()) next.productName = "Podaj towar";
    if (!form.supplierName.trim()) next.supplierName = "Podaj dostawcę";
    if (!Number.isInteger(Number(form.quantityKg)) || Number(form.quantityKg) <= 0) {
      next.quantityKg = "Ilość musi być liczbą całkowitą większą od 0";
    }
    if (!form.portPricePerKg || Number.isNaN(Number(form.portPricePerKg.replace(",", ".")))) {
      next.portPricePerKg = "Podaj cenę portową za kg";
    }
    if (!form.orderValue || Number.isNaN(Number(form.orderValue.replace(",", ".")))) {
      next.orderValue = "Podaj wartość zamówienia";
    }
    if (!form.currencyCode) next.currencyCode = "Wybierz walutę";
    if (form.orderNumber && form.orderNumber.length !== 10) {
      next.orderNumber = "Numer zamówienia musi mieć dokładnie 10 znaków";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  return (
    <form method="POST" action="/api/orders" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Field
        id="order_number"
        label="Numer zamówienia (CRM)"
        error={errors.orderNumber}
        hint="Opcjonalnie, dokładnie 10 znaków"
      >
        <input
          id="order_number"
          name="order_number"
          value={form.orderNumber}
          onChange={(e) => {
            set("orderNumber", e.target.value);
          }}
          maxLength={10}
          className={cn(inputClass, errors.orderNumber && "border-red-400/60 focus:ring-red-400")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="product_name" label="Towar" required error={errors.productName}>
          <input
            id="product_name"
            name="product_name"
            list="product-options"
            value={form.productName}
            onChange={(e) => {
              set("productName", e.target.value);
            }}
            maxLength={100}
            className={cn(inputClass, errors.productName && "border-red-400/60 focus:ring-red-400")}
          />
          <datalist id="product-options">
            {products.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>

        <Field id="supplier_name" label="Dostawca" required error={errors.supplierName}>
          <input
            id="supplier_name"
            name="supplier_name"
            list="supplier-options"
            value={form.supplierName}
            onChange={(e) => {
              set("supplierName", e.target.value);
            }}
            maxLength={100}
            className={cn(inputClass, errors.supplierName && "border-red-400/60 focus:ring-red-400")}
          />
          <datalist id="supplier-options">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="quantity_kg" label="Ilość (kg)" required error={errors.quantityKg}>
          <input
            id="quantity_kg"
            name="quantity_kg"
            type="number"
            min={1}
            step={1}
            value={form.quantityKg}
            onChange={(e) => {
              set("quantityKg", e.target.value);
              onQuantityOrPriceChange(e.target.value, form.portPricePerKg);
            }}
            className={cn(inputClass, errors.quantityKg && "border-red-400/60 focus:ring-red-400")}
          />
        </Field>

        <Field id="port_price_per_kg" label="Cena portowa / kg" required error={errors.portPricePerKg}>
          <input
            id="port_price_per_kg"
            name="port_price_per_kg"
            type="number"
            min={0}
            step={0.0001}
            value={form.portPricePerKg}
            onChange={(e) => {
              set("portPricePerKg", e.target.value);
              onQuantityOrPriceChange(form.quantityKg, e.target.value);
            }}
            className={cn(inputClass, errors.portPricePerKg && "border-red-400/60 focus:ring-red-400")}
          />
        </Field>

        <Field id="currency_code" label="Waluta" required error={errors.currencyCode}>
          <select
            id="currency_code"
            name="currency_code"
            value={form.currencyCode}
            onChange={(e) => {
              set("currencyCode", e.target.value);
            }}
            className={cn(inputClass, errors.currencyCode && "border-red-400/60 focus:ring-red-400")}
          >
            <option value="" className="text-black">
              Wybierz…
            </option>
            {currencies.map((c) => (
              <option key={c} value={c} className="text-black">
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        id="order_value"
        label="Wartość zamówienia"
        required
        error={errors.orderValue}
        hint="Wyliczana automatycznie z ilości i ceny portowej; można poprawić ręcznie"
      >
        <input
          id="order_value"
          name="order_value"
          type="number"
          min={0}
          step={0.0001}
          value={form.orderValue}
          onChange={(e) => {
            setOrderValueTouched(true);
            set("orderValue", e.target.value);
          }}
          className={cn(inputClass, errors.orderValue && "border-red-400/60 focus:ring-red-400")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="container_number" label="Numer kontenera" error={errors.containerNumber}>
          <input
            id="container_number"
            name="container_number"
            value={form.containerNumber}
            onChange={(e) => {
              set("containerNumber", e.target.value);
            }}
            maxLength={50}
            className={inputClass}
          />
        </Field>

        <Field id="eta_port_date" label="ETA port">
          <input
            id="eta_port_date"
            name="eta_port_date"
            type="date"
            value={form.etaPortDate}
            onChange={(e) => {
              set("etaPortDate", e.target.value);
            }}
            className={cn(inputClass, "[color-scheme:dark]")}
          />
        </Field>

        <Field id="eta_destination_date" label="ETA cel">
          <input
            id="eta_destination_date"
            name="eta_destination_date"
            type="date"
            value={form.etaDestinationDate}
            onChange={(e) => {
              set("etaDestinationDate", e.target.value);
            }}
            className={cn(inputClass, "[color-scheme:dark]")}
          />
        </Field>
      </div>

      <label htmlFor="has_eur1_certificate" className="flex items-center gap-2 text-sm text-blue-100/80">
        <input
          id="has_eur1_certificate"
          name="has_eur1_certificate"
          type="checkbox"
          checked={form.hasEur1Certificate}
          onChange={(e) => {
            set("hasEur1Certificate", e.target.checked);
          }}
          className="size-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400"
        />
        Dostępny certyfikat EUR.1
      </label>

      <Field id="notes" label="Uwagi" hint={`${form.notes.length}/512`}>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => {
            set("notes", e.target.value);
          }}
          maxLength={512}
          className={inputClass}
        />
      </Field>

      <ServerError message={serverError} />

      <SubmitButton pendingText="Zapisywanie…" icon={<PackagePlus className="size-4" />}>
        Zapisz zamówienie
      </SubmitButton>
    </form>
  );
}
