"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InvoicePdfButton({
  targetId,
  fileName,
  label,
}: {
  targetId: string;
  fileName: string;
  label: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleClick() {
    const target = document.getElementById(targetId);
    if (!target) return;

    setIsGenerating(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.setProperties({ title: fileName });

      const blobUrl = pdf.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error(error);
      toast.error("تعذر إنشاء ملف PDF، حاول مرة أخرى");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isGenerating}
      className="cursor-pointer"
    >
      {isGenerating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FileDown className="size-4" />
      )}
      {label}
    </Button>
  );
}
