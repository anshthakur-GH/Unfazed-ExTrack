import { useEffect, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform, StatusBar } from 'react-native';
import type { AppStateStatus } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import CategorizeModal from './src/components/CategorizeModal';
import { useTxnStore } from './src/store/useTxnStore';
import { subscribeToNewNotifications } from './src/lib/NotificationBridge';

export default function App() {
  const drainAndIngest = useTxnStore((s) => s.drainAndIngest);
  const loadQueue = useTxnStore((s) => s.loadQueue);
  const refreshAll = useTxnStore((s) => s.refreshAll);
  const ingestEvent = useTxnStore((s) => s.ingestEvent);
  const checkListener = useTxnStore((s) => s.checkListener);
  const appState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
    }

    const bootstrap = async () => {
      await checkListener();
      await drainAndIngest();
      await loadQueue();
      await refreshAll();
    };
    bootstrap();

    const liveSub = subscribeToNewNotifications((e) => {
      ingestEvent(e.rawText, e.source, e.postedAt);
    });

    const appStateSub = AppState.addEventListener('change', (next) => {
      const resumed = /inactive|background/.test(appState.current) && next === 'active';
      appState.current = next;
      // Newly captured events are appended by ingestEvent, so the queue is not reloaded
      // here — that would resurrect transactions dismissed earlier in this session.
      if (resumed) drainAndIngest();
    });

    return () => {
      liveSub.remove();
      appStateSub.remove();
    };
  }, [drainAndIngest, loadQueue, refreshAll, ingestEvent, checkListener]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <HomeScreen />
      <CategorizeModal />
    </>
  );
}
