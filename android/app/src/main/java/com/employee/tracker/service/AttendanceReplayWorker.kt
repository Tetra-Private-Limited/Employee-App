package com.employee.tracker.service

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.employee.tracker.data.repository.AttendanceRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class AttendanceReplayWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val attendanceRepository: AttendanceRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return when (val result = attendanceRepository.replayPendingAttendanceActions()) {
            is com.employee.tracker.util.Result.Success -> {
                Log.d(TAG, "Replayed ${result.data} pending attendance actions")
                Result.success()
            }
            is com.employee.tracker.util.Result.Error -> {
                Log.e(TAG, "Replay failed: ${result.message}")
                Result.retry()
            }
            else -> Result.retry()
        }
    }

    companion object {
        private const val TAG = "AttendanceReplayWorker"
        private const val ONE_TIME_WORK_NAME = "attendance_replay_once"
        private const val PERIODIC_WORK_NAME = "attendance_replay_periodic"

        private fun constraints(): Constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        fun enqueueImmediate(context: Context) {
            val request = OneTimeWorkRequestBuilder<AttendanceReplayWorker>()
                .setConstraints(constraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    ONE_TIME_WORK_NAME,
                    ExistingWorkPolicy.REPLACE,
                    request
                )
        }

        fun enqueuePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<AttendanceReplayWorker>(
                15,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 1, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    PERIODIC_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
        }
    }
}
