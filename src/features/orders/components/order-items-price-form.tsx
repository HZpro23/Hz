"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  orderItemsSchema,
  type OrderItemsInput,
  type OrderItemsOutput,
} from "@/features/orders/schema";
import { updateOrderItems } from "@/features/orders/actions";
import {
  ProductDetailsDialog,
  type OrderItemProduct,
} from "@/features/orders/components/product-details-dialog";
import { InvoiceLockedNotice } from "@/features/orders/components/invoice-locked-notice";
import { formatCurrency } from "@/lib/currency";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  price1: number;
  price2: number;
  price3: number;
  quantity: number;
};

const NONE_PRODUCT: ProductOption = {
  id: "",
  name: "اختر منتجاً...",
  sku: "",
  price1: 0,
  price2: 0,
  price3: 0,
  quantity: 0,
};

const CUSTOM_PRICE = "سعر مخصص";

function SortableTableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <button
      type="button"
      className="cursor-grab touch-none text-muted-foreground outline-none hover:text-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 opacity-50" : undefined}
    >
      {children(dragHandle)}
    </TableRow>
  );
}

function productLabel(product: ProductOption) {
  return product.id ? `${product.name} (${product.sku})` : product.name;
}

function priceTierLabel(
  price: number,
  product: { price1: number; price2: number; price3: number },
) {
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
  product: { price1: number; price2: number; price3: number } | undefined;
  onChange: (price: number) => void;
}) {
  if (!product) return null;

  return (
    <Select
      value={priceTierLabel(price, product)}
      onValueChange={(label) => {
        if (label === "السعر الأول") onChange(product.price1);
        else if (label === "السعر الثاني") onChange(product.price2);
        else if (label === "السعر الثالث") onChange(product.price3);
      }}
    >
      <SelectTrigger className="w-36">
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

export function OrderItemsPriceForm({
  orderId,
  items,
  products,
  locked = false,
  invoiceId,
  invoiceNumber,
}: {
  orderId: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    product: OrderItemProduct;
  }[];
  products: ProductOption[];
  locked?: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<OrderItemsInput, unknown, OrderItemsOutput>({
    resolver: zodResolver(orderItemsSchema),
    defaultValues: {
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        price: item.price,
        quantity: item.quantity,
      })),
    },
  });

  useUnsavedChangesGuard(!locked && isDirty);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  const [initialItemByFieldId] = useState(() => {
    const map = new Map<string, { productId: string; quantity: number }>();
    fields.forEach((field, i) => {
      const original = items[i];
      if (original) {
        map.set(field.id, {
          productId: original.productId,
          quantity: original.quantity,
        });
      }
    });
    return map;
  });

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
    if (oldIndex !== -1 && newIndex !== -1) {
      move(oldIndex, newIndex);
    }
  }

  const watchedItems = watch("items");
  const productsById = new Map(products.map((product) => [product.id, product]));

  const total = fields.reduce((sum, _field, index) => {
    const price = Number(watchedItems?.[index]?.price ?? 0) || 0;
    const quantity = Number(watchedItems?.[index]?.quantity ?? 0) || 0;
    return sum + price * quantity;
  }, 0);

  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const stockIssues = (watchedItems ?? [])
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

  function onSubmit(values: OrderItemsOutput) {
    if (hasStockIssue && !allowNegativeStock) {
      toast.error(
        "الكمية المطلوبة من بعض المنتجات أكبر من المتوفر في المخزون. الرجاء الموافقة على المتابعة أو تعديل الكميات.",
      );
      return;
    }

    startTransition(async () => {
      const result = await updateOrderItems(orderId, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث الطلب بنجاح");
      reset(getValues());
    });
  }

  if (locked) {
    const lockedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return (
      <div className="space-y-4">
        {invoiceId && invoiceNumber && (
          <InvoiceLockedNotice
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            message="تم إصدار فاتورة لهذا الطلب، لذلك لا يمكن تعديل عناصره بعد الآن. لإجراء أي تعديل، يرجى التعامل مع الفاتورة مباشرة."
          />
        )}
        <div className={items.length > 5 ? "max-h-120 overflow-y-auto" : undefined}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المنتج</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.price)}</TableCell>
                <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                <TableCell>
                  <ProductDetailsDialog product={item.product} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <div className="border-t pt-4">
          <p className="font-medium">الإجمالي الكلي: {formatCurrency(lockedTotal)}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset disabled={isPending} className="contents space-y-4">
      <div className={fields.length > 5 ? "max-h-120 overflow-y-auto" : undefined}>
      <DndContext
        id="order-items-price-dnd"
        sensors={dragSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>المنتج</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>الإجمالي</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
          {fields.map((field, index) => {
            const existingItem = items[index];
            const isExisting = Boolean(existingItem);
            const price = Number(watchedItems?.[index]?.price ?? 0) || 0;
            const quantity = Number(watchedItems?.[index]?.quantity ?? 0) || 0;
            const selectedProduct = existingItem
              ? existingItem.product
              : productsById.get(watchedItems?.[index]?.productId ?? "");

            return (
              <SortableTableRow key={field.id} id={field.id}>
                {(dragHandle) => (
                  <>
                <TableCell>
                  <div className="flex items-center justify-center">
                    {dragHandle}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {isExisting ? (
                    existingItem.productName
                  ) : (
                    <div className="space-y-1">
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
                                setValue(`items.${index}.price`, product.price1);
                              }
                            }}
                          />
                        )}
                      />
                      {errors.items?.[index]?.productId && (
                        <p className="text-sm text-destructive">
                          {errors.items[index]?.productId?.message}
                        </p>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const requestedQty = quantity;
                    const currentProductId =
                      existingItem?.productId ??
                      watchedItems?.[index]?.productId ??
                      "";
                    const originalItem = initialItemByFieldId.get(field.id);
                    const alreadyAllocated =
                      originalItem?.productId === currentProductId
                        ? (originalItem?.quantity ?? 0)
                        : 0;
                    const effectiveAvailable =
                      (selectedProduct?.quantity ?? 0) + alreadyAllocated;
                    const isOverStock =
                      Boolean(currentProductId) &&
                      requestedQty > effectiveAvailable;
                    return (
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        aria-invalid={isOverStock}
                        {...register(`items.${index}.quantity`)}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <PriceTierField
                      price={price}
                      product={selectedProduct}
                      onChange={(nextPrice) =>
                        setValue(`items.${index}.price`, nextPrice)
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28"
                      {...register(`items.${index}.price`)}
                    />
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(price * quantity)}</TableCell>
                <TableCell>
                  {isExisting ? (
                    <ProductDetailsDialog product={existingItem.product} />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
                  </>
                )}
              </SortableTableRow>
            );
          })}
          </SortableContext>
        </TableBody>
      </Table>
      </DndContext>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={() => append({ productId: "", quantity: 1, price: 0 })}
      >
        <Plus className="size-4" />
        إضافة منتج
      </Button>

      {hasStockIssue && (
        <label className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <Checkbox
            checked={allowNegativeStock}
            onCheckedChange={(checked) =>
              setAllowNegativeStock(checked === true)
            }
          />
          <span className="text-destructive">
            الكمية المطلوبة من بعض المنتجات أكبر من المتوفر في المخزون. أوافق
            على المتابعة رغم ذلك (سيصبح مخزون هذه المنتجات سالباً).
          </span>
        </label>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي الكلي: {formatCurrency(total)}</p>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
