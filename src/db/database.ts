import * as SQLite from 'expo-sqlite';
import type { Bank, TxnType } from '../lib/parseBankNotification';
import type { Label } from '../lib/labels';

export interface Transaction {
  id: number;
  bank: Bank;
  type: TxnType;
  amount: number;
  accountLast4: string | null;
  balance: number | null;
  rawText: string;
  source: string;
  postedAt: number;
  note: string | null;
  label: Label | null;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('unfazed_extrack.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bank TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          accountLast4 TEXT,
          balance REAL,
          rawText TEXT NOT NULL,
          source TEXT,
          postedAt INTEGER NOT NULL,
          note TEXT,
          label TEXT
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function insertTransaction(txn: {
  bank: Bank;
  type: TxnType;
  amount: number;
  accountLast4: string | null;
  balance: number | null;
  rawText: string;
  source: string;
  postedAt: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO transactions (bank, type, amount, accountLast4, balance, rawText, source, postedAt, note, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    [txn.bank, txn.type, txn.amount, txn.accountLast4, txn.balance, txn.rawText, txn.source, txn.postedAt]
  );
  return result.lastInsertRowId;
}

export async function updateTransactionCategory(id: number, note: string, label: Label): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE transactions SET note = ?, label = ? WHERE id = ?`, [note, label, id]);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(`SELECT * FROM transactions ORDER BY postedAt DESC`);
}

export async function getUncategorizedTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE label IS NULL ORDER BY postedAt ASC`
  );
}

export async function transactionExists(rawText: string, postedAt: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM transactions WHERE rawText = ? AND postedAt = ?`,
    [rawText, postedAt]
  );
  return !!row;
}
