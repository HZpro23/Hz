"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import {
  Combobox,
  ComboboxValue,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomer } from "@/features/customers/actions";
import { normalizeArabicName } from "@/lib/arabic-name";
import { ar } from "@/i18n/ar";
import { toast } from "sonner";

export type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
};

const NONE_CUSTOMER: CustomerOption = { id: "", name: "اختر عميلاً...", phone: "" };

function customerLabel(customer: CustomerOption) {
  return customer.id ? `${customer.name} — ${customer.phone}` : customer.name;
}

export function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (customer: CustomerOption | null) => void;
}) {
  const [options, setOptions] = useState(customers);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const items = [NONE_CUSTOMER, ...options];
  const selected = items.find((item) => item.id === value) ?? NONE_CUSTOMER;

  const normalizedQuery = normalizeArabicName(query);
  const filtered = normalizedQuery
    ? options.filter(
        (customer) =>
          normalizeArabicName(customer.name).includes(normalizedQuery) ||
          customer.phone.includes(query.trim()),
      )
    : options;

  function handleCreate(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    startTransition(async () => {
      const result = await createCustomer({ name, phone, email });
      if (result.error || !result.customerId) {
        toast.error(result.error ?? "حدث خطأ أثناء إنشاء العميل");
        return;
      }
      const newCustomer: CustomerOption = {
        id: result.customerId,
        name,
        phone,
        email: email || null,
      };
      setOptions((prev) => [newCustomer, ...prev]);
      onChange(newCustomer);
      setCreateOpen(false);
      toast.success("تم إنشاء العميل بنجاح");
    });
  }

  return (
    <>
      <Combobox
        items={[NONE_CUSTOMER, ...filtered]}
        value={selected}
        onValueChange={(customer: CustomerOption | null) => onChange(customer)}
        isItemEqualToValue={(a: CustomerOption, b: CustomerOption) =>
          a.id === b.id
        }
        itemToStringValue={(item: CustomerOption) => item.id}
        itemToStringLabel={customerLabel}
        onInputValueChange={setQuery}
        filter={null}
      >
        <ComboboxTrigger className="w-full">
          <ComboboxValue />
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput placeholder={ar.customers.searchCustomerPlaceholder} />
          <ComboboxEmpty>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 py-1 text-primary"
              onClick={() => setCreateOpen(true)}
            >
              <UserPlus className="size-4" />
              {ar.customers.createNewCustomer}
            </button>
          </ComboboxEmpty>
          <ComboboxList>
            {(item: CustomerOption) => (
              <ComboboxItem key={item.id} value={item}>
                {customerLabel(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar.customers.createNewCustomer}</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="picker-customer-name">الاسم الكامل</Label>
              <Input
                id="picker-customer-name"
                name="name"
                placeholder="الاسم واللقب"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="picker-customer-phone">رقم الهاتف</Label>
              <Input
                id="picker-customer-phone"
                name="phone"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="picker-customer-email">
                البريد الإلكتروني (اختياري)
              </Label>
              <Input id="picker-customer-email" name="email" dir="ltr" />
            </div>
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={isPending}
            >
              {isPending ? "جاري الحفظ..." : ar.common.save}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
