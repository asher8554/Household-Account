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
};

export type NotionPropertyValue =
  | { title: Array<{ type: "text"; text: { content: string } }> }
  | { rich_text: Array<{ type: "text"; text: { content: string } }> }
  | { select: { name: string } }
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
  color: { rich_text: {} },
  isDefault: { checkbox: {} },
  isActive: { checkbox: {} },
  sortOrder: { number: {} },
  createdAt: { rich_text: {} },
  updatedAt: { rich_text: {} },
  date: { rich_text: {} },
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

export function buildNotionBackupRows(backup: BackupPayload, titlePropertyName: string): NotionBackupRow[] {
  return [
    ...backup.categories.map((category) => buildCategoryRow(category, titlePropertyName)),
    ...backup.transactions.map((transaction) => buildTransactionRow(transaction, titlePropertyName)),
  ];
}

export function buildNotionBackupSchemaPatch(schema: Record<string, NotionPropertySchema>): NotionSchemaPatch {
  const properties: Record<string, unknown> = {};

  for (const [name, propertySchema] of Object.entries(requiredBackupSchema)) {
    if (!schema[name]?.type) {
      properties[name] = propertySchema;
    }
  }

  return { properties };
}

export function getTitlePropertyName(schema: Record<string, NotionPropertySchema>) {
  return Object.entries(schema).find(([, property]) => property.type === "title")?.[0] ?? "id";
}

function buildCategoryRow(category: BackupCategoryPayload, titlePropertyName: string): NotionBackupRow {
  return {
    id: category.id,
    recordType: "category",
    properties: {
      [titlePropertyName]: titleValue(category.id),
      recordType: selectValue("category"),
      type: selectValue(category.type),
      name: richTextValue(category.name),
      color: richTextValue(category.color),
      isDefault: { checkbox: category.isDefault },
      isActive: { checkbox: category.isActive },
      sortOrder: { number: category.sortOrder },
      createdAt: richTextValue(category.createdAt),
      updatedAt: richTextValue(category.updatedAt),
    },
  };
}

function buildTransactionRow(transaction: BackupTransactionPayload, titlePropertyName: string): NotionBackupRow {
  return {
    id: transaction.id,
    recordType: "transaction",
    properties: {
      [titlePropertyName]: titleValue(transaction.id),
      recordType: selectValue("transaction"),
      date: richTextValue(transaction.date),
      type: selectValue(transaction.type),
      amount: { number: transaction.amount },
      categoryId: richTextValue(transaction.categoryId),
      name: richTextValue(transaction.memo),
      memo: richTextValue(transaction.memo),
      source: selectValue(transaction.source),
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

function selectValue(name: string): NotionPropertyValue {
  return {
    select: { name },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
