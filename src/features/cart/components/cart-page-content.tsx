"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { createOrderFromCart } from "../actions";

const CUSTOMER_INFO_STORAGE_KEY = "hz-customer-info";

type StoredCustomerInfo = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
};

function getInitialFormData() {
  const empty = {
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(CUSTOMER_INFO_STORAGE_KEY);
    if (!raw) return empty;
    return { ...empty, ...(JSON.parse(raw) as StoredCustomerInfo) };
  } catch {
    return empty;
  }
}

function saveStoredCustomerInfo(info: StoredCustomerInfo) {
  try {
    localStorage.setItem(CUSTOMER_INFO_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // ignore write failures (e.g. private browsing storage limits)
  }
}

export function CartPageContent() {
  const router = useRouter();
  const { cart, removeItem, updateQuantity, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(getInitialFormData);

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">السلة</h1>
        <EmptyState
          icon={ShoppingCart}
          title="السلة فارغة"
          description="لا توجد منتجات في السلة"
          action={
            <Button
              className="cursor-pointer"
              nativeButton={false}
              render={<Link href="/products" />}
            >
              العودة للمنتجات
            </Button>
          }
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await createOrderFromCart({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        notes: formData.notes,
      });

      if (result.success) {
        saveStoredCustomerInfo({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          customerEmail: formData.customerEmail,
        });
        clearCart();
        router.push(`/order-confirmation/${result.orderId}`);
      } else {
        setError(result.error || "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ أثناء معالجة الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">السلة</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/products/${item.productId}`}
                        className="hover:underline"
                      >
                        {item.productName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          disabled={isSubmitting}
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                        >
                          −
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          disabled={isSubmitting}
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="cursor-pointer"
                        disabled={isSubmitting}
                        onClick={() => removeItem(item.productId)}
                      >
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              nativeButton={false}
              render={<Link href="/products" />}
            >
              العودة للتسوق
            </Button>
            <Button
              variant="outline"
              onClick={() => clearCart()}
              disabled={isSubmitting}
              className="text-destructive hover:text-destructive cursor-pointer"
            >
              مسح السلة
            </Button>
          </div>
        </div>

        {/* Checkout Form */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>إكمال الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={isSubmitting} className="contents">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  required
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="الاسم الكامل"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">الهاتف *</Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, customerPhone: e.target.value })
                  }
                  placeholder="رقم الهاتف"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  placeholder="البريد الإلكتروني"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية..."
                  dir="rtl"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "جاري المعالجة..." : "طلب المنتجات"}
              </Button>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
