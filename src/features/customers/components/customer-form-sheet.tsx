"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  customerSchema,
  type CustomerInput,
} from "@/features/customers/schema";
import { createCustomer, updateCustomer } from "@/features/customers/actions";
import { ar } from "@/i18n/ar";

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
} | null;

export function CustomerFormSheet({
  open,
  customer,
}: {
  open: boolean;
  customer?: CustomerRecord;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
    },
  });

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("edit");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSubmit(values: CustomerInput) {
    startTransition(async () => {
      const result = customer
        ? await updateCustomer(customer.id, values)
        : await createCustomer(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        customer ? "تم تحديث بيانات العميل" : "تم إضافة العميل بنجاح",
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
      title={customer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">الاسم</Label>
          <Input id="customer-name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">رقم الهاتف / واتساب</Label>
          <Input id="customer-phone" dir="ltr" {...register("phone")} />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-email">البريد الإلكتروني (اختياري)</Label>
          <Input id="customer-email" dir="ltr" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-address">العنوان (اختياري)</Label>
          <Input id="customer-address" {...register("address")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-notes">ملاحظات (اختياري)</Label>
          <Textarea id="customer-notes" rows={3} {...register("notes")} />
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
