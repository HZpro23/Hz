"use client";

import { useTransition } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
  invoiceSchema,
  type InvoiceInput,
  type InvoiceOutput,
  INVOICE_LANGUAGE_LABELS,
} from "@/features/invoices/schema";
import { createInvoice, updateInvoice } from "@/features/invoices/actions";

type ProductOption = { id: string; name: string; sku: string };

type InvoiceRecord = {
  id: string;
  language: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  quoteRequestId: string | null;
  items: {
    productId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
} | null;

export function InvoiceForm({
  invoice,
  products,
  quoteRequestId,
}: {
  invoice?: InvoiceRecord;
  products: ProductOption[];
  quoteRequestId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceInput, unknown, InvoiceOutput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      language: (invoice?.language as InvoiceOutput["language"]) ?? "AR",
      customerName: invoice?.customerName ?? "",
      customerPhone: invoice?.customerPhone ?? "",
      customerEmail: invoice?.customerEmail ?? "",
      notes: invoice?.notes ?? "",
      quoteRequestId: invoice?.quoteRequestId ?? quoteRequestId ?? "",
      items: invoice?.items.length
        ? invoice.items.map((item) => ({
            productId: item.productId ?? "",
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        : [{ productId: "", name: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  function onSubmit(values: InvoiceOutput) {
    startTransition(async () => {
      const result = invoice
        ? await updateInvoice(invoice.id, values)
        : await createInvoice(values);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (invoice) toast.success("تم تحديث الفاتورة بنجاح");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoice-customer-name">اسم العميل</Label>
          <Input id="invoice-customer-name" {...register("customerName")} />
          {errors.customerName && (
            <p className="text-sm text-destructive">
              {errors.customerName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-customer-phone">رقم الهاتف</Label>
          <Input
            id="invoice-customer-phone"
            dir="ltr"
            {...register("customerPhone")}
          />
          {errors.customerPhone && (
            <p className="text-sm text-destructive">
              {errors.customerPhone.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-customer-email">
            البريد الإلكتروني (اختياري)
          </Label>
          <Input
            id="invoice-customer-email"
            dir="ltr"
            {...register("customerEmail")}
          />
          {errors.customerEmail && (
            <p className="text-sm text-destructive">
              {errors.customerEmail.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>لغة الفاتورة</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_LANGUAGE_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoice-notes">ملاحظات (اختياري)</Label>
        <Textarea id="invoice-notes" rows={2} {...register("notes")} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>المنتجات</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              append({ productId: "", name: "", quantity: 1, unitPrice: 0 })
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
              className="grid grid-cols-1 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs">اختر من المنتجات (اختياري)</Label>
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  render={({ field: productField }) => (
                    <Select
                      value={productField.value || "none"}
                      onValueChange={(value) => {
                        productField.onChange(value === "none" ? "" : value);
                        if (value !== "none") {
                          const product = products.find(
                            (item) => item.id === value,
                          );
                          if (product) {
                            setValue(`items.${index}.name`, product.name);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="بدون منتج محدد" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون منتج محدد</SelectItem>
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
                <Label className="text-xs">اسم المنتج في الفاتورة</Label>
                <Input {...register(`items.${index}.name`)} />
                {errors.items?.[index]?.name && (
                  <p className="text-sm text-destructive">
                    {errors.items[index]?.name?.message}
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
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-24"
                  {...register(`items.${index}.unitPrice`)}
                />
              </div>
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
          ))}
        </div>
        {errors.items?.message && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium">الإجمالي: {total.toFixed(2)}</p>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending
            ? "جاري الحفظ..."
            : invoice
              ? "حفظ التعديلات"
              : "إنشاء الفاتورة"}
        </Button>
      </div>
    </form>
  );
}
