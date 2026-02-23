package com.employee.tracker

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class EmployeeTrackerApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)

        val trackingChannel = NotificationChannel(
            CHANNEL_TRACKING,
            "Location Tracking",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows when location tracking is active"
        }

        val alertChannel = NotificationChannel(
            CHANNEL_ALERTS,
            "Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Important alerts and reminders"
        }

        manager.createNotificationChannel(trackingChannel)
        manager.createNotificationChannel(alertChannel)
    }

    companion object {
        const val CHANNEL_TRACKING = "tracking_channel"
        const val CHANNEL_ALERTS = "alerts_channel"
    }
}
