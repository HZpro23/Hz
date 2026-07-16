"use client";

import { useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  useComboboxFilter,
  ComboboxValue,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import {
  invoiceSchema,
  type InvoiceInput,
  type InvoiceOutput,
  INVOICE_LANGUAGE_LABELS,
} from "@/features/invoices/schema";
import { createInvoice, updateInvoice } from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/currency";
import {
  CustomerPicker,
  type CustomerOption,
} from "@/features/customers/components/customer-picker";
import { PaymentFieldsSection } from "@/features/invoices/components/payment-fields";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  price1: number;
  price2: number;
  price3: number;
};

const NONE_PRODUCT: ProductOption = {
  id: "",
  name: "بدون منتج محدد",
  sku: "",
  price1: 0,
  price2: 0,
  price3: 0,
};

const CUSTOM_PRICE = "سعر مخصص";

function productLabel(product: ProductOption) {
  return product.id ? `${product.name} (${product.sku})` : product.name;
}

function priceTierLabel(price: number, product: ProductOption) {
  if (price === product.price1) return "السعر الأول";
  if (price === product.price2) return "السعر الثاني";
  if (price === product.price3) return "السعر الثالث";
  return CUSTOM_PRICE;
}

function PriceTierField({
  price,
  product,
  onChange,
}: {
  price: number;
  product: ProductOption | undefined;
  onChange: (price: number) => void;
}) {
  if (!product?.id) return null;

  return (
    <Select
      value={priceTierLabel(price, product)}
      onValueChange={(label) => {
        if (label === "السعر الأول") onChange(product.price1);
        else if (label === "السعر الثاني") onChange(product.price2);
        else if (label === "السعر الثالث") onChange(product.price3);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="السعر الأول">
          ({formatCurrency(product.price1)})
        </SelectItem>
        <SelectItem value="السعر الثاني">
          ({formatCurrency(product.price2)})
        </SelectItem>
        <SelectItem value="السعر الثالث">
          ({formatCurrency(product.price3)})
        </SelectItem>
        <SelectItem value={CUSTOM_PRICE}>{CUSTOM_PRICE}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ProductPickerField({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (product: ProductOption | null) => void;
  products: ProductOption[];
}) {
  const { contains } = useComboboxFilter();
  const items = [NONE_PRODUCT, ...products];
  const selected = items.find((item) => item.id === value) ?? NONE_PRODUCT;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(product: ProductOption | null) => onChange(product)}
      isItemEqualToValue={(a: ProductOption, b: ProductOption) => a.id === b.id}
      itemToStringValue={(item: ProductOption) => item.id}
      itemToStringLabel={productLabel}
      filter={contains}
    >
      <ComboboxTrigger className="w-full">
        <ComboboxValue />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="ابحث بالاسم أو SKU..." />
        <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
        <ComboboxList>
          {(item: ProductOption) => (
            <ComboboxItem key={item.id} value={item}>
              {productLabel(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type InvoiceRecord = {
  id: string;
  language: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  orderId: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: number;
  items: {
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
} | null;

export function InvoiceForm({
  invoice,
  products,
  customers,
  orderId,
}: {
  invoice?: InvoiceRecord;
  products: ProductOption[];
  customers: CustomerOption[];
  orderId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceInput, unknown, InvoiceOutput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      language: (invoice?.language as InvoiceOutput["language"]) ?? "AR",
      customerId: invoice?.customerId ?? "",
      customerName: invoice?.customerName ?? "",
      customerPhone: invoice?.customerPhone ?? "",
      customerEmail: invoice?.customerEmail ?? "",
      notes: invoice?.notes ?? "",
      orderId: invoice?.orderId ?? orderId ?? "",
      paymentMethod:
        (invoice?.paymentMethod as InvoiceOutput["paymentMethod"]) ?? "CASH",
      paymentStatus:
        (invoice?.paymentStatus as InvoiceOutput["paymentStatus"]) ?? "UNPAID",
      paidAmount: invoice?.paidAmount ?? 0,
      items: invoice?.items.length
        ? invoice.items.map((item) => ({
            productId: item.productId ?? "",
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        : [{ productId: "", name: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const paymentStatus = watch("paymentStatus");
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  function onSubmit(values: InvoiceOutput) {
    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, values)
        : await createInvoice(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (invoice) toast.success("تم تحديث الفاتورة بنجاح");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>العميل</Label>
          <Controller
            control={control}
            name="customerId"
            render={({ field }) => (
              <CustomerPicker
                customers={customers}
                value={field.value}
                onChange={(customer) => {
                  field.onChange(customer?.id ?? "");
                  setValue("customerName", customer?.name ?? "");
                  setValue("customerPhone", customer?.phone ?? "");
                  setValue("customerEmail", customer?.email ?? "");
                }}
              />
            )}
          />
          {errors.customerId && (
            <p className="text-sm text-destructive">
              {errors.customerId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>لغة الفاتورة</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select
                items={INVOICE_LANGUAGE_LABELS}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_LANGUAGE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <PaymentFieldsSection
        control={control}
        paymentStatus={paymentStatus}
        errors={errors}
      />

      <div className="space-y-2">
        <Label htmlFor="invoice-notes">ملاحظات (اختياري)</Label>
        <Textarea id="invoice-notes" rows={2} {...register("notes")} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>المنتجات</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              append({ productId: "", name: "", quantity: 1, unitPrice: 0 })
            }
          >
            <Plus className="size-4" />
            إضافة منتج
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 items-start gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">اختر من المنتجات</Label>
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  render={({ field: productField }) => (
                    <ProductPickerField
                      value={productField.value ?? ""}
                      products={products}
                      onChange={(product) => {
                        productField.onChange(product?.id ?? "");
                        if (product?.id) {
                          setValue(`items.${index}.name`, product.name);
                          setValue(`items.${index}.unitPrice`, product.price1);
                        }
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">اسم المنتج في الفاتورة</Label>
                <Input {...register(`items.${index}.name`)} />
                {errors.items?.[index]?.name && (
                  <p className="text-sm text-destructive">
                    {errors.items[index]?.name?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الكمية</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  {...register(`items.${index}.quantity`)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">السعر</Label>
                <div className="flex flex-col gap-1.5">
                  <PriceTierField
                    price={Number(items?.[index]?.unitPrice) || 0}
                    product={productsById.get(items?.[index]?.productId ?? "")}
                    onChange={(price) =>
                      setValue(`items.${index}.unitPrice`, price)
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24"
                    {...register(`items.${index}.unitPrice`)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="hidden text-xs sm:block">&nbsp;</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {errors.items?.message && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending
            ? "جاري الحفظ..."
            : invoice
              ? "حفظ التعديلات"
              : "إنشاء الفاتورة"}
        </Button>
      </div>
    </form>
  );
}
