"use client";

import { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const { control, register, handleSubmit, watch } = useForm<
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
            const price = Number(watchedItems?.[index]?.price ?? item.price) || 0;
            return (
              <TableRow key={field.id}>
                <TableCell className="font-medium">
                  {item.productName}
                </TableCell>
                <TableCell>{item.quantity.toLocaleString("ar")}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-28"
                    {...register(`items.${index}.price`)}
                  />
                </TableCell>
                <TableCell>{(price * item.quantity).toFixed(2)}</TableCell>
                <TableCell>
                  <ProductDetailsDialog product={item.product} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي الكلي: {total.toFixed(2)}</p>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending ? "جاري الحفظ..." : "حفظ الأسعار"}
        </Button>
      </div>
    </form>
  );
}
