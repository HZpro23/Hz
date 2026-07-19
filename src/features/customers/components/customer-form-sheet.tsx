"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  customerSchema,
  type CustomerInput,
} from "@/features/customers/schema";
import {
  createCustomer,
  updateCustomer,
  findCustomerByPhoneAction,
} from "@/features/customers/actions";
import { ar } from "@/i18n/ar";

type MatchingCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

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
  onOpenChange,
}: {
  open: boolean;
  customer?: CustomerRecord;
  /** Overrides the default URL-param-driven close behavior (used on the customers list page). */
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
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

  const phoneValue = watch("phone");
  const [matchingCustomers, setMatchingCustomers] = useState<MatchingCustomer[]>(
    [],
  );

  useEffect(() => {
    if (customer || !phoneValue || phoneValue.trim().length < 6) {
      setMatchingCustomers([]);
      return;
    }
    const timeout = setTimeout(() => {
      findCustomerByPhoneAction(phoneValue).then(setMatchingCustomers);
    }, 400);
    return () => clearTimeout(timeout);
  }, [phoneValue, customer]);

  function close() {
    if (onOpenChange) {
      onOpenChange(false);
      return;
    }
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
      <fieldset disabled={isPending} className="contents">
        <div className="space-y-2">
          <Label htmlFor="customer-name">الاسم الكامل</Label>
          <Input
            id="customer-name"
            placeholder="الاسم واللقب"
            {...register("name")}
          />
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
          {matchingCustomers.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
              <p className="mb-1 font-medium">
                {ar.customers.matchingPhoneHint}
              </p>
              <ul className="space-y-1">
                {matchingCustomers.map((match) => (
                  <li key={match.id}>
                    <button
                      type="button"
                      className="text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        const params = new URLSearchParams(
                          searchParams.toString(),
                        );
                        params.delete("new");
                        params.set("edit", match.id);
                        router.push(`${pathname}?${params.toString()}`);
                      }}
                    >
                      {match.name} — {match.phone}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "جاري الحفظ..." : ar.common.save}
        </Button>
      </fieldset>
      </form>
    </FormSheet>
  );
}
