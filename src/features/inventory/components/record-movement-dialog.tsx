"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  inventoryMovementSchema,
  type InventoryMovementInput,
  type InventoryMovementOutput,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_VALUE_BY_LABEL,
} from "@/features/inventory/schema";
import { recordInventoryMovement } from "@/features/inventory/actions";

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
};

export function RecordMovementDialog({
  products,
}: {
  products: ProductOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InventoryMovementInput, unknown, InventoryMovementOutput>({
    resolver: zodResolver(inventoryMovementSchema),
    defaultValues: { productId: "", type: "IN", quantity: 0, reason: "" },
  });

  const selectedProductId = watch("productId");
  const selectedType = watch("type");
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );

  function onSubmit(values: InventoryMovementOutput) {
    startTransition(async () => {
      const result = await recordInventoryMovement(values);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تسجيل حركة المخزون بنجاح");
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            تسجيل حركة مخزون
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل حركة مخزون</DialogTitle>
          <DialogDescription>
            سجل عملية إدخال أو إخراج أو تسوية لكمية أحد المنتجات
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isPending} className="contents space-y-4">
          <div className="space-y-2">
            <Label>المنتج</Label>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
            {errors.productId && (
              <p className="text-sm text-destructive">
                {errors.productId.message}
              </p>
            )}
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                الكمية الحالية: {selectedProduct.quantity.toLocaleString("ar")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>نوع الحركة</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={MOVEMENT_TYPE_LABELS[field.value] ?? field.value}
                  onValueChange={(label) => {
                    if (!label) return;
                    const value = MOVEMENT_TYPE_VALUE_BY_LABEL[label];
                    if (value) field.onChange(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOVEMENT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={label}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-quantity">
              {selectedType === "ADJUSTMENT" ? "الكمية الجديدة" : "الكمية"}
            </Label>
            <Input
              id="movement-quantity"
              type="number"
              min={0}
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">
                {errors.quantity.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="movement-reason">السبب (اختياري)</Label>
            <Input id="movement-reason" {...register("reason")} />
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isPending}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
