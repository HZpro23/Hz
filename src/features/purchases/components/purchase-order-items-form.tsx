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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  purchaseOrderItemsSchema,
  type PurchaseOrderItemsInput,
  type PurchaseOrderItemsOutput,
} from "@/features/purchases/schema";
import { updatePurchaseOrderItems } from "@/features/purchases/actions";
import { formatCurrency } from "@/lib/currency";
import { CategoryQuickAddPanel } from "@/features/products/components/category-quick-add-panel";

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

export function PurchaseOrderItemsForm({
  purchaseOrderId,
  items,
  products,
  categories,
  brands,
  statusWarning,
  children,
}: {
  purchaseOrderId: string;
  items: { productId: string; quantity: number; unitCost: number }[];
  products: ProductOption[];
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  /** Shown above the item rows when this purchase order was already received. */
  statusWarning?: boolean;
  /** Rendered above the quick-add panel in the sidebar column (supplier/status/payment cards). */
  children?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseOrderItemsInput, unknown, PurchaseOrderItemsOutput>({
    resolver: zodResolver(purchaseOrderItemsSchema),
    defaultValues: {
      items: items.length ? items : [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null);
  const watchedItems = watch("items");
  const total = watchedItems.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );

  function handleAddFromCategory(selected: ProductOption[]) {
    const isOnlyEmptyRow = fields.length === 1 && !watchedItems?.[0]?.productId;

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

  function onSubmit(values: PurchaseOrderItemsOutput) {
    startTransition(async () => {
      const result = await updatePurchaseOrderItems(purchaseOrderId, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث عناصر أمر الشراء بنجاح");
    });
  }

  return (
    <>
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>العناصر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusWarning && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-400">
                تم استلام هذا الأمر بالفعل وأُضيفت كمياته إلى المخزون. تعديل
                العناصر هنا يُحدّث سجل أمر الشراء فقط، ولا يُعدّل كميات
                المخزون التي أُضيفت مسبقاً.
              </p>
            )}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset disabled={isPending} className="contents space-y-4">
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
                    price={Number(watchedItems?.[index]?.unitCost) || 0}
                    product={productsById.get(
                      watchedItems?.[index]?.productId ?? "",
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
                className="cursor-pointer"
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
          className="cursor-pointer"
          onClick={() => {
            setAutoOpenIndex(fields.length);
            append({ productId: "", quantity: 1, unitCost: 0 });
          }}
        >
          <Plus className="size-4" />
          إضافة عنصر
        </Button>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
          <Button type="submit" className="cursor-pointer" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </Button>
        </div>
      </fieldset>
    </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {children}
        <CategoryQuickAddPanel
          categories={categories}
          brands={brands}
          products={products}
          onAddProducts={handleAddFromCategory}
        />
      </div>
    </>
  );
}
