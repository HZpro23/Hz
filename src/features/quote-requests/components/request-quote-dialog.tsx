"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createQuoteRequestSchema,
  type CreateQuoteRequestInput,
  type CreateQuoteRequestOutput,
} from "@/features/quote-requests/schema";
import { submitQuoteRequest } from "@/features/quote-requests/actions";

const CONTACT_STORAGE_KEY = "quote-contact-info";

type StoredContact = {
  customerName?: string;
  phone?: string;
  email?: string;
};

function readStoredContact(): StoredContact | null {
  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredContact(contact: StoredContact) {
  try {
    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
  } catch {
    // localStorage unavailable (private mode, disabled, etc.) — ignore
  }
}

export function RequestQuoteDialog({
  productId,
  productName,
  trigger,
}: {
  productId?: string;
  productName?: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateQuoteRequestInput, unknown, CreateQuoteRequestOutput>({
    resolver: zodResolver(createQuoteRequestSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      quantity: 1,
      notes: "",
      productId,
    },
  });

  useEffect(() => {
    if (!open) return;
    const stored = readStoredContact();
    if (!stored) return;
    reset((prev) => ({
      ...prev,
      customerName: stored.customerName || prev.customerName,
      phone: stored.phone || prev.phone,
      email: stored.email || prev.email,
    }));
  }, [open, reset]);

  function onSubmit(values: CreateQuoteRequestOutput) {
    startTransition(async () => {
      const result = await submitQuoteRequest(values);
      if (result?.error) return;
      writeStoredContact({
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
      });
      setSubmitted(true);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitted(false);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        {submitted ? (
          <div className="space-y-4 py-4 text-center">
            <DialogHeader>
              <DialogTitle>تم إرسال طلبك بنجاح</DialogTitle>
              <DialogDescription>
                تم إرسال طلبك بنجاح، وسوف نتواصل معك قريباً.
              </DialogDescription>
            </DialogHeader>
            <Button
              className="w-full cursor-pointer"
              onClick={() => setOpen(false)}
            >
              إغلاق
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>طلب عرض سعر</DialogTitle>
              <DialogDescription>
                {productName
                  ? `للمنتج: ${productName}`
                  : "سنتواصل معك بعرض السعر المناسب في أقرب وقت"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quote-name">الاسم</Label>
                <Input id="quote-name" {...register("customerName")} />
                {errors.customerName && (
                  <p className="text-sm text-destructive">
                    {errors.customerName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-phone">رقم الهاتف / واتساب</Label>
                <Input id="quote-phone" dir="ltr" {...register("phone")} />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-email">
                  البريد الإلكتروني (اختياري)
                </Label>
                <Input
                  id="quote-email"
                  type="email"
                  dir="ltr"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-quantity">الكمية</Label>
                <Input
                  id="quote-quantity"
                  type="number"
                  min={1}
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-notes">ملاحظات (اختياري)</Label>
                <Textarea id="quote-notes" rows={3} {...register("notes")} />
              </div>
              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={isPending}
              >
                {isPending ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
