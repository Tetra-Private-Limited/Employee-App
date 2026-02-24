package com.employee.tracker.data.repository

import com.employee.tracker.data.local.dao.PendingAttendanceActionDao
import com.employee.tracker.data.local.entity.PendingAttendanceActionEntity
import com.employee.tracker.network.ApiService
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.network.model.TimeInRequest
import com.employee.tracker.network.model.TimeOutRequest
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.util.Result
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AttendanceRepository @Inject constructor(
    private val api: ApiService,
    private val deviceInfo: DeviceInfo,
    private val pendingAttendanceActionDao: PendingAttendanceActionDao
) {

    suspend fun timeIn(latitude: Double, longitude: Double): Result<AttendanceRecord> {
        return try {
            val response = api.timeIn(
                TimeInRequest(latitude, longitude, deviceInfo.getDeviceId())
            )
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else if (response.code() >= 500) {
                enqueuePendingAction(ActionType.TIME_IN, latitude, longitude, response.body()?.message)
                Result.Error(PENDING_ATTENDANCE_ACTION_MESSAGE)
            } else {
                Result.Error(response.body()?.message ?: "Clock-in failed")
            }
        } catch (e: Exception) {
            enqueuePendingAction(ActionType.TIME_IN, latitude, longitude, e.message)
            Result.Error(PENDING_ATTENDANCE_ACTION_MESSAGE)
        }
    }

    suspend fun timeOut(latitude: Double, longitude: Double): Result<AttendanceRecord> {
        return try {
            val response = api.timeOut(TimeOutRequest(latitude, longitude))
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else if (response.code() >= 500) {
                enqueuePendingAction(ActionType.TIME_OUT, latitude, longitude, response.body()?.message)
                Result.Error(PENDING_ATTENDANCE_ACTION_MESSAGE)
            } else {
                Result.Error(response.body()?.message ?: "Clock-out failed")
            }
        } catch (e: Exception) {
            enqueuePendingAction(ActionType.TIME_OUT, latitude, longitude, e.message)
            Result.Error(PENDING_ATTENDANCE_ACTION_MESSAGE)
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
    suspend fun getPendingAttendanceActionCount(): Int = pendingAttendanceActionDao.getPendingCount()

    suspend fun replayPendingAttendanceActions(limit: Int = 50): Result<Int> {
        val pending = pendingAttendanceActionDao.getPending(limit)
        if (pending.isEmpty()) return Result.Success(0)

        var processed = 0
        for (action in pending) {
            try {
                val response = when (action.actionType) {
                    ActionType.TIME_IN.name -> api.timeIn(
                        TimeInRequest(action.latitude, action.longitude, deviceInfo.getDeviceId())
                    )

                    ActionType.TIME_OUT.name -> api.timeOut(
                        TimeOutRequest(action.latitude, action.longitude)
                    )

                    else -> {
                        pendingAttendanceActionDao.deleteById(action.id)
                        continue
                    }
                }

                if (response.isSuccessful) {
                    pendingAttendanceActionDao.deleteById(action.id)
                    processed++
                    continue
                }

                val message = response.body()?.message
                if (isReconciledConflict(action.actionType, response.code(), message)) {
                    pendingAttendanceActionDao.deleteById(action.id)
                    processed++
                    continue
                }

                if (response.code() >= 500) {
                    pendingAttendanceActionDao.incrementRetry(action.id, message)
                    return Result.Error(message ?: "Server unavailable")
                }

                pendingAttendanceActionDao.deleteById(action.id)
            } catch (e: HttpException) {
                pendingAttendanceActionDao.incrementRetry(action.id, e.message())
                return Result.Error(e.message ?: "Replay failed")
            } catch (e: Exception) {
                pendingAttendanceActionDao.incrementRetry(action.id, e.message)
                return Result.Error(e.message ?: "Replay failed")
            }
        }

        return Result.Success(processed)
    }

    private suspend fun enqueuePendingAction(
        actionType: ActionType,
        latitude: Double,
        longitude: Double,
        lastError: String?
    ) {
        pendingAttendanceActionDao.insert(
            PendingAttendanceActionEntity(
                actionType = actionType.name,
                latitude = latitude,
                longitude = longitude,
                actionTimestamp = System.currentTimeMillis(),
                lastError = lastError
            )
        )
    }

    private fun isReconciledConflict(actionType: String, code: Int, message: String?): Boolean {
        if (code != 400 || message == null) return false
        val normalized = message.lowercase()

        return when (actionType) {
            ActionType.TIME_IN.name -> normalized.contains("already clocked in")
            ActionType.TIME_OUT.name -> normalized.contains("already clocked out")
            else -> false
        }
    }

    enum class ActionType {
        TIME_IN,
        TIME_OUT
    }

    companion object {
        const val PENDING_ATTENDANCE_ACTION_MESSAGE = "pending attendance action"
    }
}
