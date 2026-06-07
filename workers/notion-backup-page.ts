// 가계부 백업 JSON을 Notion data source 행 단위 속성으로 변환합니다.
export type BackupCategoryPayload = {
  id: string;
  type: string;
  name: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupTransactionPayload = {
  id: string;
  date: string;
  type: string;
  amount: number;
  categoryId: string;
  memo: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  categories: BackupCategoryPayload[];
  transactions: BackupTransactionPayload[];
};

export type NotionPropertySchema = {
  type?: string;
  select?: {
    options?: NotionSelectOption[];
  };
  multi_select?: {
    options?: NotionSelectOption[];
  };
};

export type NotionSelectOption = {
  id?: string;
  name: string;
  color?: string;
};

export type NotionPropertyValue =
  | { title: Array<{ type: "text"; text: { content: string } }> }
  | { rich_text: Array<{ type: "text"; text: { content: string } }> }
  | { select: { name: string } }
  | { multi_select: Array<{ name: string }> }
  | { date: { start: string } }
  | { checkbox: boolean }
  | { number: number };

export type NotionBackupRow = {
  id: string;
  recordType: "category" | "transaction";
  properties: Record<string, NotionPropertyValue>;
};

export type NotionSchemaPatch = {
  properties: Record<string, unknown>;
};

const requiredBackupSchema: Record<string, unknown> = {
  recordType: {
    select: {
      options: [
        { name: "category", color: "blue" },
        { name: "transaction", color: "green" },
      ],
    },
  },
  type: {
    select: {
      options: [
        { name: "expense", color: "red" },
        { name: "income", color: "green" },
      ],
    },
  },
  name: { rich_text: {} },
  createdAt: { rich_text: {} },
  updatedAt: { rich_text: {} },
  date: { rich_text: {} },
  "날짜": { date: {} },
  recordId: { rich_text: {} },
  amount: { number: {} },
  categoryId: { rich_text: {} },
  memo: { rich_text: {} },
  source: {
    select: {
      options: [
        { name: "manual", color: "default" },
        { name: "csv", color: "gray" },
        { name: "shinhan-file", color: "blue" },
        { name: "hyundai-card-file", color: "purple" },
        { name: "shinhan-notification", color: "yellow" },
        { name: "bank-file", color: "green" },
        { name: "naver-pay-file", color: "orange" },
      ],
    },
  },
};

export function parseBackupPayload(raw: unknown): BackupPayload | null {
  if (!isRecord(raw)) return null;

  if (
    raw.version !== 1 ||
    typeof raw.exportedAt !== "string" ||
    !Array.isArray(raw.categories) ||
    !Array.isArray(raw.transactions)
  ) {
    return null;
  }

  const categories = raw.categories.map(parseCategory).filter((category): category is BackupCategoryPayload => category !== null);
  const transactions = raw.transactions
    .map(parseTransaction)
    .filter((transaction): transaction is BackupTransactionPayload => transaction !== null);

  if (categories.length !== raw.categories.length || transactions.length !== raw.transactions.length) {
    return null;
  }

  return {
    version: 1,
    exportedAt: raw.exportedAt,
    categories,
    transactions,
  };
}

export function buildNotionBackupRows(
  backup: BackupPayload,
  titlePropertyName: string,
  schema: Record<string, NotionPropertySchema> = {},
): NotionBackupRow[] {
  return backup.transactions.map((transaction) => buildTransactionRow(transaction, titlePropertyName, schema));
}

export function buildNotionBackupSchemaPatch(schema: Record<string, NotionPropertySchema>): NotionSchemaPatch {
  const properties: Record<string, unknown> = {};

  for (const [name, propertySchema] of Object.entries(requiredBackupSchema)) {
    const existingSchema = schema[name];

    if (!existingSchema?.type) {
      properties[name] = propertySchema;
      continue;
    }

    if (existingSchema.type === "select" && isSelectSchema(propertySchema)) {
      const mergedOptions = mergeSelectOptions(existingSchema.select?.options ?? [], propertySchema.select.options);

      if (mergedOptions.length > (existingSchema.select?.options ?? []).length) {
        properties[name] = { select: { options: mergedOptions } };
      }
      continue;
    }

    if (existingSchema.type === "multi_select" && isSelectSchema(propertySchema)) {
      const existingOptions = existingSchema.multi_select?.options ?? [];
      const mergedOptions = mergeSelectOptions(existingOptions, propertySchema.select.options);

      if (mergedOptions.length > existingOptions.length) {
        properties[name] = { multi_select: { options: mergedOptions } };
      }
    }
  }

  return { properties };
}

export function getTitlePropertyName(schema: Record<string, NotionPropertySchema>) {
  return Object.entries(schema).find(([, property]) => property.type === "title")?.[0] ?? "id";
}

function buildTransactionRow(
  transaction: BackupTransactionPayload,
  titlePropertyName: string,
  schema: Record<string, NotionPropertySchema>,
): NotionBackupRow {
  return {
    id: transaction.id,
    recordType: "transaction",
    properties: {
      [titlePropertyName]: titleValue(transaction.memo || transaction.id),
      recordId: richTextValue(transaction.id),
      recordType: optionValue("recordType", "transaction", schema),
      date: richTextValue(transaction.date),
      "날짜": dateValue(transaction.date),
      type: optionValue("type", transaction.type, schema),
      amount: { number: transaction.amount },
      categoryId: richTextValue(transaction.categoryId),
      name: richTextValue(transaction.memo),
      memo: richTextValue(transaction.memo),
      source: optionValue("source", transaction.source, schema),
      createdAt: richTextValue(transaction.createdAt),
      updatedAt: richTextValue(transaction.updatedAt),
    },
  };
}

function parseCategory(raw: unknown): BackupCategoryPayload | null {
  if (!isRecord(raw)) return null;

  if (
    typeof raw.id !== "string" ||
    typeof raw.type !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.color !== "string" ||
    typeof raw.isDefault !== "boolean" ||
    typeof raw.isActive !== "boolean" ||
    typeof raw.sortOrder !== "number" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    color: raw.color,
    isDefault: raw.isDefault,
    isActive: raw.isActive,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function parseTransaction(raw: unknown): BackupTransactionPayload | null {
  if (!isRecord(raw)) return null;

  if (
    typeof raw.id !== "string" ||
    typeof raw.date !== "string" ||
    typeof raw.type !== "string" ||
    typeof raw.amount !== "number" ||
    typeof raw.categoryId !== "string" ||
    typeof raw.memo !== "string" ||
    typeof raw.source !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    date: raw.date,
    type: raw.type,
    amount: raw.amount,
    categoryId: raw.categoryId,
    memo: raw.memo,
    source: raw.source,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function titleValue(content: string): NotionPropertyValue {
  return {
    title: [{ type: "text", text: { content } }],
  };
}

function richTextValue(content: string): NotionPropertyValue {
  return {
    rich_text: content ? [{ type: "text", text: { content } }] : [],
  };
}

function dateValue(start: string): NotionPropertyValue {
  return {
    date: { start },
  };
}

function selectValue(name: string): NotionPropertyValue {
  return {
    select: { name },
  };
}

function multiSelectValue(name: string): NotionPropertyValue {
  return {
    multi_select: [{ name }],
  };
}

function optionValue(
  propertyName: string,
  name: string,
  schema: Record<string, NotionPropertySchema>,
): NotionPropertyValue {
  return schema[propertyName]?.type === "multi_select" ? multiSelectValue(name) : selectValue(name);
}

function mergeSelectOptions(existingOptions: NotionSelectOption[], requiredOptions: NotionSelectOption[]) {
  const seenNames = new Set(existingOptions.map((option) => option.name));
  const missingOptions = requiredOptions.filter((option) => !seenNames.has(option.name));

  return [...existingOptions, ...missingOptions];
}

function isSelectSchema(schema: unknown): schema is { select: { options: NotionSelectOption[] } } {
  return (
    isRecord(schema) &&
    isRecord(schema.select) &&
    Array.isArray(schema.select.options) &&
    schema.select.options.every((option) => isRecord(option) && typeof option.name === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
