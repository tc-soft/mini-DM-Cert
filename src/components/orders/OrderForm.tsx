import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "@/components/orders/Field";
import { ServerError } from "@/components/auth/ServerError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { PackagePlus, Pencil } from "lucide-react";

interface Props {
  products: string[];
  suppliers: string[];
  currencies: string[];
  serverError?: string | null;
  mode?: "create" | "edit";
  action?: string;
  initialValues?: Partial<FormState>;
}

interface FormState {
  orderNumber: string;
  productName: string;
  supplierName: string;
  quantityKg: string;
  portPricePerKg: string;
  currencyCode: string;
  containerNumber: string;
  etaPortDate: string;
  etaDestinationDate: string;
  hasEur1Certificate: boolean;
  deliveredPricePerKg: string;
  batchNumber: string;
  sentForTestingDate: string;
  testResults: string;
  isBlocked: boolean;
  takenForProduction: boolean;
  paymentDueDate: string;
  invoiceNumber: string;
  paymentDate: string;
  deliveryDate: string;
  isImportant: boolean;
  notes: string;
}

const initialState: FormState = {
  orderNumber: "",
  productName: "",
  supplierName: "",
  quantityKg: "",
  portPricePerKg: "",
  currencyCode: "",
  containerNumber: "",
  etaPortDate: "",
  etaDestinationDate: "",
  hasEur1Certificate: false,
  deliveredPricePerKg: "",
  batchNumber: "",
  sentForTestingDate: "",
  testResults: "",
  isBlocked: false,
  takenForProduction: false,
  paymentDueDate: "",
  invoiceNumber: "",
  paymentDate: "",
  deliveryDate: "",
  isImportant: false,
  notes: "",
};

