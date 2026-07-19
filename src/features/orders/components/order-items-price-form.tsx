"use client";

import { useTransition } from "react";
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
  name: "اختر منتجاً...",
  sku: "",
  price1: 0,
  price2: 0,
  price3: 0,
};

const CUSTOM_PRICE = "سعر مخصص";

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
    formState: { errors },
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

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const productsById = new Map(products.map((product) => [product.id, product]));

  const total = fields.reduce((sum, _field, index) => {
    const price = Number(watchedItems?.[index]?.price ?? 0) || 0;
    const quantity = Number(watchedItems?.[index]?.quantity ?? 0) || 0;
    return sum + price * quantity;
  }, 0);

  function onSubmit(values: OrderItemsOutput) {
    startTransition(async () => {
      const result = await updateOrderItems(orderId, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث الطلب بنجاح");
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
        <div className="border-t pt-4">
          <p className="font-medium">الإجمالي الكلي: {formatCurrency(lockedTotal)}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset disabled={isPending} className="contents">
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
          {fields.map((field, index) => {
            const existingItem = items[index];
            const isExisting = Boolean(existingItem);
            const price = Number(watchedItems?.[index]?.price ?? 0) || 0;
            const quantity = Number(watchedItems?.[index]?.quantity ?? 0) || 0;
            const selectedProduct = existingItem
              ? existingItem.product
              : productsById.get(watchedItems?.[index]?.productId ?? "");

            return (
              <TableRow key={field.id}>
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
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    {...register(`items.${index}.quantity`)}
                  />
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
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
