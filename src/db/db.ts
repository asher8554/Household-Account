// IndexedDB 테이블과 앱 데이터베이스 인스턴스를 정의합니다.
import Dexie, { type Table } from "dexie";
import type { Category } from "../features/categories/category-types";
import type { Transaction } from "../features/transactions/transaction-types";

export class HouseholdDatabase extends Dexie {
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super("household-account");

    this.version(1).stores({
      categories: "&id,type,isActive,sortOrder,updatedAt",
      transactions: "&id,date,type,categoryId,source,updatedAt",
    });
  }
}

export const db = new HouseholdDatabase();
