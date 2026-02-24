package com.employee.tracker.ui.dashboard

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.employee.tracker.databinding.ActivityDashboardBinding
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.network.model.EmployeeInfo
import com.employee.tracker.network.model.GeofenceCheckResult
import com.employee.tracker.data.repository.AttendanceRepository
import com.employee.tracker.service.AttendanceReplayWorker
import com.employee.tracker.service.LocationSyncWorker
import com.employee.tracker.service.LocationTrackingService
import com.employee.tracker.ui.attendance.AttendanceHistoryActivity
import com.employee.tracker.ui.login.LoginActivity
import com.employee.tracker.ui.profile.ProfileActivity
import com.employee.tracker.data.tracking.TrackingHealthStats
import com.employee.tracker.util.Result
import com.google.android.gms.location.LocationServices
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.TimeZone

@AndroidEntryPoint
class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding
    private val viewModel: DashboardViewModel by viewModels()
    private val fusedLocationClient by lazy { LocationServices.getFusedLocationProviderClient(this) }
    private val localZone: ZoneId = ZoneId.systemDefault()
    private val localTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("hh:mm a", Locale.getDefault())
    private val legacyTimestampPatterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd HH:mm:ss"
    )

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (fineGranted) {
            startTracking()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                requestBackgroundLocationIfNeeded()
            }
        } else {
            Toast.makeText(this, "Location permission is required", Toast.LENGTH_LONG).show()
        }
    }

    private val backgroundLocationLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            Toast.makeText(this, "Background location helps track attendance accurately", Toast.LENGTH_LONG).show()
        }
    }

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* Notification permission is optional */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        observeViewModel()
        requestPermissions()

        viewModel.loadProfile()
        viewModel.loadTodayAttendance()
        viewModel.loadPendingCount()
        viewModel.refreshTrackingHealth()
        viewModel.loadPendingAttendanceActionCount()
        AttendanceReplayWorker.enqueuePeriodic(this)
        AttendanceReplayWorker.enqueueImmediate(this)
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadTodayAttendance()
        viewModel.loadPendingCount()
        viewModel.refreshTrackingHealth()
        viewModel.loadPendingAttendanceActionCount()
        AttendanceReplayWorker.enqueueImmediate(this)
    }

    private fun setupUI() {
        binding.btnClockIn.setOnClickListener { performClockAction(isClockIn = true) }
        binding.btnClockOut.setOnClickListener { performClockAction(isClockIn = false) }

        binding.btnSyncLocations.setOnClickListener { viewModel.syncLocations() }

        binding.cardAttendanceHistory.setOnClickListener {
            startActivity(Intent(this, AttendanceHistoryActivity::class.java))
        }

        binding.cardProfile.setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        binding.btnLogout.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Logout")
                .setMessage("Are you sure you want to logout?")
                .setPositiveButton("Logout") { _, _ ->
                    LocationTrackingService.stop(this)
                    viewModel.logout()
                    startActivity(Intent(this, LoginActivity::class.java))
                    finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun observeViewModel() {
        viewModel.profile.observe(this) { result ->
            when (result) {
                is Result.Success -> updateProfileUI(result.data)
                is Result.Error -> Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                is Result.Loading -> {}
            }
        }

        viewModel.todayAttendance.observe(this) { result ->
            when (result) {
                is Result.Success -> updateAttendanceUI(result.data)
                is Result.Error -> Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                is Result.Loading -> {}
            }
        }

        viewModel.clockAction.observe(this) { result ->
            when (result) {
                is Result.Loading -> {
                    binding.btnClockIn.isEnabled = false
                    binding.btnClockOut.isEnabled = false
                }
                is Result.Success -> {
                    binding.btnClockIn.isEnabled = true
                    binding.btnClockOut.isEnabled = true
                    Toast.makeText(this, "Success", Toast.LENGTH_SHORT).show()
                    AttendanceReplayWorker.enqueueImmediate(this)
                    viewModel.loadPendingAttendanceActionCount()
                }
                is Result.Error -> {
                    binding.btnClockIn.isEnabled = true
                    binding.btnClockOut.isEnabled = true
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                    if (result.message == AttendanceRepository.PENDING_ATTENDANCE_ACTION_MESSAGE) {
                        AttendanceReplayWorker.enqueueImmediate(this)
                    }
                    viewModel.loadPendingAttendanceActionCount()
                }
            }
        }

        viewModel.clockActionGate.observe(this) { result ->
            when (result) {
                is Result.Loading -> {
                    binding.btnClockIn.isEnabled = false
                    binding.btnClockOut.isEnabled = false
                }
                is Result.Error -> {
                    binding.btnClockIn.isEnabled = true
                    binding.btnClockOut.isEnabled = true
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                }
                is Result.Success -> {
                    binding.btnClockIn.isEnabled = true
                    binding.btnClockOut.isEnabled = true

                    val gate = result.data
                    updateGeofenceStatus(gate.geofenceCheck)
                    maybeShowGeofenceDialog(gate.geofenceCheck)

                    if (gate.allowed) {
                        if (gate.isClockIn) {
                            viewModel.clockIn(gate.latitude, gate.longitude)
                        } else {
                            viewModel.clockOut(gate.latitude, gate.longitude)
                        }
                    }
                }
            }
        }

        viewModel.pendingLocations.observe(this) { count ->
            binding.tvPendingLocations.text = "Pending sync: $count locations"
            binding.btnSyncLocations.visibility = if (count > 0) View.VISIBLE else View.GONE
        }

        viewModel.trackingHealth.observe(this) { stats ->
            updateTrackingHealthUI(stats)
        viewModel.pendingAttendanceActions.observe(this) { count ->
            binding.tvPendingAttendanceActions.text = "Pending attendance action: $count"
        }
    }

    private fun updateProfileUI(profile: EmployeeInfo) {
        binding.tvEmployeeName.text = profile.name
        binding.tvEmployeeCode.text = profile.employeeCode
        binding.tvDepartment.text = profile.department ?: "N/A"
        binding.tvRole.text = profile.role
    }

    private fun updateAttendanceUI(attendance: AttendanceRecord?) {
        if (attendance == null) {
            binding.tvClockInTime.text = "Not clocked in"
            binding.tvClockOutTime.text = "--"
            binding.tvAttendanceStatus.text = "ABSENT"
            binding.btnClockIn.visibility = View.VISIBLE
            binding.btnClockOut.visibility = View.GONE
            return
        }

        binding.tvAttendanceStatus.text = attendance.status

        if (attendance.timeIn != null) {
            val inText = parseApiTimestamp(attendance.timeIn)
                ?.format(localTimeFormatter)
                ?: attendance.timeIn
            binding.tvClockInTime.text = "In: $inText"
        }

        if (attendance.timeOut != null) {
            val outText = parseApiTimestamp(attendance.timeOut)
                ?.format(localTimeFormatter)
                ?: attendance.timeOut
            binding.tvClockOutTime.text = "Out: $outText"
            binding.btnClockIn.visibility = View.GONE
            binding.btnClockOut.visibility = View.GONE
        } else {
            binding.tvClockOutTime.text = "--"
            binding.btnClockIn.visibility = View.GONE
            binding.btnClockOut.visibility = View.VISIBLE
        }
    }


    private fun updateTrackingHealthUI(stats: TrackingHealthStats) {
        binding.tvLastLocationTimestamp.text = formatTimestamp(stats.lastLocationTimestamp)
        binding.tvLastSyncTimestamp.text = formatTimestamp(stats.lastSuccessfulSyncTimestamp)
        binding.tvTrackingPendingCount.text = stats.pendingLocationCount.toString()
        binding.tvGpsAccuracyBucket.text = stats.gpsAccuracyBucket
        binding.tvMockWarning.text = if (stats.mockLocationWarning) "Mock location detected" else "No mock location detected"
        binding.tvMockWarning.setTextColor(
            ContextCompat.getColor(
                this,
                if (stats.mockLocationWarning) android.R.color.holo_red_dark else android.R.color.darker_gray
            )
        )
    }

    private fun formatTimestamp(timestamp: Long?): String {
        if (timestamp == null) return "--"
        val formatter = SimpleDateFormat("yyyy-MM-dd hh:mm a", Locale.getDefault())
        return formatter.format(Date(timestamp))
    private fun parseApiTimestamp(rawValue: String): ZonedDateTime? {
        val value = rawValue.trim()

        try {
            return Instant.parse(value).atZone(localZone)
        } catch (_: DateTimeParseException) {
        }

        try {
            return OffsetDateTime.parse(value).atZoneSameInstant(localZone)
        } catch (_: DateTimeParseException) {
        }

        legacyTimestampPatterns.forEach { pattern ->
            try {
                return LocalDateTime.parse(value, DateTimeFormatter.ofPattern(pattern, Locale.US)).atZone(localZone)
            } catch (_: DateTimeParseException) {
            }

            try {
                val parser = SimpleDateFormat(pattern, Locale.US).apply {
                    timeZone = TimeZone.getDefault()
                    isLenient = false
                }
                val date = parser.parse(value)
                if (date != null) {
                    return date.toInstant().atZone(localZone)
                }
            } catch (_: Exception) {
            }
        }

        return null
    }

    private fun performClockAction(isClockIn: Boolean) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            Toast.makeText(this, "Location permission required", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    viewModel.prepareClockAction(isClockIn, location.latitude, location.longitude)
                } else {
                    Toast.makeText(this, "Unable to get location. Try again.", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: SecurityException) {
            Toast.makeText(this, "Location permission required", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateGeofenceStatus(result: GeofenceCheckResult) {
        val statusText = when {
            !result.hasAssignedGeofences -> "Geofence: No assigned area"
            result.insideAnyGeofence -> "Geofence: Inside assigned area"
            else -> "Geofence: Outside assigned area"
        }

        binding.tvGeofenceStatus.text = "$statusText (${result.policy})"
    }

    private fun maybeShowGeofenceDialog(result: GeofenceCheckResult) {
        if (!result.hasAssignedGeofences || result.insideAnyGeofence) return

        val geofenceNames = result.geofences.joinToString { it.name }
        val action = if (result.policy == "BLOCK") "blocked" else "allowed with warning"

        AlertDialog.Builder(this)
            .setTitle("Geofence Check")
            .setMessage("You are outside assigned geofence(s): $geofenceNames\nPolicy: ${result.policy}\nClock action is $action.")
            .setPositiveButton("OK", null)
            .show()
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        locationPermissionLauncher.launch(permissions.toTypedArray())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun requestBackgroundLocationIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            showBackgroundLocationRationale()
        }
    }

    private fun showBackgroundLocationRationale() {
        AlertDialog.Builder(this)
            .setTitle("Allow background location")
            .setMessage(
                "Android 10+ requires background location access so attendance tracking " +
                    "continues even when the app is not on screen. " +
                    "Select \"Allow all the time\" on the next prompt for accurate logs."
            )
            .setPositiveButton("Continue") { _, _ ->
                backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            }
            .setNegativeButton("Not now", null)
            .show()
    }

    private fun startTracking() {
        LocationTrackingService.start(this)
        LocationSyncWorker.enqueuePeriodicSync(this)
    }
}
