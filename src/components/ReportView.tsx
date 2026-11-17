import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../db/database';
import { Label, LABELS, LABEL_COLORS } from '../lib/labels';
import { theme } from '../lib/theme';

type Period = 'month' | 'all';

interface Row {
  label: Label | null;
  total: number;
  count: number;
}

function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function buildRows(transactions: Transaction[], period: Period): Row[] {
  const since = period === 'month' ? startOfMonth() : 0;
  const totals = new Map<Label | null, Row>();

  for (const t of transactions) {
    if (t.type !== 'debit' || t.postedAt < since) continue;
    const key = (t.label as Label | null) ?? null;
    const row = totals.get(key) ?? { label: key, total: 0, count: 0 };
    row.total += t.amount;
    row.count += 1;
    totals.set(key, row);
  }

  // Tagged labels first by spend, untagged last — it is a gap in the data, not a category.
  const tagged = LABELS.map((l) => totals.get(l)).filter((r): r is Row => !!r);
  tagged.sort((a, b) => b.total - a.total);
  const untagged = totals.get(null);
  return untagged ? [...tagged, untagged] : tagged;
}

function money(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ReportView({ transactions }: { transactions: Transaction[] }) {
  const [period, setPeriod] = useState<Period>('month');
  const rows = useMemo(() => buildRows(transactions, period), [transactions, period]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const largest = rows.reduce((m, r) => Math.max(m, r.total), 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.periodRow}>
        {(['month', 'all'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'month' ? 'This month' : 'All time'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.totalLabel}>TOTAL SPENT</Text>
      <Text style={styles.totalValue}>{money(grandTotal)}</Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {period === 'month' ? 'Nothing spent this month yet.' : 'No spending recorded yet.'}
        </Text>
      ) : (
        rows.map((row) => {
          const color = row.label ? LABEL_COLORS[row.label] : theme.faint;
          const share = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
          const barWidth = largest > 0 ? (row.total / largest) * 100 : 0;
          return (
            <View key={row.label ?? 'untagged'} style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowLabel, { color }]}>{row.label ?? 'Untagged'}</Text>
                <Text style={styles.rowAmount}>{money(row.total)}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.rowMeta}>
                {share.toFixed(0)}% · {row.count} {row.count === 1 ? 'txn' : 'txns'}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodBtnActive: { borderColor: theme.text },
  periodText: { color: theme.faint, fontSize: 12, fontWeight: '600' },
  periodTextActive: { color: theme.text },
  totalLabel: { color: theme.subtext, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  totalValue: { color: theme.text, fontSize: 32, fontWeight: '800', marginTop: 4, marginBottom: 26 },
  row: { marginBottom: 20 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  rowAmount: { color: theme.text, fontSize: 15, fontWeight: '700' },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.card,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  rowMeta: { color: theme.faint, fontSize: 11, marginTop: 6 },
  empty: { color: theme.faint, textAlign: 'center', marginTop: 40 },
});
