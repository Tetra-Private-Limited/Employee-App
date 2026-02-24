package com.employee.tracker.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.employee.tracker.data.repository.AuthRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject lateinit var authRepository: AuthRepository

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) {
            return
        }

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val bootStatus = authRepository.validateSessionForBoot(
                    performLightweightValidation = true
                )

                if (bootStatus.canStartTracking) {
                    Log.i(TAG, "Boot restart allowed. reasonCode=${bootStatus.reasonCode}")
                    LocationTrackingService.start(context)
                    LocationSyncWorker.enqueuePeriodicSync(context)
                } else {
                    Log.w(TAG, "Boot restart skipped. reasonCode=${bootStatus.reasonCode}")
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}
