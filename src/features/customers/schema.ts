import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, { error: "الاسم يجب أن يتكون من حرفين على الأقل" }),
  phone: z
    .string()
    .min(6, { error: "رقم الهاتف غير صحيح" }),
  email: z.union([z.email({ error: "البريد الإلكتروني غير صحيح" }), z.literal("")]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
