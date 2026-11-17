import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

export interface RawNotificationEvent {
  rawText: string;
  source: string;
  postedAt: number;
}

const { UnfazedNotificationListener } = NativeModules as {
  UnfazedNotificationListener?: {
    isListenerEnabled(): Promise<boolean>;
    openNotificationAccessSettings(): void;
    getPendingEvents(): Promise<RawNotificationEvent[]>;
  };
};

export const isAvailable = Platform.OS === 'android' && !!UnfazedNotificationListener;

export async function isListenerEnabled(): Promise<boolean> {
  if (!isAvailable) return false;
  return UnfazedNotificationListener!.isListenerEnabled();
}

export function openNotificationAccessSettings(): void {
  if (!isAvailable) return;
  UnfazedNotificationListener!.openNotificationAccessSettings();
}

export async function drainPendingEvents(): Promise<RawNotificationEvent[]> {
  if (!isAvailable) return [];
  return UnfazedNotificationListener!.getPendingEvents();
}

export function subscribeToNewNotifications(handler: (event: RawNotificationEvent) => void) {
  if (!isAvailable) return { remove: () => {} };
  const emitter = new NativeEventEmitter(NativeModules.UnfazedNotificationListener);
  type EmitterHandler = Parameters<typeof emitter.addListener>[1];
  return emitter.addListener('unfazedNewNotification', handler as EmitterHandler);
}
