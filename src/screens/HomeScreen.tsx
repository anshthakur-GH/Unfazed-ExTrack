import { useCallback, useEffect, useState } from 'react';
import { AppState, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTxnStore } from '../store/useTxnStore';
import TransactionRow from '../components/TransactionRow';
import ReportView from '../components/ReportView';
import { theme } from '../lib/theme';
import { openNotificationAccessSettings } from '../lib/NotificationBridge';

type Tab = 'activity' | 'report';

export default function HomeScreen() {
  const all = useTxnStore((s) => s.all);
  const refreshAll = useTxnStore((s) => s.refreshAll);
  const drainAndIngest = useTxnStore((s) => s.drainAndIngest);
  const openTransaction = useTxnStore((s) => s.openTransaction);
  const listenerEnabled = useTxnStore((s) => s.listenerEnabled);
  const checkListener = useTxnStore((s) => s.checkListener);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('activity');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkListener();
    });
    return () => sub.remove();
  }, [checkListener]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await drainAndIngest();
    await refreshAll();
    await checkListener();
    setRefreshing(false);
  }, [drainAndIngest, refreshAll, checkListener]);

  const totalIn = all.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalOut = all.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unfazed EXTrack</Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>IN</Text>
            <Text style={styles.summaryValue}>₹{totalIn.toLocaleString('en-IN')}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>OUT</Text>
            <Text style={styles.summaryValue}>₹{totalOut.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(['activity', 'report'] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'activity' ? 'Activity' : 'Report'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!listenerEnabled && (
        <Pressable style={styles.banner} onPress={openNotificationAccessSettings}>
          <Text style={styles.bannerText}>
            Notification access is off. Tap to enable so transactions can be captured.
          </Text>
        </Pressable>
      )}

      {tab === 'report' ? (
        <ReportView transactions={all} />
      ) : (
        <FlatList
          data={all}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TransactionRow txn={item} onPress={() => openTransaction(item)} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No transactions captured yet.</Text>}
          contentContainerStyle={all.length === 0 && styles.emptyContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
  title: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  summaryRow: { flexDirection: 'row', gap: 28, marginTop: 16 },
  summaryLabel: { color: theme.subtext, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  summaryValue: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  tabBtnActive: { backgroundColor: theme.text, borderColor: theme.text },
  tabText: { color: theme.subtext, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: theme.bg },
  banner: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  bannerText: { color: theme.subtext, fontSize: 12.5, lineHeight: 18 },
  empty: { color: theme.faint, textAlign: 'center', marginTop: 60 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
});
