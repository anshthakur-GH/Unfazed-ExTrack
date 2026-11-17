import { create } from 'zustand';
import {
  Transaction,
  getAllTransactions,
  getUncategorizedTransactions,
  insertTransaction,
  transactionExists,
  updateTransactionCategory,
} from '../db/database';
import { parseBankNotification } from '../lib/parseBankNotification';
import { Label } from '../lib/labels';
import { drainPendingEvents, isListenerEnabled } from '../lib/NotificationBridge';

interface TxnStore {
  all: Transaction[];
  queue: Transaction[];
  listenerEnabled: boolean;
  checkListener: () => Promise<void>;
  refreshAll: () => Promise<void>;
  loadQueue: () => Promise<void>;
  ingestEvent: (rawText: string, source: string, postedAt: number) => Promise<void>;
  drainAndIngest: () => Promise<void>;
  openTransaction: (txn: Transaction) => void;
  saveCurrent: (note: string, label: Label) => Promise<void>;
  dismissCurrent: () => void;
}

export const useTxnStore = create<TxnStore>((set, get) => ({
  all: [],
  queue: [],
  listenerEnabled: true,

  checkListener: async () => {
    set({ listenerEnabled: await isListenerEnabled() });
  },

  refreshAll: async () => {
    const all = await getAllTransactions();
    set({ all });
  },

  loadQueue: async () => {
    const queue = await getUncategorizedTransactions();
    set({ queue });
  },

  ingestEvent: async (rawText, source, postedAt) => {
    const parsed = parseBankNotification(rawText, source);
    if (!parsed) return;
    if (await transactionExists(parsed.rawText, postedAt)) return;

    const id = await insertTransaction({ ...parsed, postedAt });
    const txn: Transaction = { id, ...parsed, postedAt, note: null, label: null };
    set((state) => ({ queue: [...state.queue, txn] }));
    await get().refreshAll();
  },

  drainAndIngest: async () => {
    const events = await drainPendingEvents();
    for (const e of events) {
      await get().ingestEvent(e.rawText, e.source, e.postedAt);
    }
  },

  openTransaction: (txn) => {
    set((state) => ({ queue: [txn, ...state.queue.filter((t) => t.id !== txn.id)] }));
  },

  saveCurrent: async (note, label) => {
    const [current] = get().queue;
    if (!current) return;
    await updateTransactionCategory(current.id, note, label);
    set((state) => ({ queue: state.queue.slice(1) }));
    await get().refreshAll();
  },

  dismissCurrent: () => {
    set((state) => ({ queue: state.queue.slice(1) }));
  },
}));
