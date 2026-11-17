<div align="center">
  <img src="assets/logo.png" alt="Unfazed EXTrack" width="180" />
  <h1>Unfazed EXTrack</h1>
  <p><strong>Automatic expense tracking from transaction alerts — entirely on-device.</strong></p>
</div>

---

## What it does

EXTrack watches the transaction alerts you already receive, reads the amount and direction
straight out of the notification, and asks one quick question: *what was this for?*

1. A credit or debit notification arrives (as an SMS or from an app).
2. A background Android notification listener picks it up and parses it.
3. The transaction is stored locally, and a heads-up alert appears.
4. Tapping it opens a popup: a note field and a colour-coded label.
5. Tagged. Done — usually under three seconds.

Nothing is ever uploaded. There is no account, no server, and no network call: every
transaction lives in a local SQLite database on the phone.

A **Report** tab totals spending per label — this month or all time — so you can see what the
money actually went on. Anything still untagged is listed separately rather than folded into
a category, so the totals never quietly understate a category.

## What it recognises

A notification is treated as a transaction when it comes from a recognised issuer *and*
carries a direction and an amount. Matching happens in two stages, both in
[`src/lib/parseBankNotification.ts`](src/lib/parseBankNotification.ts):

- **`BANK_RULES`** — which issuers to listen to, one keyword pattern each. Requiring a known
  issuer is what keeps cashback, loyalty-point and promotional messages out.
- **`AMOUNT_RULES`** — the credit and debit phrasings used by Indian transaction alerts
  (`credited with`, `received`, `sent`, `Dr. from`, and so on). These are shared across
  issuers rather than written per-issuer.

From a match it extracts the amount, direction, masked account digits, and closing balance
where the message carries one. Adding an account means adding one line to `BANK_RULES`; a
missed message format means adding a phrasing to `AMOUNT_RULES`.

No account numbers, balances or credentials live in the source — only the phrasing patterns.

## Labels

Six categories, each with its own colour — the only colour in an otherwise black-and-white UI.

| Label | | Label | |
|---|---|---|---|
| Bills | 🟠 amber | Giveaway | 🟣 magenta |
| Food | 🟢 green | Home | 🔵 indigo |
| UN Food | 🩵 cyan | Travel | 🔴 red |

## How capture works

Android does not let an app read other apps' notifications without a dedicated
`NotificationListenerService`, which Expo does not ship. EXTrack adds one through a local
config plugin:

```
plugins/
  withNotificationListener.js      # injects the service at prebuild time
  android-src/
    UnfazedNotificationListenerService.kt   # captures + filters + queues
    UnfazedNotificationListenerModule.kt    # bridge to JS
    UnfazedNotificationListenerPackage.kt
```

The plugin patches `AndroidManifest.xml`, copies the Kotlin sources into the generated
project, and registers the package in `MainApplication.kt`.

Because Android may kill the JS runtime at any time, the service does not depend on it:
captures are written to native storage immediately and drained into SQLite the next time the
app opens. A notification is posted on every capture, so nothing is silently missed.

> Reading notifications requires a real build. **This app cannot run in Expo Go.**

## Project layout

```
App.tsx                     # bootstraps, drains the capture queue, renders
src/
  components/
    CategorizeModal.tsx     # the tagging popup
    LabelChip.tsx
    ReportView.tsx          # spend per label
    TransactionRow.tsx
  db/database.ts            # SQLite schema + queries
  lib/
    parseBankNotification.ts
    NotificationBridge.ts   # JS side of the native module
    labels.ts
    theme.ts
  screens/HomeScreen.tsx
  store/useTxnStore.ts      # zustand store
plugins/                    # native Android config plugin
```

## Building

Requires an [Expo](https://expo.dev) account. The `android/` directory is generated and is not
committed — configure native behaviour through `app.json` and the config plugin instead.

```bash
npm install
```

Build an installable APK in the cloud:

```bash
npx eas-cli build --platform android --profile preview
```

Or build locally, with Android Studio and a device connected over USB:

```bash
npx expo run:android
```

Checks:

```bash
npx tsc --noEmit
npx expo lint
```

## Setting it up on the phone

After installing the APK:

1. **Grant notification access.** Settings → Apps → Special app access → Notification access →
   enable **Unfazed EXTrack**. The app shows a banner with a shortcut to this screen until it
   is granted. Nothing is captured without it.
2. **Allow notifications** when prompted, so the tagging alerts can appear.

On Vivo / iQOO devices running FuntouchOS, the system is aggressive about killing background
processes. Also do the following, or captures will stop arriving after a while:

3. **Autostart** — Settings → Apps → Autostart → enable Unfazed EXTrack.
4. **Battery** — Settings → Battery → High background power consumption → allow Unfazed EXTrack.
5. **Lock it in recents** — open the recents view, swipe down on the EXTrack card and tap the
   lock icon.

## Privacy

All data stays on the device. There is no backend, no account, and no analytics — the app
makes no network requests of its own, and the SQLite database is private to the app sandbox.
Uninstalling the app deletes every transaction with it.

(React Native adds the `INTERNET` permission to every build by default; EXTrack does not use
it. Notification text is parsed in memory and only the parsed fields plus the original message
are written to the local database.)

## Tech

Expo SDK 58 · React Native 0.88 · TypeScript · expo-sqlite · zustand · Kotlin
