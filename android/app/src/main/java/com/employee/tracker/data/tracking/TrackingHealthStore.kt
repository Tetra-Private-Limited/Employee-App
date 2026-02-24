package com.employee.tracker.data.tracking

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TrackingHealthStore @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun recordLocationEvent(locationTimestamp: Long, accuracyMeters: Float, isMockLocation: Boolean, pendingCount: Int) {
        prefs.edit()
            .putLong(KEY_LAST_LOCATION_TIMESTAMP, locationTimestamp)
            .putInt(KEY_PENDING_LOCATION_COUNT, pendingCount)
            .putString(KEY_ACCURACY_BUCKET, toAccuracyBucket(accuracyMeters))
            .putBoolean(KEY_MOCK_WARNING, isMockLocation)
            .apply()
    }

    fun recordSyncSuccess(syncTimestamp: Long, pendingCount: Int) {
        prefs.edit()
            .putLong(KEY_LAST_SYNC_TIMESTAMP, syncTimestamp)
            .putInt(KEY_PENDING_LOCATION_COUNT, pendingCount)
            .apply()
    }

    fun updatePendingCount(pendingCount: Int) {
        prefs.edit()
            .putInt(KEY_PENDING_LOCATION_COUNT, pendingCount)
            .apply()
    }

    fun getStats(): TrackingHealthStats {
        return TrackingHealthStats(
            lastLocationTimestamp = prefs.getLong(KEY_LAST_LOCATION_TIMESTAMP, 0L).takeIf { it > 0L },
            lastSuccessfulSyncTimestamp = prefs.getLong(KEY_LAST_SYNC_TIMESTAMP, 0L).takeIf { it > 0L },
            pendingLocationCount = prefs.getInt(KEY_PENDING_LOCATION_COUNT, 0),
            gpsAccuracyBucket = prefs.getString(KEY_ACCURACY_BUCKET, ACCURACY_UNKNOWN) ?: ACCURACY_UNKNOWN,
            mockLocationWarning = prefs.getBoolean(KEY_MOCK_WARNING, false)
        )
    }

    private fun toAccuracyBucket(accuracyMeters: Float): String {
        return when {
            accuracyMeters <= 0f -> ACCURACY_UNKNOWN
            accuracyMeters <= 10f -> "Excellent (≤10m)"
            accuracyMeters <= 25f -> "Good (11-25m)"
            accuracyMeters <= 50f -> "Fair (26-50m)"
            else -> "Poor (>50m)"
        }
    }

    companion object {
        private const val PREFS_NAME = "tracking_health"
        private const val KEY_LAST_LOCATION_TIMESTAMP = "last_location_timestamp"
        private const val KEY_LAST_SYNC_TIMESTAMP = "last_sync_timestamp"
        private const val KEY_PENDING_LOCATION_COUNT = "pending_location_count"
        private const val KEY_ACCURACY_BUCKET = "accuracy_bucket"
        private const val KEY_MOCK_WARNING = "mock_warning"
        private const val ACCURACY_UNKNOWN = "Unknown"
    }
}
