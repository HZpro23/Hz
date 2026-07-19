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
  purchaseOrderSchema,
  type PurchaseOrderInput,
  type PurchaseOrderOutput,
} from "@/features/purchases/schema";
import { createPurchaseOrder } from "@/features/purchases/actions";
import { formatCurrency } from "@/lib/currency";

type Option = { id: string; name: string };
type ProductOption = { id: string; name: string; sku: string };

export function PurchaseOrderForm({
  suppliers,
  products,
}: {
  suppliers: Option[];
  products: ProductOption[];
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchaseOrderInput, unknown, PurchaseOrderOutput>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      items: [{ productId: "", quantity: 1, unitCost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0,
  );

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
      <div className="space-y-2">
        <Label>المورد</Label>
        <Controller
          control={control}
          name="supplierId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.supplierId && (
          <p className="text-sm text-destructive">
            {errors.supplierId.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>العناصر</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
          >
            <Plus className="size-4" />
            إضافة عنصر
          </Button>
        </div>

        <div className="space-y-3">
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
                    <Select
                      value={productField.value}
                      onValueChange={productField.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-28"
                  {...register(`items.${index}.unitCost`)}
                />
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
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي: {formatCurrency(total)}</p>
        <Button type="submit" className="cursor-pointer" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "جاري الحفظ..." : "إنشاء أمر الشراء"}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
