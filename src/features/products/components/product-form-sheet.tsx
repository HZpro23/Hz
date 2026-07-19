"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CloudinaryUploader,
  type UploadedImage,
} from "@/components/shared/cloudinary-uploader";
import {
  productSchema,
  type ProductInput,
  type ProductOutput,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_VALUE_BY_LABEL,
} from "@/features/products/schema";
import { createProduct, updateProduct } from "@/features/products/actions";
import { ar } from "@/i18n/ar";

type Option = { id: string; name: string };
type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: string;
  brandId: string | null;
  quantity: number;
  minStockLevel: number;
  price1: number;
  price2: number;
  price3: number;
  status: "ACTIVE" | "INACTIVE";
  images: UploadedImage[];
} | null;

export function ProductFormSheet({
  open,
  product,
  categoryOptions,
  brandOptions,
}: {
  open: boolean;
  product?: ProductRecord;
  categoryOptions: Option[];
  brandOptions: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductInput, unknown, ProductOutput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      barcode: product?.barcode ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      brandId: product?.brandId ?? null,
      quantity: product?.quantity ?? 1,
      minStockLevel: product?.minStockLevel ?? 0,
      price1: product?.price1 ?? 0,
      price2: product?.price2 ?? 0,
      price3: product?.price3 ?? 0,
      status: product?.status ?? "ACTIVE",
      images: product?.images ?? [],
    },
  });

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: ProductOutput) {
    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, values)
        : await createProduct(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        product ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح",
      );
      close();
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={product ? "تعديل المنتج" : "إضافة منتج جديد"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <fieldset disabled={isPending} className="contents space-y-4">
        <div className="space-y-2">
          <Label>صور المنتج</Label>
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <CloudinaryUploader
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-name">اسم المنتج</Label>
          <Input id="product-name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="product-slug">الرابط (slug)</Label>
            <Input id="product-slug" dir="ltr" {...register("slug")} />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-sku">SKU</Label>
            <Input id="product-sku" dir="ltr" {...register("sku")} />
            {errors.sku && (
              <p className="text-sm text-destructive">{errors.sku.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-barcode">Barcode (اختياري)</Label>
          <Input id="product-barcode" dir="ltr" {...register("barcode")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">الوصف</Label>
          <Textarea
            id="product-description"
            rows={3}
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>القسم</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">
                {errors.categoryId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>العلامة التجارية</Label>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="بدون علامة تجارية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون علامة تجارية</SelectItem>
                    {brandOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="product-quantity">الكمية</Label>
            <Input
              id="product-quantity"
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
            <Label htmlFor="product-min-stock">الحد الأدنى للمخزون</Label>
            <Input
              id="product-min-stock"
              type="number"
              min={0}
              {...register("minStockLevel")}
            />
            {errors.minStockLevel && (
              <p className="text-sm text-destructive">
                {errors.minStockLevel.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="product-price1">السعر الأول</Label>
            <Input
              id="product-price1"
              type="number"
              min={0}
              step="0.01"
              {...register("price1")}
            />
            {errors.price1 && (
              <p className="text-sm text-destructive">
                {errors.price1.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-price2">السعر الثاني</Label>
            <Input
              id="product-price2"
              type="number"
              min={0}
              step="0.01"
              {...register("price2")}
            />
            {errors.price2 && (
              <p className="text-sm text-destructive">
                {errors.price2.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-price3">السعر الثالث</Label>
            <Input
              id="product-price3"
              type="number"
              min={0}
              step="0.01"
              {...register("price3")}
            />
            {errors.price3 && (
              <p className="text-sm text-destructive">
                {errors.price3.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>الحالة</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                value={PRODUCT_STATUS_LABELS[field.value] ?? field.value}
                onValueChange={(label) => {
                  if (!label) return;
                  const value = PRODUCT_STATUS_VALUE_BY_LABEL[label];
                  if (value) field.onChange(value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRODUCT_STATUS_LABELS.ACTIVE}>
                    {PRODUCT_STATUS_LABELS.ACTIVE}
                  </SelectItem>
                  <SelectItem value={PRODUCT_STATUS_LABELS.INACTIVE}>
                    {PRODUCT_STATUS_LABELS.INACTIVE}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={isPending}
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "جاري الحفظ..." : ar.common.save}
        </Button>
      </fieldset>
      </form>
    </FormSheet>
  );
}
