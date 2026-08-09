"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  purchaseOrderSchema,
  type PurchaseOrderInput,
  type PurchaseOrderOutput,
} from "@/features/purchases/schema";
import { INVOICE_LANGUAGE_LABELS } from "@/features/invoices/schema";
import { createPurchaseOrder } from "@/features/purchases/actions";
import { formatCurrency } from "@/lib/currency";
import { CategoryQuickAddPanel } from "@/features/products/components/category-quick-add-panel";
import type { InvoiceLanguage } from "@/generated/prisma/client";

type Option = { id: string; name: string };
type ProductOption = {
  id: string;
  name: string;
  sku: string;
  price1: number;
  price2: number;
  price3: number;
  categoryId: string;
  brandId: string | null;
};

const NONE_SUPPLIER: Option = { id: "", name: "اختر مورداً..." };
const NONE_PRODUCT: ProductOption = {
  id: "",
  name: "اختر منتجاً...",
  sku: "",
  price1: 0,
  price2: 0,
  price3: 0,
  categoryId: "",
  brandId: null,
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

function SupplierPickerField({
  value,
  onChange,
  suppliers,
}: {
  value: string;
  onChange: (supplier: Option | null) => void;
  suppliers: Option[];
}) {
  const { contains } = useComboboxFilter();
  const items = [NONE_SUPPLIER, ...suppliers];
  const selected = items.find((item) => item.id === value) ?? NONE_SUPPLIER;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(supplier: Option | null) => onChange(supplier)}
      isItemEqualToValue={(a: Option, b: Option) => a.id === b.id}
      itemToStringValue={(item: Option) => item.id}
      itemToStringLabel={(item: Option) => item.name}
      filter={contains}
    >
      <ComboboxTrigger className="w-full sm:w-80">
        <ComboboxValue />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput placeholder="ابحث باسم المورد..." />
        <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
        <ComboboxList>
          {(item: Option) => (
            <ComboboxItem key={item.id} value={item}>
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function ProductPickerField({
  value,
  onChange,
  products,
  autoOpen,
}: {
  value: string;
  onChange: (product: ProductOption | null) => void;
  products: ProductOption[];
  autoOpen?: boolean;
}) {
  const { contains } = useComboboxFilter();
  const items = [NONE_PRODUCT, ...products];
  const selected = items.find((item) => item.id === value) ?? NONE_PRODUCT;
  // Only the row that was just added needs to be a controlled combobox (so
  // it can force itself open on mount) — every other row stays uncontrolled
  // so clicking it opens instantly via Base UI's own handling, with no
  // React round-trip in the way.
  const [isAutoOpenRow] = useState(() => autoOpen === true);
  const [open, setOpen] = useState(isAutoOpenRow);

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(product: ProductOption | null) => onChange(product)}
      isItemEqualToValue={(a: ProductOption, b: ProductOption) => a.id === b.id}
      itemToStringValue={(item: ProductOption) => item.id}
      itemToStringLabel={productLabel}
      filter={contains}
      {...(isAutoOpenRow ? { open, onOpenChange: setOpen } : {})}
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

export function PurchaseOrderForm({
  suppliers,
  products,
  categories,
  brands,
}: {
  suppliers: Option[];
  products: ProductOption[];
  categories: Option[];
  brands: Option[];
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseOrderInput, unknown, PurchaseOrderOutput>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      language: "AR",
      items: [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null);
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );

  function handleAddFromCategory(selected: ProductOption[]) {
    const isOnlyEmptyRow = fields.length === 1 && !items?.[0]?.productId;

    selected.forEach((product, index) => {
      if (index === 0 && isOnlyEmptyRow) {
        setValue("items.0.productId", product.id);
        setValue("items.0.quantity", 1);
        setValue("items.0.unitCost", product.price1);
        return;
      }
      append({ productId: product.id, quantity: 1, unitCost: product.price1 });
    });

    toast.success(
      `تمت إضافة ${selected.length.toLocaleString("ar")} منتج إلى أمر الشراء`,
    );
  }

  function onSubmit(values: PurchaseOrderOutput) {
    startTransition(async () => {
      const result = await createPurchaseOrder(values);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
    <fieldset disabled={isPending} className="contents space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>المورد</Label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <SupplierPickerField
                value={field.value ?? ""}
                suppliers={suppliers}
                onChange={(supplier) => field.onChange(supplier?.id ?? "")}
              />
            )}
          />
          {errors.supplierId && (
            <p className="text-sm text-destructive">
              {errors.supplierId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>لغة فاتورة الشراء</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select
                items={INVOICE_LANGUAGE_LABELS}
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as InvoiceLanguage)
                }
              >
                <SelectTrigger className="w-full sm:w-56">
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

      <div className="space-y-3">
        <Label>العناصر</Label>

        <div
          className={
            fields.length > 5
              ? "max-h-120 space-y-3 overflow-y-auto pe-1"
              : "space-y-3"
          }
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">المنتج</Label>
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  render={({ field: productField }) => (
                    <ProductPickerField
                      value={productField.value ?? ""}
                      products={products}
                      autoOpen={index === autoOpenIndex}
                      onChange={(product) => {
                        productField.onChange(product?.id ?? "");
                        if (product?.id) {
                          setValue(`items.${index}.unitCost`, product.price1);
                        }
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الكمية</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-24"
                  {...register(`items.${index}.quantity`)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">تكلفة الوحدة</Label>
                <div className="flex w-32 flex-col gap-1.5">
                  <PriceTierField
                    price={Number(items?.[index]?.unitCost) || 0}
                    product={productsById.get(
                      items?.[index]?.productId ?? "",
                    )}
                    onChange={(price) =>
                      setValue(`items.${index}.unitCost`, price)
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`items.${index}.unitCost`)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        {errors.items?.message && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setAutoOpenIndex(fields.length);
            append({ productId: "", quantity: 1, unitCost: 0 });
          }}
        >
          <Plus className="size-4" />
          إضافة عنصر
        </Button>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
        <Button type="submit" className="cursor-pointer" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "جاري الحفظ..." : "إنشاء أمر الشراء"}
        </Button>
      </div>
      </div>

      <div className="space-y-6">
        <CategoryQuickAddPanel
          categories={categories}
          brands={brands}
          products={products}
          onAddProducts={handleAddFromCategory}
        />
      </div>
      </div>
      </fieldset>
    </form>
  );
}
