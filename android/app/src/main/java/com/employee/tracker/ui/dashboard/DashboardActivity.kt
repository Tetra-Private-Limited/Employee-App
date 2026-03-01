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
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.employee.tracker.databinding.ActivityDashboardBinding
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.network.model.EmployeeInfo
import com.employee.tracker.service.LocationSyncWorker
import com.employee.tracker.service.LocationTrackingService
import com.employee.tracker.ui.attendance.AttendanceHistoryActivity
import com.employee.tracker.ui.login.LoginActivity
import com.employee.tracker.ui.profile.ProfileActivity
import com.employee.tracker.util.Result
import com.google.android.gms.location.LocationServices
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.*

@AndroidEntryPoint
class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding
    private val viewModel: DashboardViewModel by viewModels()
    private val fusedLocationClient by lazy { LocationServices.getFusedLocationProviderClient(this) }

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
        // Request notification permission after location permission dialog completes
        requestNotificationPermissionIfNeeded()
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
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadTodayAttendance()
        viewModel.loadPendingCount()
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
                }
                is Result.Error -> {
                    binding.btnClockIn.isEnabled = true
                    binding.btnClockOut.isEnabled = true
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }

        viewModel.pendingLocations.observe(this) { count ->
            binding.tvPendingLocations.text = "Pending sync: $count locations"
            binding.btnSyncLocations.visibility = if (count > 0) View.VISIBLE else View.GONE
        }
    }

    private fun updateProfileUI(profile: EmployeeInfo) {
        binding.tvEmployeeName.text = profile.name
        binding.tvEmployeeCode.text = profile.employeeCode
        binding.tvDepartment.text = profile.department ?: "N/A"
        binding.tvRole.text = profile.role
    }

    private fun updateAttendanceUI(attendance: AttendanceRecord?) {
        val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())

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
            try {
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val date = parser.parse(attendance.timeIn)
                binding.tvClockInTime.text = "In: ${date?.let { timeFormat.format(it) } ?: attendance.timeIn}"
            } catch (e: Exception) {
                binding.tvClockInTime.text = "In: ${attendance.timeIn}"
            }
        }

        if (attendance.timeOut != null) {
            try {
                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val date = parser.parse(attendance.timeOut)
                binding.tvClockOutTime.text = "Out: ${date?.let { timeFormat.format(it) } ?: attendance.timeOut}"
            } catch (e: Exception) {
                binding.tvClockOutTime.text = "Out: ${attendance.timeOut}"
            }
            binding.btnClockIn.visibility = View.GONE
            binding.btnClockOut.visibility = View.GONE
        } else {
            binding.tvClockOutTime.text = "--"
            binding.btnClockIn.visibility = View.GONE
            binding.btnClockOut.visibility = View.VISIBLE
        }
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
                    if (isClockIn) {
                        viewModel.clockIn(location.latitude, location.longitude)
                    } else {
                        viewModel.clockOut(location.latitude, location.longitude)
                    }
                } else {
                    Toast.makeText(this, "Unable to get location. Try again.", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: SecurityException) {
            Toast.makeText(this, "Location permission required", Toast.LENGTH_SHORT).show()
        }
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        locationPermissionLauncher.launch(permissions.toTypedArray())
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun requestBackgroundLocationIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            backgroundLocationLauncher.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
    }

    private fun startTracking() {
        LocationTrackingService.start(this)
        LocationSyncWorker.enqueuePeriodicSync(this)
    }
}
