"use client";

import { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  orderItemPricesSchema,
  type OrderItemPricesInput,
  type OrderItemPricesOutput,
} from "@/features/orders/schema";
import { updateOrderItemPrices } from "@/features/orders/actions";
import {
  ProductDetailsDialog,
  type OrderItemProduct,
} from "@/features/orders/components/product-details-dialog";
import { formatCurrency } from "@/lib/currency";

const CUSTOM_PRICE = "سعر مخصص";

function priceTierLabel(price: number, product: OrderItemProduct) {
  if (price === product.price1) return "السعر الأول";
  if (price === product.price2) return "السعر الثاني";
  if (price === product.price3) return "السعر الثالث";
  return CUSTOM_PRICE;
}

export function OrderItemsPriceForm({
  orderId,
  items,
}: {
  orderId: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    product: OrderItemProduct;
  }[];
}) {
  const [isPending, startTransition] = useTransition();

  const { control, register, handleSubmit, watch, setValue } = useForm<
    OrderItemPricesInput,
    unknown,
    OrderItemPricesOutput
  >({
    resolver: zodResolver(orderItemPricesSchema),
    defaultValues: {
      items: items.map((item) => ({ id: item.id, price: item.price })),
    },
  });

  const { fields } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const total = items.reduce((sum, item, index) => {
    const price = Number(watchedItems?.[index]?.price ?? item.price) || 0;
    return sum + price * item.quantity;
  }, 0);

  function onSubmit(values: OrderItemPricesOutput) {
    startTransition(async () => {
      const result = await updateOrderItemPrices(orderId, values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تحديث الأسعار بنجاح");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            const item = items[index];
            const price =
              Number(watchedItems?.[index]?.price ?? item.price) || 0;
            return (
              <TableRow key={field.id}>
                <TableCell className="font-medium">
                  {item.productName}
                </TableCell>
                <TableCell>{item.quantity.toLocaleString("ar")}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Select
                      value={priceTierLabel(price, item.product)}
                      onValueChange={(label) => {
                        if (label === "السعر الأول") {
                          setValue(`items.${index}.price`, item.product.price1);
                        } else if (label === "السعر الثاني") {
                          setValue(`items.${index}.price`, item.product.price2);
                        } else if (label === "السعر الثالث") {
                          setValue(`items.${index}.price`, item.product.price3);
                        }
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="السعر الأول">
                          ({formatCurrency(item.product.price1)})
                        </SelectItem>
                        <SelectItem value="السعر الثاني">
                          ({formatCurrency(item.product.price2)})
                        </SelectItem>
                        <SelectItem value="السعر الثالث">
                          ({formatCurrency(item.product.price3)})
                        </SelectItem>
                        <SelectItem value={CUSTOM_PRICE}>
                          {CUSTOM_PRICE}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28"
                      {...register(`items.${index}.price`)}
                    />
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(price * item.quantity)}</TableCell>
                <TableCell>
                  <ProductDetailsDialog product={item.product} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي الكلي: {formatCurrency(total)}</p>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending ? "جاري الحفظ..." : "حفظ الأسعار"}
        </Button>
      </div>
    </form>
  );
}
