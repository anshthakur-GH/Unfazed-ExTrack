package com.unfazed.extrack

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

class UnfazedNotificationListenerService : NotificationListenerService() {

    companion object {
        const val PREFS_NAME = "unfazed_extrack_prefs"
        const val QUEUE_KEY = "pending_events"
        const val CHANNEL_ID = "unfazed_extrack_alerts"

        private val BANK_KEYWORDS = listOf(
            "idfc", "kotak", "bank of baroda", " bob ", "-bob", "ippb", "india post payments bank"
        )
        private val TXN_KEYWORDS = listOf(
            "credited", "debited", "credit", "debit", "received", "sent", "dr.", "cr."
        )

        fun looksLikeBankTxn(text: String): Boolean {
            val lower = text.lowercase()
            val hasBank = BANK_KEYWORDS.any { lower.contains(it) }
            val hasTxn = TXN_KEYWORDS.any { lower.contains(it) }
            return hasBank && hasTxn
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            // Our own "tag this" alert quotes the bank text, so it would re-trigger capture forever.
            if (sbn.packageName == packageName) return

            val extras = sbn.notification.extras
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val combined = "$title $text".trim()
            if (combined.isBlank()) return
            if (!looksLikeBankTxn(combined)) return

            val postedAt = sbn.postTime
            enqueueEvent(combined, sbn.packageName, postedAt)
            notifyUserToCategorize(combined, postedAt)
            UnfazedNotificationListenerModule.emitNewNotification(combined, sbn.packageName, postedAt)
        } catch (e: Exception) {
            // never let a parsing issue crash the listener
        }
    }

    private fun enqueueEvent(rawText: String, source: String, postedAt: Long) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(QUEUE_KEY, "[]"))
        val obj = JSONObject()
        obj.put("rawText", rawText)
        obj.put("source", source)
        obj.put("postedAt", postedAt)
        arr.put(obj)
        prefs.edit().putString(QUEUE_KEY, arr.toString()).apply()
    }

    private fun notifyUserToCategorize(rawText: String, postedAt: Long) {
        val manager = NotificationManagerCompat.from(this)
        val channel = NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_HIGH)
            .setName("Transaction alerts")
            .build()
        manager.createNotificationChannel(channel)

        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        launchIntent?.putExtra("unfazedCategorizeTxnAt", postedAt)
        launchIntent?.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP

        val pendingIntent = android.app.PendingIntent.getActivity(
            this,
            postedAt.toInt(),
            launchIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Tag this transaction")
            .setContentText(rawText.take(100))
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            manager.notify(postedAt.toInt(), notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS not granted; the in-app queue still has the event
        }
    }
}
