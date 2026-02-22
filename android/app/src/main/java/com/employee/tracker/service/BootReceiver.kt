package com.employee.tracker.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.employee.tracker.security.TokenManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject lateinit var tokenManager: TokenManager

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            if (tokenManager.isLoggedIn()) {
                LocationTrackingService.start(context)
                LocationSyncWorker.enqueuePeriodicSync(context)
            }
        }
    }
}
