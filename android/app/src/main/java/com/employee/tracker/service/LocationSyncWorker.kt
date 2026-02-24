package com.employee.tracker.service

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.employee.tracker.data.repository.LocationRepository
import com.employee.tracker.data.tracking.TrackingHealthStore
import com.employee.tracker.util.Result
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class LocationSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val locationRepository: LocationRepository,
    private val trackingHealthStore: TrackingHealthStore
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return when (val result = locationRepository.syncPendingLocations()) {
            is com.employee.tracker.util.Result.Success -> {
                val pendingCount = locationRepository.getPendingCount()
                trackingHealthStore.recordSyncSuccess(
                    syncTimestamp = System.currentTimeMillis(),
                    pendingCount = pendingCount
                )
                Log.d(TAG, "Synced ${result.data} locations")
                Result.success()
            }
            is com.employee.tracker.util.Result.Error -> {
                val pendingCount = locationRepository.getPendingCount()
                trackingHealthStore.updatePendingCount(pendingCount)
                Log.e(TAG, "Sync failed: ${result.message}")
                Result.retry()
            }
            else -> {
                val pendingCount = locationRepository.getPendingCount()
                trackingHealthStore.updatePendingCount(pendingCount)
                Result.retry()
            }
        }
    }

    companion object {
        private const val TAG = "LocationSyncWorker"
        private const val WORK_NAME = "location_sync"

        fun enqueuePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<LocationSyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
    }
}
