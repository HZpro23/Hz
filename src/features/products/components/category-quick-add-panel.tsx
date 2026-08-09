"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  useComboboxFilter,
  ComboboxValue,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/currency";

export type QuickAddProductOption = {
  id: string;
  name: string;
  sku: string;
  price1: number;
  categoryId: string;
  brandId: string | null;
};

type CategoryOption = { id: string; name: string };

const NONE_CATEGORY: CategoryOption = { id: "", name: "اختر قسماً..." };
const NONE_BRAND: CategoryOption = { id: "", name: "اختر علامة تجارية..." };

/**
 * Lets the admin pick a category and/or brand, see the matching products,
 * check off one or more, and add all of them to a form's items at once —
 * a faster path than adding rows one by one via the product search.
 */
export function CategoryQuickAddPanel<
  TProduct extends QuickAddProductOption,
>({
  categories,
  brands,
  products,
  onAddProducts,
}: {
  categories: CategoryOption[];
  brands: CategoryOption[];
  products: TProduct[];
  onAddProducts: (products: TProduct[]) => void;
}) {
  const { contains } = useComboboxFilter();
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categoryItems = [NONE_CATEGORY, ...categories];
  const selectedCategory =
    categoryItems.find((item) => item.id === categoryId) ?? NONE_CATEGORY;

  const brandItems = [NONE_BRAND, ...brands];
  const selectedBrand =
    brandItems.find((item) => item.id === brandId) ?? NONE_BRAND;

  const hasFilter = Boolean(categoryId) || Boolean(brandId);
  const trimmedQuery = productQuery.trim().toLowerCase();
  const filteredProducts = hasFilter
    ? products
        .filter((product) => !categoryId || product.categoryId === categoryId)
        .filter((product) => !brandId || product.brandId === brandId)
        .filter(
          (product) =>
            !trimmedQuery ||
            product.name.toLowerCase().includes(trimmedQuery) ||
            product.sku.toLowerCase().includes(trimmedQuery),
        )
    : [];

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const toAdd = filteredProducts.filter((product) =>
      selectedIds.has(product.id),
    );
    if (toAdd.length === 0) return;
    onAddProducts(toAdd);
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <Label>إضافة سريعة حسب القسم أو العلامة التجارية</Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Combobox
          items={categoryItems}
          value={selectedCategory}
          onValueChange={(category: CategoryOption | null) => {
            setCategoryId(category?.id ?? "");
            setSelectedIds(new Set());
          }}
          isItemEqualToValue={(a: CategoryOption, b: CategoryOption) =>
            a.id === b.id
          }
          itemToStringValue={(item: CategoryOption) => item.id}
          itemToStringLabel={(item: CategoryOption) => item.name}
          filter={contains}
        >
          <ComboboxTrigger className="w-full">
            <ComboboxValue />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="ابحث عن قسم..." />
            <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOption) => (
                <ComboboxItem key={item.id} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Combobox
          items={brandItems}
          value={selectedBrand}
          onValueChange={(brand: CategoryOption | null) => {
            setBrandId(brand?.id ?? "");
            setSelectedIds(new Set());
          }}
          isItemEqualToValue={(a: CategoryOption, b: CategoryOption) =>
            a.id === b.id
          }
          itemToStringValue={(item: CategoryOption) => item.id}
          itemToStringLabel={(item: CategoryOption) => item.name}
          filter={contains}
        >
          <ComboboxTrigger className="w-full">
            <ComboboxValue />
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput placeholder="ابحث عن علامة تجارية..." />
            <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOption) => (
                <ComboboxItem key={item.id} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {hasFilter && (
        <>
          <Input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="ابحث بالاسم أو SKU..."
          />
          {filteredProducts.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              لا توجد منتجات مطابقة
            </p>
          ) : (
            <>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-1.5">
                {filteredProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={() => toggle(product.id)}
                    />
                    <span className="flex-1 truncate">{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatCurrency(product.price1)}
                    </span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full cursor-pointer"
                disabled={selectedIds.size === 0}
                onClick={handleAdd}
              >
                <Plus className="size-4" />
                إضافة{" "}
                {selectedIds.size > 0
                  ? selectedIds.size.toLocaleString("ar")
                  : ""}{" "}
                إلى القائمة
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
