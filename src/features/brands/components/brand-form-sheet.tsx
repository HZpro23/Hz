"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CloudinaryUploader } from "@/components/shared/cloudinary-uploader";
import { brandSchema, type BrandInput } from "@/features/brands/schema";
import { createBrand, updateBrand } from "@/features/brands/actions";
import { ar } from "@/i18n/ar";

type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoPublicId: string | null;
} | null;

export function BrandFormSheet({
  open,
  brand,
}: {
  open: boolean;
  brand?: BrandRecord;
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
  } = useForm<BrandInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      logo:
        brand?.logoPublicId && brand?.logoUrl
          ? { publicId: brand.logoPublicId, secureUrl: brand.logoUrl }
          : null,
    },
  });

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: BrandInput) {
    startTransition(async () => {
      const result = brand
        ? await updateBrand(brand.id, values)
        : await createBrand(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        brand ? "تم تحديث العلامة التجارية" : "تم إضافة العلامة التجارية",
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
      title={brand ? "تعديل العلامة التجارية" : "إضافة علامة تجارية"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>شعار العلامة التجارية (اختياري)</Label>
          <Controller
            control={control}
            name="logo"
            render={({ field }) => (
              <CloudinaryUploader
                value={field.value ? [field.value] : []}
                onChange={(images) => field.onChange(images[0] ?? null)}
                maxImages={1}
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-name">الاسم</Label>
          <Input id="brand-name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-slug">الرابط (slug)</Label>
          <Input id="brand-slug" dir="ltr" {...register("slug")} />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={isPending}
        >
          {isPending ? "جاري الحفظ..." : ar.common.save}
        </Button>
      </form>
    </FormSheet>
  );
}
