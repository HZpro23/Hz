import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const folder = "inventory-system/products";
  const { timestamp, signature } = createUploadSignature({ folder });

  return NextResponse.json({
    timestamp,
    signature,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
