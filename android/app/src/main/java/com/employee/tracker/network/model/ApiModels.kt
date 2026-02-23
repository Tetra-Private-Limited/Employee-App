package com.employee.tracker.network.model

import com.google.gson.annotations.SerializedName

// ─── Generic Response Wrapper ─────────────────────────

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?
)

data class PaginatedResponse<T>(
    val success: Boolean,
    val data: T?,
    val pagination: Pagination?
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

// ─── Auth ─────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String,
    val deviceId: String?,
    val deviceModel: String?
)

data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val employee: EmployeeInfo
)

data class RefreshTokenRequest(
    val refreshToken: String
)

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String
)

data class ChangePasswordRequest(
    val oldPassword: String,
    val newPassword: String
)

// ─── Employee ─────────────────────────────────────────

data class EmployeeInfo(
    val id: String,
    val name: String,
    val email: String,
    val employeeCode: String,
    val role: String,
    val department: String?,
    val designation: String?,
    val phone: String?,
    val isActive: Boolean?,
    val registeredDeviceId: String?,
    val createdAt: String?
)

// ─── Attendance ───────────────────────────────────────

data class TimeInRequest(
    val latitude: Double,
    val longitude: Double,
    val deviceId: String?
)

data class TimeOutRequest(
    val latitude: Double,
    val longitude: Double
)

data class AttendanceRecord(
    val id: String,
    val employeeId: String,
    val date: String,
    val timeIn: String?,
    val timeOut: String?,
    val timeInLatitude: Double?,
    val timeInLongitude: Double?,
    val timeOutLatitude: Double?,
    val timeOutLongitude: Double?,
    val status: String,
    val notes: String?,
    val employee: AttendanceEmployee?
)

data class AttendanceEmployee(
    val id: String,
    val name: String,
    val employeeCode: String,
    val department: String?
)

// ─── Location ─────────────────────────────────────────

data class LocationBatchRequest(
    val locations: List<LocationEntry>,
    val deviceId: String?,
    val integrityToken: String?
)

data class LocationEntry(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val altitude: Double?,
    val speed: Float?,
    val bearing: Float?,
    val provider: String?,
    val isMock: Boolean,
    val batteryLevel: Int?,
    val deviceId: String?,
    @SerializedName("satelliteCount")
    val satelliteCount: Int?,
    @SerializedName("snrAverage")
    val snrAverage: Float?,
    @SerializedName("accelerometerX")
    val accelerometerX: Float?,
    @SerializedName("accelerometerY")
    val accelerometerY: Float?,
    @SerializedName("accelerometerZ")
    val accelerometerZ: Float?,
    val recordedAt: Long
)

// ─── Geofence ─────────────────────────────────────────

data class GeofenceInfo(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int,
    val type: String,
    val isActive: Boolean
)
