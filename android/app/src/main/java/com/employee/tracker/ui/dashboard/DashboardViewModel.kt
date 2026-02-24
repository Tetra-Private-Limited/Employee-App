package com.employee.tracker.ui.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.employee.tracker.data.repository.AttendanceRepository
import com.employee.tracker.data.repository.AuthRepository
import com.employee.tracker.data.repository.LocationRepository
import com.employee.tracker.data.tracking.TrackingHealthStats
import com.employee.tracker.data.tracking.TrackingHealthStore
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.network.model.EmployeeInfo
import com.employee.tracker.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val attendanceRepository: AttendanceRepository,
    private val locationRepository: LocationRepository,
    private val trackingHealthStore: TrackingHealthStore
) : ViewModel() {

    private val _profile = MutableLiveData<Result<EmployeeInfo>>()
    val profile: LiveData<Result<EmployeeInfo>> = _profile

    private val _todayAttendance = MutableLiveData<Result<AttendanceRecord?>>()
    val todayAttendance: LiveData<Result<AttendanceRecord?>> = _todayAttendance

    private val _clockAction = MutableLiveData<Result<AttendanceRecord>>()
    val clockAction: LiveData<Result<AttendanceRecord>> = _clockAction

    private val _pendingLocations = MutableLiveData<Int>()
    val pendingLocations: LiveData<Int> = _pendingLocations

    private val _trackingHealth = MutableLiveData<TrackingHealthStats>()
    val trackingHealth: LiveData<TrackingHealthStats> = _trackingHealth

    fun loadProfile() {
        viewModelScope.launch {
            _profile.value = Result.Loading
            _profile.value = authRepository.getProfile()
        }
    }

    fun loadTodayAttendance() {
        viewModelScope.launch {
            _todayAttendance.value = Result.Loading
            _todayAttendance.value = attendanceRepository.getTodayAttendance()
        }
    }

    fun clockIn(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            _clockAction.value = Result.Loading
            _clockAction.value = attendanceRepository.timeIn(latitude, longitude)
            loadTodayAttendance()
        }
    }

    fun clockOut(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            _clockAction.value = Result.Loading
            _clockAction.value = attendanceRepository.timeOut(latitude, longitude)
            loadTodayAttendance()
        }
    }

    fun syncLocations() {
        viewModelScope.launch {
            val syncResult = locationRepository.syncPendingLocations()
            val pendingCount = locationRepository.getPendingCount()
            _pendingLocations.value = pendingCount
            if (syncResult is Result.Success) {
                trackingHealthStore.recordSyncSuccess(System.currentTimeMillis(), pendingCount)
            } else {
                trackingHealthStore.updatePendingCount(pendingCount)
            }
            _trackingHealth.value = trackingHealthStore.getStats()
        }
    }

    fun loadPendingCount() {
        viewModelScope.launch {
            val pendingCount = locationRepository.getPendingCount()
            _pendingLocations.value = pendingCount
            trackingHealthStore.updatePendingCount(pendingCount)
            _trackingHealth.value = trackingHealthStore.getStats()
        }
    }

    fun refreshTrackingHealth() {
        _trackingHealth.value = trackingHealthStore.getStats()
    }

    fun logout() {
        authRepository.logout()
    }
}
