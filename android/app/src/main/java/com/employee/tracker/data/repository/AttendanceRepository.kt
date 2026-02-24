package com.employee.tracker.data.repository

import com.employee.tracker.network.ApiService
import com.employee.tracker.network.model.*
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.util.Result
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepository @Inject constructor(
    private val api: ApiService,
    private val deviceInfo: DeviceInfo
) {
    suspend fun timeIn(latitude: Double, longitude: Double): Result<AttendanceRecord> {
        return try {
            val response = api.timeIn(
                TimeInRequest(latitude, longitude, deviceInfo.getDeviceId())
            )
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(response.body()?.message ?: "Clock-in failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun timeOut(latitude: Double, longitude: Double): Result<AttendanceRecord> {
        return try {
            val response = api.timeOut(TimeOutRequest(latitude, longitude))
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(response.body()?.message ?: "Clock-out failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getTodayAttendance(): Result<AttendanceRecord?> {
        return try {
            val response = api.getAttendanceToday()
            if (response.isSuccessful) {
                Result.Success(response.body()?.data)
            } else {
                Result.Error(response.body()?.message ?: "Failed to fetch attendance")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getHistory(
        page: Int = 1,
        limit: Int = 20,
        startDate: String? = null,
        endDate: String? = null
    ): Result<List<AttendanceRecord>> {
        return try {
            val response = api.listAttendance(page, limit, startDate, endDate)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error("Failed to fetch attendance history")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun checkMyGeofences(latitude: Double, longitude: Double): Result<GeofenceCheckResult> {
        return try {
            val response = api.checkMyGeofences(latitude, longitude)
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(response.body()?.message ?: "Failed to check geofence status")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }
}
