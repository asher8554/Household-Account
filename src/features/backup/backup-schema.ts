// JSON 백업 파일의 런타임 검증 규칙을 정의합니다.
import { z } from "zod";

export const backupCategorySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["income", "expense"]),
  name: z.string().min(1),
  color: z.string().min(1).default("#6d746a"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(999),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const backupTransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive(),
  categoryId: z.string().optional().default(""),
  memo: z.string().optional().default(""),
  source: z
    .enum(["manual", "csv", "shinhan-file", "hyundai-card-file", "shinhan-notification", "bank-file", "naver-pay-file"])
    .optional()
    .default("manual"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const backupFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().min(1),
  categories: z.array(backupCategorySchema),
  transactions: z.array(backupTransactionSchema),
});

export type ParsedBackupFile = z.infer<typeof backupFileSchema>;
