import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTxnStore } from '../store/useTxnStore';
import { LABELS, Label } from '../lib/labels';
import { theme } from '../lib/theme';
import { Transaction } from '../db/database';
import LabelChip from './LabelChip';

function CategorizeForm({
  txn,
  remaining,
  onSave,
  onClose,
}: {
  txn: Transaction;
  remaining: number;
  onSave: (note: string, label: Label) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(txn.note ?? '');
  const [label, setLabel] = useState<Label | null>((txn.label as Label | null) ?? null);

  const sign = txn.type === 'credit' ? '+' : '-';

  return (
    <View style={styles.card}>
      <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <Text style={styles.amount}>
        {sign} ₹{txn.amount.toLocaleString('en-IN')}
      </Text>
      <Text style={styles.sub}>
        {txn.bank}
        {txn.accountLast4 ? ` · •${txn.accountLast4}` : ''} ·{' '}
        {txn.type === 'credit' ? 'credited' : 'debited'}
      </Text>

      <Text style={styles.fieldLabel}>What was this for?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. groceries, rent, cab"
        placeholderTextColor={theme.faint}
        value={note}
        onChangeText={setNote}
        autoFocus
      />

      <Text style={styles.fieldLabel}>Label it as</Text>
      <View style={styles.chipRow}>
        {LABELS.map((l) => (
          <LabelChip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
        ))}
      </View>

      <Pressable
        style={[styles.saveBtn, !label && styles.saveBtnDisabled]}
        onPress={() => label && onSave(note.trim(), label)}
        disabled={!label}
      >
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      {remaining > 0 ? <Text style={styles.queueHint}>{remaining} more waiting</Text> : null}
    </View>
  );
}

export default function CategorizeModal() {
  const queue = useTxnStore((s) => s.queue);
  const saveCurrent = useTxnStore((s) => s.saveCurrent);
  const dismissCurrent = useTxnStore((s) => s.dismissCurrent);

  const current = queue[0] ?? null;
  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* keyed so each transaction gets a fresh form instead of syncing via an effect */}
        <CategorizeForm
          key={current.id}
          txn={current}
          remaining={queue.length - 1}
          onSave={saveCurrent}
          onClose={dismissCurrent}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: { color: theme.subtext, fontSize: 14, fontWeight: '700' },
  amount: { color: theme.text, fontSize: 28, fontWeight: '800', marginTop: 4 },
  sub: { color: theme.subtext, fontSize: 13, marginTop: 4, marginBottom: 18 },
  fieldLabel: {
    color: theme.subtext,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    fontSize: 15,
    marginBottom: 18,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  saveBtn: {
    backgroundColor: theme.text,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: { opacity: 0.3 },
  saveText: { color: theme.bg, fontSize: 15, fontWeight: '700' },
  queueHint: { color: theme.faint, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
