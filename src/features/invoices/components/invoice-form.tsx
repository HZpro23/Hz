"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, UserCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/shared/sortable-item";
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
import {
  createInvoice,
  updateInvoice,
  recordPaymentAcrossInvoices,
  fetchCustomerOutstandingInvoices,
} from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/currency";
import { CategoryQuickAddPanel } from "@/features/products/components/category-quick-add-panel";
import {
  InsufficientStockDialog,
  type StockWarning,
} from "@/components/shared/insufficient-stock-dialog";
import {
  CustomerPicker,
  type CustomerOption,
} from "@/features/customers/components/customer-picker";
import { PaymentFieldsSection } from "@/features/invoices/components/payment-fields";
import { PaymentHistory } from "@/features/invoices/components/payment-history";
import { BalanceConfirmDialog } from "@/features/invoices/components/balance-confirm-dialog";
import {
  DistributeExcessDialog,
  type OutstandingInvoiceRow,
} from "@/features/invoices/components/distribute-excess-dialog";
import {
  checkBalanceConfirmation,
  capBalanceLines,
  capPaymentLinesToTotal,
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
  quantity: number;
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
  quantity: 0,
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

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });
  // Quantity a row already held before this edit started, keyed by the
  // field's stable id (not its index, since drag-reordering changes index
  // but not id) — a row that's just keeping or lowering its own
  // already-committed quantity was never actually asking for more stock,
  // so it should never trip the insufficient-stock warning.
  const [initialItemByFieldId] = useState(() => {
    const map = new Map<string, { productId: string; quantity: number }>();
    fields.forEach((field, i) => {
      const original = invoice?.items[i];
      if (original) {
        map.set(field.id, {
          productId: original.productId ?? "",
          quantity: original.quantity,
        });
      }
    });
    return map;
  });
  const [autoOpenIndex, setAutoOpenIndex] = useState<number | null>(null);
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
  }
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const stockIssues = items
    .map((item, index) => {
      const selectedProduct = productsById.get(item.productId ?? "");
      if (!selectedProduct?.id) return null;
      const requestedQty = Number(item.quantity) || 0;
      const originalItem = initialItemByFieldId.get(fields[index]?.id ?? "");
      const alreadyAllocated =
        originalItem?.productId === selectedProduct.id
          ? (originalItem?.quantity ?? 0)
          : 0;
      const effectiveAvailable = selectedProduct.quantity + alreadyAllocated;
      if (requestedQty <= effectiveAvailable) return null;
      return {
        productName: selectedProduct.name,
        requestedQuantity: requestedQty,
        availableQuantity: effectiveAvailable,
      };
    })
    .filter((issue): issue is NonNullable<typeof issue> => issue !== null);
  const hasStockIssue = stockIssues.length > 0;

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

  const [pendingValues, setPendingValues] = useState<InvoiceOutput | null>(
    null,
  );
  const [stockWarning, setStockWarning] = useState<StockWarning>(null);
  const [confirmRequest, setConfirmRequest] =
    useState<BalanceConfirmRequest | null>(null);
  const [distributeState, setDistributeState] = useState<{
    excessAmount: number;
    invoices: OutstandingInvoiceRow[];
  } | null>(null);

  function submitInvoice(values: InvoiceOutput, excessToBalance?: boolean) {
    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, values)
        : await createInvoice(values, { excessToBalance });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (invoice) toast.success("تم تحديث الفاتورة بنجاح");
    });
  }

  async function onSubmit(values: InvoiceOutput) {
    if (hasStockIssue && !allowNegativeStock) {
      setStockWarning(stockIssues[0]);
      return;
    }

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

      if (request.kind === "excess-payment" && values.customerId) {
        const outstanding = await fetchCustomerOutstandingInvoices(
          values.customerId,
        );
        if (outstanding.length > 0) {
          setDistributeState({
            excessAmount: request.excessAmount,
            invoices: outstanding.map((row) => ({
              ...row,
              total: Number(row.total),
              paidAmount: Number(row.paidAmount),
            })),
          });
          return;
        }
      }

      setConfirmRequest(request);
      return;
    }
    submitInvoice(values);
  }

  function cancelConfirm() {
    setConfirmRequest(null);
    setPendingValues(null);
  }

  function handleDistributeConfirm(invoiceIds: string[]) {
    if (!pendingValues || !distributeState || !pendingValues.customerId) return;
    const method = pendingValues.payments[0]?.method ?? "CASH";
    const cappedPayments = capPaymentLinesToTotal(
      pendingValues.payments,
      total,
    );
    const customerId = pendingValues.customerId;
    const excessAmount = distributeState.excessAmount;
    const values = pendingValues;
    setDistributeState(null);
    setPendingValues(null);

    startTransition(async () => {
      const distributed = await recordPaymentAcrossInvoices(customerId, {
        invoiceIds,
        amount: excessAmount,
        method,
        note: "من فائض دفعة فاتورة جديدة",
        excessToBalance: true,
      });
      if (distributed.error) {
        toast.error(distributed.error);
        return;
      }

      const result = await createInvoice(
        { ...values, payments: cappedPayments },
        { batchId: distributed.batchId },
      );
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDistributeSkip() {
    if (!distributeState) return;
    setConfirmRequest({
      kind: "excess-payment",
      excessAmount: distributeState.excessAmount,
    });
    setDistributeState(null);
  }

  function resolveUseAvailable() {
    if (!pendingValues || confirmRequest?.kind !== "insufficient") return;
    const payments = capBalanceLines(
      pendingValues.payments,
      confirmRequest.availableBalance,
    );
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
    const amount = Math.min(
      confirmRequest.remaining,
      confirmRequest.availableBalance,
    );
    const payments = [
      ...pendingValues.payments,
      { method: "BALANCE" as const, amount },
    ];
    setConfirmRequest(null);
    submitInvoice({ ...pendingValues, payments });
  }

  function resolveDecline() {
    if (!pendingValues) return;
    setConfirmRequest(null);
    submitInvoice(pendingValues);
  }

  function resolveAddExcessToBalance() {
    if (!pendingValues) return;
    setConfirmRequest(null);
    submitInvoice(pendingValues, true);
  }

  function resolveDiscardExcess() {
    if (!pendingValues) return;
    setConfirmRequest(null);
    submitInvoice(pendingValues, false);
  }

  return (
    <>
      <div className="@container max-w-3xl space-y-6 lg:col-span-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <fieldset disabled={isPending} className="contents space-y-6">
            <div className="grid gap-4 @md:grid-cols-2">
              <div className="space-y-2 @md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>العميل</Label>
                  {customerId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto cursor-pointer gap-1 px-2 py-1 text-xs"
                      nativeButton={false}
                      render={
                        <Link href={`/dashboard/customers/${customerId}`} />
                      }
                    >
                      <UserCircle className="size-3.5" />
                      الذهاب إلى صفحة العميل
                    </Button>
                  )}
                </div>
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
              <Label>المنتجات ({fields.length})</Label>

              <DndContext
                id="invoice-items-dnd"
                sensors={dragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((field) => field.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className={
                      fields.length > 5
                        ? "max-h-120 space-y-3 overflow-y-auto pe-1"
                        : "space-y-3"
                    }
                  >
                    {fields.map((field, index) => (
                      <SortableItem
                        key={field.id}
                        id={field.id}
                        className="grid grid-cols-1 items-start gap-2 rounded-lg border p-3 @2xl:grid-cols-[auto_1fr_1fr_auto_auto_auto]"
                      >
                        {(dragHandle) => (
                          <>
                            <div className="flex items-center justify-center pt-1 @2xl:pt-6">
                              {dragHandle}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                اختر من المنتجات
                              </Label>
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
                                        setValue(
                                          `items.${index}.name`,
                                          product.name,
                                        );
                                        setValue(
                                          `items.${index}.unitPrice`,
                                          product.price1,
                                        );
                                      }
                                    }}
                                  />
                                )}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                اسم المنتج في الفاتورة
                              </Label>
                              <Input {...register(`items.${index}.name`)} />
                              {errors.items?.[index]?.name && (
                                <p className="text-sm text-destructive">
                                  {errors.items[index]?.name?.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">الكمية</Label>
                              {(() => {
                                const selectedProduct = productsById.get(
                                  items?.[index]?.productId ?? "",
                                );
                                const requestedQty =
                                  Number(items?.[index]?.quantity) || 0;
                                const originalItem = initialItemByFieldId.get(
                                  field.id,
                                );
                                const alreadyAllocated =
                                  originalItem?.productId === selectedProduct?.id
                                    ? (originalItem?.quantity ?? 0)
                                    : 0;
                                const effectiveAvailable =
                                  (selectedProduct?.quantity ?? 0) +
                                  alreadyAllocated;
                                const isOverStock =
                                  Boolean(selectedProduct?.id) &&
                                  requestedQty > effectiveAvailable;
                                return (
                                  <Input
                                    type="number"
                                    min={1}
                                    className="w-20"
                                    aria-invalid={isOverStock}
                                    {...register(`items.${index}.quantity`, {
                                      onBlur: () => {
                                        if (isOverStock && selectedProduct) {
                                          setStockWarning({
                                            productName: selectedProduct.name,
                                            requestedQuantity: requestedQty,
                                            availableQuantity: effectiveAvailable,
                                          });
                                        }
                                      },
                                    })}
                                  />
                                );
                              })()}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">السعر</Label>
                              <div className="flex flex-col gap-1.5">
                                <PriceTierField
                                  price={Number(items?.[index]?.unitPrice) || 0}
                                  product={productsById.get(
                                    items?.[index]?.productId ?? "",
                                  )}
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
                              <Label className="hidden text-xs @2xl:block">
                                &nbsp;
                              </Label>
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
                          </>
                        )}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {errors.items?.message && (
                <p className="text-sm text-destructive">
                  {errors.items.message}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  setAutoOpenIndex(fields.length);
                  append({
                    productId: "",
                    name: "",
                    quantity: 1,
                    unitPrice: 0,
                  });
                }}
              >
                <Plus className="size-4" />
                إضافة منتج
              </Button>
            </div>

            <div className="space-y-2 lg:hidden">
              <CategoryQuickAddPanel
                categories={categories}
                brands={brands}
                products={products}
                onAddProducts={handleAddFromCategory}
              />
            </div>

            {hasStockIssue && (
              <label className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <Checkbox
                  checked={allowNegativeStock}
                  onCheckedChange={(checked) =>
                    setAllowNegativeStock(checked === true)
                  }
                />
                <span className="text-destructive">
                  الكمية المطلوبة من بعض المنتجات أكبر من المتوفر في المخزون.
                  أوافق على المتابعة رغم ذلك (سيصبح مخزون هذه المنتجات
                  سالباً).
                </span>
              </label>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
              <Button
                type="submit"
                disabled={isPending}
                className="cursor-pointer"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending
                  ? "جاري الحفظ..."
                  : invoice
                    ? "حفظ التعديلات"
                    : "إنشاء الفاتورة"}
              </Button>
            </div>
          </fieldset>

          <InsufficientStockDialog
            warning={stockWarning}
            onClose={() => setStockWarning(null)}
          />

          <BalanceConfirmDialog
            request={confirmRequest}
            onCancel={cancelConfirm}
            onUseAvailable={resolveUseAvailable}
            onGoNegative={resolveGoNegative}
            onUseBalance={resolveUseBalance}
            onDecline={resolveDecline}
            onAddExcessToBalance={resolveAddExcessToBalance}
            onDiscardExcess={resolveDiscardExcess}
          />

          {distributeState && (
            <DistributeExcessDialog
              open
              excessAmount={distributeState.excessAmount}
              invoices={distributeState.invoices}
              onConfirm={handleDistributeConfirm}
              onSkip={handleDistributeSkip}
            />
          )}
        </form>
      </div>

      <div className="space-y-6 lg:col-span-1">
        {invoice ? (
          <>
            <div className="space-y-6">
              <PaymentHistory payments={payments ?? []} />
            </div>
            <div className="space-y-6 hidden lg:block">
              <CategoryQuickAddPanel
                categories={categories}
                brands={brands}
                products={products}
                onAddProducts={handleAddFromCategory}
              />
            </div>
          </>
        ) : (
          <div className="space-y-6 hidden lg:block">
            <CategoryQuickAddPanel
              categories={categories}
              brands={brands}
              products={products}
              onAddProducts={handleAddFromCategory}
            />
          </div>
        )}
      </div>
    </>
  );
}
