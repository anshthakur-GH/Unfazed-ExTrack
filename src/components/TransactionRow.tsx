import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../db/database';
import { theme } from '../lib/theme';
import { LABEL_COLORS, Label } from '../lib/labels';

function formatDate(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function TransactionRow({
  txn,
  onPress,
}: {
  txn: Transaction;
  onPress: () => void;
}) {
  const sign = txn.type === 'credit' ? '+' : '-';
  const labelColor = txn.label ? LABEL_COLORS[txn.label as Label] : theme.faint;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Text style={styles.bank}>{txn.bank}{txn.accountLast4 ? ` •${txn.accountLast4}` : ''}</Text>
        <Text style={styles.note} numberOfLines={1}>
          {txn.note || 'Not tagged yet'}
        </Text>
        <Text style={styles.date}>{formatDate(txn.postedAt)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>
          {sign} ₹{txn.amount.toLocaleString('en-IN')}
        </Text>
        {txn.label ? (
          <View style={[styles.labelPill, { borderColor: labelColor }]}>
            <Text style={[styles.labelText, { color: labelColor }]}>{txn.label}</Text>
          </View>
        ) : (
          <View style={[styles.labelPill, { borderColor: theme.border }]}>
            <Text style={[styles.labelText, { color: theme.faint }]}>untagged</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  rowPressed: { backgroundColor: theme.card },
  left: { flexShrink: 1, paddingRight: 12 },
  right: { alignItems: 'flex-end' },
  bank: { color: theme.subtext, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  note: { color: theme.text, fontSize: 15, marginTop: 4 },
  date: { color: theme.faint, fontSize: 11, marginTop: 4 },
  amount: { color: theme.text, fontSize: 16, fontWeight: '700' },
  labelPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  labelText: { fontSize: 11, fontWeight: '600' },
});
