package com.unfazed.extrack

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray

class UnfazedNotificationListenerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: UnfazedNotificationListenerModule? = null

        fun emitNewNotification(rawText: String, source: String, postedAt: Long) {
            val inst = instance ?: return
            try {
                val context = inst.reactApplicationContext
                if (!context.hasActiveReactInstance()) return
                val map: WritableMap = Arguments.createMap()
                map.putString("rawText", rawText)
                map.putString("source", source)
                map.putDouble("postedAt", postedAt.toDouble())
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("unfazedNewNotification", map)
            } catch (e: Exception) {
                // JS side is not alive; the event stays in the SharedPreferences queue
            }
        }
    }

    init {
        instance = this
    }

    override fun getName() = "UnfazedNotificationListener"

    override fun invalidate() {
        if (instance === this) instance = null
        super.invalidate()
    }

    @ReactMethod
    fun isListenerEnabled(promise: Promise) {
        try {
            val context: Context = reactApplicationContext
            val enabledListeners = Settings.Secure.getString(
                context.contentResolver, "enabled_notification_listeners"
            )
            val packageName = context.packageName
            val isEnabled = !TextUtils.isEmpty(enabledListeners) && enabledListeners.contains(packageName)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openNotificationAccessSettings() {
        val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun getPendingEvents(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                UnfazedNotificationListenerService.PREFS_NAME, Context.MODE_PRIVATE
            )
            val arr = JSONArray(prefs.getString(UnfazedNotificationListenerService.QUEUE_KEY, "[]"))
            val result: WritableArray = Arguments.createArray()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val map: WritableMap = Arguments.createMap()
                map.putString("rawText", obj.getString("rawText"))
                map.putString("source", obj.getString("source"))
                map.putDouble("postedAt", obj.getLong("postedAt").toDouble())
                result.pushMap(map)
            }
            prefs.edit().putString(UnfazedNotificationListenerService.QUEUE_KEY, "[]").apply()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_PENDING_EVENTS", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in NativeEventEmitter calls; no-op, events are emitted directly.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in NativeEventEmitter calls; no-op.
    }
}
