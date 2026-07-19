"use client";

import { useState, useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  createOrderSchema,
  ORDER_STATUS_LABELS,
  type CreateOrderInput,
  type CreateOrderOutput,
} from "@/features/orders/schema";
import { createOrder } from "@/features/orders/actions";
import { formatCurrency } from "@/lib/currency";
import {
  CustomerPicker,
  type CustomerOption,
} from "@/features/customers/components/customer-picker";
import { CustomerFormSheet } from "@/features/customers/components/customer-form-sheet";
import { ar } from "@/i18n/ar";

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

export function OrderForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderInput, unknown, CreateOrderOutput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: "",
      notes: "",
      items: [{ productId: "", quantity: 1, price: 0 }],
    },
  });

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0,
  );

  function onSubmit(values: CreateOrderOutput) {
    startTransition(async () => {
      const result = await createOrder(values);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isPending} className="contents">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>عناصر الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order-notes">ملاحظات (اختياري)</Label>
                <Textarea id="order-notes" rows={2} {...register("notes")} />
              </div>

              <div className="flex items-center justify-between">
                <Label>المنتجات</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    append({ productId: "", quantity: 1, price: 0 })
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
                    className="grid grid-cols-1 items-start gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto]"
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
                                setValue(
                                  `items.${index}.price`,
                                  product.price1,
                                );
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
                          price={Number(items?.[index]?.price) || 0}
                          product={productsById.get(
                            items?.[index]?.productId ?? "",
                          )}
                          onChange={(price) =>
                            setValue(`items.${index}.price`, price)
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-24"
                          {...register(`items.${index}.price`)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="hidden text-xs sm:block">
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
                  </div>
                ))}
              </div>
              {errors.items?.message && (
                <p className="text-sm text-destructive">
                  {errors.items.message}
                </p>
              )}

              <div className="flex items-center justify-between border-t pt-4">
                <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full cursor-pointer"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "جاري الإنشاء..." : "إنشاء الطلب"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>بيانات العميل</CardTitle>
              {selectedCustomer && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="cursor-pointer"
                  onClick={() => setEditCustomerOpen(true)}
                  title={ar.customers.editCustomerInfo}
                >
                  <Pencil className="size-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  اختر عميلاً موجوداً أو أنشئ عميلاً جديداً
                </Label>
                <Controller
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <CustomerPicker
                      customers={customers}
                      value={field.value}
                      onChange={(customer) => {
                        field.onChange(customer?.id ?? "");
                        setSelectedCustomer(customer);
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

              {selectedCustomer ? (
                <div className="space-y-2 border-t pt-3">
                  <p>
                    <span className="text-muted-foreground">الاسم: </span>
                    {selectedCustomer.name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">الهاتف: </span>
                    <span dir="ltr">{selectedCustomer.phone}</span>
                  </p>
                  {selectedCustomer.email && (
                    <p>
                      <span className="text-muted-foreground">
                        البريد الإلكتروني:{" "}
                      </span>
                      <span dir="ltr">{selectedCustomer.email}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="border-t pt-3 text-muted-foreground">
                  لم يتم اختيار عميل بعد
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الحالة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="secondary">{ORDER_STATUS_LABELS.PENDING}</Badge>
              <p className="text-xs text-muted-foreground">
                سيتم إنشاء الطلب بهذه الحالة، ويمكن تغييرها لاحقاً من صفحة
                الطلب.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </fieldset>

      {selectedCustomer && (
        <CustomerFormSheet
          open={editCustomerOpen}
          customer={{
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email ?? null,
            address: selectedCustomer.address ?? null,
            notes: selectedCustomer.notes ?? null,
          }}
          onOpenChange={(open) => {
            setEditCustomerOpen(open);
          }}
        />
      )}
    </form>
  );
}
