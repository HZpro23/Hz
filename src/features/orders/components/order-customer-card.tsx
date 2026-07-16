"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CustomerPicker,
  type CustomerOption,
} from "@/features/customers/components/customer-picker";
import { CustomerFormSheet } from "@/features/customers/components/customer-form-sheet";
import { reassignOrderCustomer } from "@/features/orders/actions";
import { ar } from "@/i18n/ar";

type OrderCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
} | null;

export function OrderCustomerCard({
  orderId,
  customers,
  currentCustomer,
  snapshot,
  createdAt,
  notes,
}: {
  orderId: string;
  customers: CustomerOption[];
  currentCustomer: OrderCustomer;
  snapshot: { name: string; phone: string; email: string | null };
  createdAt: Date;
  notes: string | null;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReassign(customer: CustomerOption | null) {
    if (!customer) return;
    startTransition(async () => {
      const result = await reassignOrderCustomer(orderId, {
        customerId: customer.id,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم تغيير العميل بنجاح");
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>بيانات العميل</CardTitle>
          {currentCustomer && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setEditOpen(true)}
              title={ar.customers.editCustomerInfo}
            >
              <Pencil className="size-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">الاسم: </span>
            {snapshot.name}
          </p>
          <p>
            <span className="text-muted-foreground">الهاتف: </span>
            <span dir="ltr">{snapshot.phone}</span>
          </p>
          {snapshot.email && (
            <p>
              <span className="text-muted-foreground">البريد الإلكتروني: </span>
              <span dir="ltr">{snapshot.email}</span>
            </p>
          )}
          <p>
            <span className="text-muted-foreground">تاريخ الطلب: </span>
            {new Date(createdAt).toLocaleDateString("fr-FR")}
          </p>
          {notes && (
            <p>
              <span className="text-muted-foreground">ملاحظات: </span>
              {notes}
            </p>
          )}

          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {ar.customers.changeCustomer}
            </p>
            <CustomerPicker
              customers={customers}
              value={currentCustomer?.id ?? ""}
              onChange={handleReassign}
            />
            {isPending && (
              <p className="text-xs text-muted-foreground">
                جاري التحديث...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {currentCustomer && (
        <CustomerFormSheet
          open={editOpen}
          customer={currentCustomer}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}