// Mirrors the server-side calculation in orders-form.ts (quantity × price) so the read-only
// value fields preview what will actually be saved, without the client being trusted for it.
// Displayed rounded to 2 decimals, matching the app's general currency display convention.
function computeDerivedValue(quantityKg: string, pricePerKg: string): string {
  const qty = Number(quantityKg);
  const price = Number(pricePerKg.replace(",", "."));
  if (!Number.isInteger(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return "";
  return (qty * price).toFixed(2);
}

export default function OrderForm({
  products,
  suppliers,
  currencies,
  serverError,
  mode = "create",
  action = "/api/orders",
  initialValues,
}: Props) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState<FormState>(() => ({ ...initialState, ...initialValues }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const orderValueDisplay = computeDerivedValue(form.quantityKg, form.portPricePerKg);
  const deliveredOrderValueDisplay = form.deliveredPricePerKg
    ? computeDerivedValue(form.quantityKg, form.deliveredPricePerKg)
    : "";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
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
    if (!form.currencyCode) next.currencyCode = "Wybierz walutę";
    if (form.orderNumber && form.orderNumber.length !== 10) {
      next.orderNumber = "Numer zamówienia musi mieć dokładnie 10 znaków";
    }
    if (form.batchNumber && form.batchNumber.length !== 13) {
      next.batchNumber = "Numer partii musi mieć dokładnie 13 znaków";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  const orderNumberField = (
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
  );

  const supplierField = (
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
  );

  const productField = (
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
  );

  const quantityField = (
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
        }}
        className={cn(inputClass, errors.quantityKg && "border-red-400/60 focus:ring-red-400")}
      />
    </Field>
  );

  const portPriceField = (
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
        }}
        className={cn(inputClass, errors.portPricePerKg && "border-red-400/60 focus:ring-red-400")}
      />
    </Field>
  );

  const deliveredPriceField = isEdit && (
    <Field id="delivered_price_per_kg" label="Cena po dostawie / kg">
      <input
        id="delivered_price_per_kg"
        name="delivered_price_per_kg"
        type="number"
        min={0}
        step={0.0001}
        value={form.deliveredPricePerKg}
        onChange={(e) => {
          set("deliveredPricePerKg", e.target.value);
        }}
        className={inputClass}
      />
    </Field>
  );

  const currencyField = (
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
  );

  const orderValueField = (
    <Field id="order_value" label="Wartość zamówienia" hint="Wyliczana automatycznie z ilości i ceny portowej">
      <input
        id="order_value"
        name="order_value"
        type="text"
        readOnly
        value={orderValueDisplay}
        className={cn(inputClass, "cursor-not-allowed opacity-70")}
      />
    </Field>
  );

  const deliveredOrderValueField = isEdit && (
    <Field
      id="delivered_order_value"
      label="Wartość zamówienia po dostawie"
      hint="Wyliczana automatycznie z ilości i ceny po dostawie"
    >
      <input
        id="delivered_order_value"
        name="delivered_order_value"
        type="text"
        readOnly
        value={deliveredOrderValueDisplay}
        className={cn(inputClass, "cursor-not-allowed opacity-70")}
      />
    </Field>
  );

  return (
    <form method="POST" action={action} className="space-y-4" onSubmit={handleSubmit} noValidate>
      {isEdit ? (
        <>
          {orderNumberField}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {supplierField}
            {productField}
            {quantityField}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {portPriceField}
            {deliveredPriceField}
            {currencyField}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {orderValueField}
            {deliveredOrderValueField}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {orderNumberField}
            {supplierField}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {productField}
            {quantityField}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {portPriceField}
            {currencyField}
            {orderValueField}
          </div>
        </>
      )}

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

      <label htmlFor="is_important" className="flex items-center gap-2 text-sm text-blue-100/80">
        <input
          id="is_important"
          name="is_important"
          type="checkbox"
          checked={form.isImportant}
          onChange={(e) => {
            set("isImportant", e.target.checked);
          }}
          className="size-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400"
        />
        Oznacz jako ważne / wymagające uwagi
      </label>

      {isEdit && (
        <>
          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-blue-100/80">Realizacja dostawy i badania</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="delivery_date" label="Data dostawy">
                <input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => {
                    set("deliveryDate", e.target.value);
                  }}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
              </Field>

              <Field id="batch_number" label="Numer partii" error={errors.batchNumber} hint="Dokładnie 13 znaków">
                <input
                  id="batch_number"
                  name="batch_number"
                  value={form.batchNumber}
                  onChange={(e) => {
                    set("batchNumber", e.target.value);
                  }}
                  maxLength={13}
                  className={cn(inputClass, errors.batchNumber && "border-red-400/60 focus:ring-red-400")}
                />
              </Field>

              <Field id="sent_for_testing_date" label="Data wysłania do badań">
                <input
                  id="sent_for_testing_date"
                  name="sent_for_testing_date"
                  type="date"
                  value={form.sentForTestingDate}
                  onChange={(e) => {
                    set("sentForTestingDate", e.target.value);
                  }}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field id="test_results" label="Wynik badań" hint={`${form.testResults.length}/50`}>
                <input
                  id="test_results"
                  name="test_results"
                  value={form.testResults}
                  onChange={(e) => {
                    set("testResults", e.target.value);
                  }}
                  maxLength={50}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap gap-6">
              <label htmlFor="is_blocked" className="flex items-center gap-2 text-sm text-blue-100/80">
                <input
                  id="is_blocked"
                  name="is_blocked"
                  type="checkbox"
                  checked={form.isBlocked}
                  onChange={(e) => {
                    set("isBlocked", e.target.checked);
                  }}
                  className="size-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400"
                />
                Zablokowane
              </label>

              <label htmlFor="taken_for_production" className="flex items-center gap-2 text-sm text-blue-100/80">
                <input
                  id="taken_for_production"
                  name="taken_for_production"
                  type="checkbox"
                  checked={form.takenForProduction}
                  onChange={(e) => {
                    set("takenForProduction", e.target.checked);
                  }}
                  className="size-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-400"
                />
                Pobrane do produkcji
              </label>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-blue-100/80">Rozliczenie</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id="invoice_number" label="Numer faktury" error={errors.invoiceNumber}>
                <input
                  id="invoice_number"
                  name="invoice_number"
                  value={form.invoiceNumber}
                  onChange={(e) => {
                    set("invoiceNumber", e.target.value);
                  }}
                  maxLength={30}
                  className={inputClass}
                />
              </Field>

              <Field id="payment_due_date" label="Termin płatności">
                <input
                  id="payment_due_date"
                  name="payment_due_date"
                  type="date"
                  value={form.paymentDueDate}
                  onChange={(e) => {
                    set("paymentDueDate", e.target.value);
                  }}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
              </Field>

              <Field id="payment_date" label="Data płatności">
                <input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => {
                    set("paymentDate", e.target.value);
                  }}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
              </Field>
            </div>
          </div>
        </>
      )}

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

      <SubmitButton
        pendingText={isEdit ? "Zapisywanie zmian…" : "Zapisywanie…"}
        icon={isEdit ? <Pencil className="size-4" /> : <PackagePlus className="size-4" />}
      >
        {isEdit ? "Zapisz zmiany" : "Zapisz zamówienie"}
      </SubmitButton>
    </form>
  );
}
