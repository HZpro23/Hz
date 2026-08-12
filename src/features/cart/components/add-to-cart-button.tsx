"use client";

import { useState, type ComponentProps } from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps extends ComponentProps<typeof Button> {
  productId: string;
  productName: string;
  /** Current stock level — used to warn the customer if the requested
   * quantity (on top of whatever's already in the cart) isn't available. */
  stock: number;
}

export function AddToCartButton({
  productId,
  productName,
  stock,
  className,
  size = "lg",
  ...props
}: AddToCartButtonProps) {
  const { cart, addItem } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const alreadyInCart =
    cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
  const availableToAdd = Math.max(0, stock - alreadyInCart);
  const isOverStock = quantity > availableToAdd;

  const handleAddToCart = () => {
    if (isOverStock) return;
    addItem(productId, productName, quantity, stock);
    setIsOpen(false);
    setQuantity(1);
  };

  return (
    <>
      <Button
        size={size}
        className={cn("w-full cursor-pointer sm:w-auto", className)}
        onClick={() => setIsOpen(true)}
        {...props}
      >
        إضافة إلى السلة
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة إلى السلة</DialogTitle>
            <DialogDescription>{productName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="999"
                value={quantity}
                aria-invalid={isOverStock}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="text-center"
              />
              {isOverStock && (
                <p className="text-sm text-destructive">
                  الكمية المطلوبة أكبر من الكمية المتوفرة في المخزون
                  {alreadyInCart > 0
                    ? ` (المتبقي المتاح: ${availableToAdd.toLocaleString("ar")}، لديك بالفعل ${alreadyInCart.toLocaleString("ar")} في السلة)`
                    : ` (المتوفر: ${stock.toLocaleString("ar")})`}
                  .
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleAddToCart}
                disabled={isOverStock}
                className="flex-1 cursor-pointer"
              >
                إضافة إلى السلة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
