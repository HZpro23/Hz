"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ar } from "@/i18n/ar";
import {
  CustomerPicker,
  type CustomerOption,
} from "@/features/customers/components/customer-picker";
import { PaymentFieldsSection } from "@/features/invoices/components/payment-fields";
import { PaymentHistory } from "@/features/invoices/components/payment-history";
import { BalanceConfirmDialog } from "@/features/invoices/components/balance-confirm-dialog";
import {
  checkBalanceConfirmation,
  capBalanceLines,
  type BalanceConfirmRequest,
} from "@/features/invoices/balance-resolution";

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
  name: "بدون منتج محدد",
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

type CategoryOption = { id: string; name: string };

const NONE_CATEGORY: CategoryOption = { id: "", name: "اختر قسماً..." };
const NONE_BRAND: CategoryOption = { id: "", name: "اختر علامة تجارية..." };

/**
 * Lets the admin pick a category and/or brand, see the matching products,
 * check off one or more, and add all of them to the invoice's items at
 * once — a faster path than adding rows one by one via the product search
 * above.
 */
function CategoryQuickAddPanel({
  categories,
  brands,
  products,
  onAddProducts,
}: {
  categories: CategoryOption[];
  brands: CategoryOption[];
  products: ProductOption[];
  onAddProducts: (products: ProductOption[]) => void;
}) {
  const { contains } = useComboboxFilter();
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categoryItems = [NONE_CATEGORY, ...categories];
  const selectedCategory =
    categoryItems.find((item) => item.id === categoryId) ?? NONE_CATEGORY;

  const brandItems = [NONE_BRAND, ...brands];
  const selectedBrand =
    brandItems.find((item) => item.id === brandId) ?? NONE_BRAND;

  const hasFilter = Boolean(categoryId) || Boolean(brandId);
  const trimmedQuery = productQuery.trim().toLowerCase();
  const filteredProducts = hasFilter
    ? products
        .filter((product) => !categoryId || product.categoryId === categoryId)
        .filter((product) => !brandId || product.brandId === brandId)
        .filter(
          (product) =>
            !trimmedQuery ||
            product.name.toLowerCase().includes(trimmedQuery) ||
            product.sku.toLowerCase().includes(trimmedQuery),
        )
    : [];

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const toAdd = filteredProducts.filter((product) => selectedIds.has(product.id));
    if (toAdd.length === 0) return;
    onAddProducts(toAdd);
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <Label>إضافة سريعة حسب القسم أو العلامة التجارية</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Combobox
          items={categoryItems}
          value={selectedCategory}
          onValueChange={(category: CategoryOption | null) => {
            setCategoryId(category?.id ?? "");
            setSelectedIds(new Set());
          }}
          isItemEqualToValue={(a: CategoryOption, b: CategoryOption) => a.id === b.id}
          itemToStringValue={(item: CategoryOption) => item.id}
          itemToStringLabel={(item: CategoryOption) => item.name}
          filter={contains}
        >
          <ComboboxTrigger className="w-full">
            <ComboboxValue />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="ابحث عن قسم..." />
            <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOption) => (
                <ComboboxItem key={item.id} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Combobox
          items={brandItems}
          value={selectedBrand}
          onValueChange={(brand: CategoryOption | null) => {
            setBrandId(brand?.id ?? "");
            setSelectedIds(new Set());
          }}
          isItemEqualToValue={(a: CategoryOption, b: CategoryOption) => a.id === b.id}
          itemToStringValue={(item: CategoryOption) => item.id}
          itemToStringLabel={(item: CategoryOption) => item.name}
          filter={contains}
        >
          <ComboboxTrigger className="w-full">
            <ComboboxValue />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="ابحث عن علامة تجارية..." />
            <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOption) => (
                <ComboboxItem key={item.id} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {hasFilter && (
        <>
          <Input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="ابحث بالاسم أو SKU..."
          />
          {filteredProducts.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              لا توجد منتجات مطابقة
            </p>
          ) : (
            <>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-1.5">
                {filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => toggle(product.id)}
                    />
                    <span className="flex-1 truncate">{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatCurrency(product.price1)}
                    </span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full cursor-pointer"
                disabled={selectedIds.size === 0}
                onClick={handleAdd}
              >
                <Plus className="size-4" />
                إضافة{" "}
                {selectedIds.size > 0
                  ? selectedIds.size.toLocaleString("ar")
                  : ""}{" "}
                إلى الفاتورة
              </Button>
            </>
          )}
        </>
      )}
    </div>
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
  categories,
  brands,
  orderId,
  payments,
}: {
  invoice?: InvoiceRecord;
  products: ProductOption[];
  customers: CustomerOption[];
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  orderId?: string;
  /** Only present when editing an existing invoice — renders the سجل
   * الدفعات sidebar alongside the quick-add-by-category panel. */
  payments?: {
    id: string;
    amount: number;
    method: string;
    note: string | null;
    createdAt: Date;
    invoiceNumber?: string;
  }[];
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
      payments: [],
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

  const customerId = watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerBalance = selectedCustomer?.balance ?? 0;
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
  function handleAddFromCategory(selected: ProductOption[]) {
    const isOnlyEmptyRow =
      fields.length === 1 && !items?.[0]?.productId && !items?.[0]?.name;

    selected.forEach((product, index) => {
      if (index === 0 && isOnlyEmptyRow) {
        setValue("items.0.productId", product.id);
        setValue("items.0.name", product.name);
        setValue("items.0.quantity", 1);
        setValue("items.0.unitPrice", product.price1);
        return;
      }
      append({
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price1,
      });
    });

    toast.success(
      `تمت إضافة ${selected.length.toLocaleString("ar")} منتج إلى الفاتورة`,
    );
  }

  const [pendingValues, setPendingValues] = useState<InvoiceOutput | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<BalanceConfirmRequest | null>(
    null,
  );

  function submitInvoice(values: InvoiceOutput) {
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

  function onSubmit(values: InvoiceOutput) {
    if (invoice) {
      submitInvoice(values);
      return;
    }

    const request = checkBalanceConfirmation({
      total,
      customerBalance,
      hasCustomer: Boolean(values.customerId),
      lines: values.payments,
    });
    if (request) {
      setPendingValues(values);
      setConfirmRequest(request);
      return;
    }
    submitInvoice(values);
  }

  function cancelConfirm() {
    setConfirmRequest(null);
    setPendingValues(null);
  }

  function resolveUseAvailable() {
    if (!pendingValues || confirmRequest?.kind !== "insufficient") return;
    const payments = capBalanceLines(pendingValues.payments, confirmRequest.availableBalance);
    setConfirmRequest(null);
    submitInvoice({ ...pendingValues, payments });
  }

  function resolveGoNegative() {
    if (!pendingValues) return;
    setConfirmRequest(null);
    submitInvoice(pendingValues);
  }

  function resolveUseBalance() {
    if (!pendingValues || confirmRequest?.kind !== "offer-balance") return;
    const amount = Math.min(confirmRequest.remaining, confirmRequest.availableBalance);
    const payments = [...pendingValues.payments, { method: "BALANCE" as const, amount }];
    setConfirmRequest(null);
    submitInvoice({ ...pendingValues, payments });
  }

  function resolveDecline() {
    if (!pendingValues) return;
    setConfirmRequest(null);
    submitInvoice(pendingValues);
  }

  return (
    <>
    <div className="max-w-3xl space-y-6 lg:col-span-2">
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <fieldset disabled={isPending} className="contents space-y-6">
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

      {!invoice && (
        <PaymentFieldsSection
          control={control}
          errors={errors}
          total={total}
          customerBalance={customerBalance}
          hasCustomer={Boolean(customerId)}
        />
      )}

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
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending
            ? "جاري الحفظ..."
            : invoice
              ? "حفظ التعديلات"
              : "إنشاء الفاتورة"}
        </Button>
      </div>
      </fieldset>

      <BalanceConfirmDialog
        request={confirmRequest}
        onCancel={cancelConfirm}
        onUseAvailable={resolveUseAvailable}
        onGoNegative={resolveGoNegative}
        onUseBalance={resolveUseBalance}
        onDecline={resolveDecline}
      />
    </form>

    {!invoice && (
      <CategoryQuickAddPanel
        categories={categories}
        brands={brands}
        products={products}
        onAddProducts={handleAddFromCategory}
      />
    )}
    </div>

    {invoice && (
      <div className="space-y-6">
        <PaymentHistory payments={payments ?? []} />
        <CategoryQuickAddPanel
          categories={categories}
          brands={brands}
          products={products}
          onAddProducts={handleAddFromCategory}
        />
      </div>
    )}
    </>
  );
}
