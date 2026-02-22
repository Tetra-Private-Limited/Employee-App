package com.employee.tracker.service

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.BatteryManager
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.employee.tracker.EmployeeTrackerApp
import com.employee.tracker.R
import com.employee.tracker.data.local.entity.LocationEntity
import com.employee.tracker.data.repository.LocationRepository
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.ui.dashboard.DashboardActivity
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.util.Calendar
import javax.inject.Inject

@AndroidEntryPoint
class LocationTrackingService : LifecycleService(), SensorEventListener {

    @Inject lateinit var locationRepository: LocationRepository
    @Inject lateinit var deviceInfo: DeviceInfo

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var sensorManager: SensorManager
    private var lastAccelerometer = floatArrayOf(0f, 0f, 0f)

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                onNewLocation(location)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager

        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { sensor ->
            sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        when (intent?.action) {
            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
        }

        startForeground(NOTIFICATION_ID, buildNotification())
        startLocationUpdates()
        return START_STICKY
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        sensorManager.unregisterListener(this)
    }

    private fun startLocationUpdates() {
        val interval = if (isWorkingHours()) WORK_INTERVAL_MS else OFF_HOURS_INTERVAL_MS

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, interval)
            .setMinUpdateIntervalMillis(interval / 2)
            .setWaitForAccurateLocation(false)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                request, locationCallback, Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing location permission", e)
            stopSelf()
        }
    }

    private fun onNewLocation(location: Location) {
        lifecycleScope.launch {
            val entity = LocationEntity(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy,
                altitude = location.altitude,
                speed = location.speed,
                bearing = location.bearing,
                provider = location.provider,
                isMock = location.isFromMockProvider,
                batteryLevel = getBatteryLevel(),
                deviceId = deviceInfo.getDeviceId(),
                satelliteCount = location.extras?.getInt("satellites"),
                snrAverage = null,
                accelerometerX = lastAccelerometer[0],
                accelerometerY = lastAccelerometer[1],
                accelerometerZ = lastAccelerometer[2],
                recordedAt = location.time
            )
            locationRepository.saveLocationLocally(entity)
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100 / scale) else -1
    }

    private fun isWorkingHours(): Boolean {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return hour in WORK_START_HOUR until WORK_END_HOUR
    }

    private fun buildNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, DashboardActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this, 1,
            Intent(this, LocationTrackingService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, EmployeeTrackerApp.CHANNEL_TRACKING)
            .setContentTitle("Employee Tracker")
            .setContentText("Location tracking active")
            .setSmallIcon(R.drawable.ic_location)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_stop, "Stop", stopIntent)
            .build()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            lastAccelerometer = event.values.copyOf()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    companion object {
        private const val TAG = "LocationService"
        const val NOTIFICATION_ID = 1001
        const val ACTION_STOP = "STOP_TRACKING"
        private const val WORK_INTERVAL_MS = 30_000L       // 30 seconds
        private const val OFF_HOURS_INTERVAL_MS = 3_600_000L // 60 minutes
        private const val WORK_START_HOUR = 8
        private const val WORK_END_HOUR = 20

        fun start(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
