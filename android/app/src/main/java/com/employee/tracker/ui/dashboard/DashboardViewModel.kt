package com.employee.tracker.ui.dashboard

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.employee.tracker.data.repository.AttendanceRepository
import com.employee.tracker.data.repository.AuthRepository
import com.employee.tracker.data.repository.LocationRepository
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.network.model.EmployeeInfo
import com.employee.tracker.network.model.GeofenceCheckResult
import com.employee.tracker.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val attendanceRepository: AttendanceRepository,
    private val locationRepository: LocationRepository
) : ViewModel() {

    data class ClockActionGate(
        val isClockIn: Boolean,
        val latitude: Double,
        val longitude: Double,
        val geofenceCheck: GeofenceCheckResult,
        val allowed: Boolean
    )

    private val _profile = MutableLiveData<Result<EmployeeInfo>>()
    val profile: LiveData<Result<EmployeeInfo>> = _profile

    private val _todayAttendance = MutableLiveData<Result<AttendanceRecord?>>()
    val todayAttendance: LiveData<Result<AttendanceRecord?>> = _todayAttendance

    private val _clockAction = MutableLiveData<Result<AttendanceRecord>>()
    val clockAction: LiveData<Result<AttendanceRecord>> = _clockAction

    private val _pendingLocations = MutableLiveData<Int>()
    val pendingLocations: LiveData<Int> = _pendingLocations

    private val _clockActionGate = MutableLiveData<Result<ClockActionGate>>()
    val clockActionGate: LiveData<Result<ClockActionGate>> = _clockActionGate
    private val _pendingAttendanceActions = MutableLiveData<Int>()
    val pendingAttendanceActions: LiveData<Int> = _pendingAttendanceActions

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
            loadPendingAttendanceActionCount()
        }
    }

    fun clockOut(latitude: Double, longitude: Double) {
        viewModelScope.launch {
            _clockAction.value = Result.Loading
            _clockAction.value = attendanceRepository.timeOut(latitude, longitude)
            loadTodayAttendance()
            loadPendingAttendanceActionCount()
        }
    }

    fun prepareClockAction(isClockIn: Boolean, latitude: Double, longitude: Double) {
        viewModelScope.launch {
            _clockActionGate.value = Result.Loading
            when (val result = attendanceRepository.checkMyGeofences(latitude, longitude)) {
                is Result.Success -> {
                    val check = result.data
                    val allowed = check.policy != "BLOCK" || check.insideAnyGeofence || !check.hasAssignedGeofences
                    _clockActionGate.value = Result.Success(
                        ClockActionGate(
                            isClockIn = isClockIn,
                            latitude = latitude,
                            longitude = longitude,
                            geofenceCheck = check,
                            allowed = allowed
                        )
                    )
                }
                is Result.Error -> _clockActionGate.value = Result.Error(result.message)
                is Result.Loading -> _clockActionGate.value = Result.Loading
            }
        }
    }

    fun syncLocations() {
        viewModelScope.launch {
            locationRepository.syncPendingLocations()
            _pendingLocations.value = locationRepository.getPendingCount()
        }
    }

    fun loadPendingCount() {
        viewModelScope.launch {
            _pendingLocations.value = locationRepository.getPendingCount()
        }
    }

    fun loadPendingAttendanceActionCount() {
        viewModelScope.launch {
            _pendingAttendanceActions.value = attendanceRepository.getPendingAttendanceActionCount()
        }
    }

    fun logout() {
        authRepository.logout()
    }
}
