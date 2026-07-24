"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ConflictCustomer } from "@/features/orders/actions";
import type { CustomerInput } from "@/features/customers/schema";

export function PhoneConflictDialog({
  existing,
  incoming,
  onUpdateExisting,
  onKeepExisting,
  onCreateNew,
  onCancel,
}: {
  existing: ConflictCustomer;
  incoming: CustomerInput;
  onUpdateExisting: () => void;
  onKeepExisting: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>رقم الهاتف مستخدم بالفعل</DialogTitle>
          <DialogDescription>
            يوجد عميل آخر مسجل بنفس رقم الهاتف (
            <span dir="ltr">{existing.phone}</span>). كيف تريد المتابعة؟
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              العميل الموجود
            </p>
            <p className="font-medium">{existing.name}</p>
            {existing.email && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {existing.email}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              البيانات المدخلة
            </p>
            <p className="font-medium">{incoming.name}</p>
            {incoming.email && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                {incoming.email}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button className="cursor-pointer" onClick={onUpdateExisting}>
            تحديث بيانات العميل الموجود بهذه المعلومات
          </Button>
          <p className="text-xs text-muted-foreground">
            سيتم تحديث بيانات &quot;{existing.name}&quot; بالمعلومات المدخلة،
            وربط هذا الطلب به.
          </p>

          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={onKeepExisting}
          >
            استخدام العميل الموجود كما هو
          </Button>
          <p className="text-xs text-muted-foreground">
            سيتم تجاهل التعديلات المدخلة وربط الطلب بالعميل الموجود ببياناته
            الحالية.
          </p>

          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={onCreateNew}
          >
            حفظ كعميل منفصل رغم تطابق الهاتف
          </Button>
          <p className="text-xs text-muted-foreground">
            سيتم حفظ هذه البيانات كسجل منفصل حتى مع وجود نفس رقم الهاتف.
          </p>

          <Button variant="ghost" className="cursor-pointer" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
