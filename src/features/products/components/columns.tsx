"use client";

import Link from "next/link";
import Image from "next/image";
import { Pencil, Package } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteProduct } from "@/features/products/actions";
import { ar } from "@/i18n/ar";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minStockLevel: number;
  status: "ACTIVE" | "INACTIVE";
  category: { name: string };
  brand: { name: string } | null;
  images: { secureUrl: string }[];
};

export function getProductColumns(
  editHref: (id: string) => string,
): ColumnDef<ProductRow>[] {
  return [
    {
      id: "image",
      header: "",
      cell: ({ row }) => {
        const image = row.original.images[0];
        return image ? (
          <div className="relative size-10 overflow-hidden rounded-md border">
            <Image
              src={image.secureUrl}
              alt={row.original.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted">
            <Package className="size-4 text-muted-foreground" />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "اسم المنتج",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p dir="ltr" className="text-xs text-muted-foreground">
            {row.original.sku}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "القسم",
      cell: ({ row }) => row.original.category.name,
    },
    {
      id: "brand",
      header: "العلامة التجارية",
      cell: ({ row }) => row.original.brand?.name ?? "—",
    },
    {
      id: "quantity",
      header: "الكمية",
      cell: ({ row }) => {
        const isLow = row.original.quantity <= row.original.minStockLevel;
        return (
          <span className={isLow ? "font-medium text-destructive" : ""}>
            {row.original.quantity.toLocaleString("ar")}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "الحالة",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>
          {ar.statusLabels.productStatus[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false} render={<Link href={editHref(row.original.id)} />}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDeleteDialog
            action={() => deleteProduct(row.original.id)}
            description={`سيتم حذف المنتج "${row.original.name}" نهائياً مع جميع صوره.`}
          />
        </div>
      ),
    },
  ];
}
