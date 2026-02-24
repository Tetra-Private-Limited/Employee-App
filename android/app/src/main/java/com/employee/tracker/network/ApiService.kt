package com.employee.tracker.network

import com.employee.tracker.network.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // ─── Auth ─────────────────────────────────────────

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginResponse>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<ApiResponse<TokenResponse>>

    @GET("auth/me")
    suspend fun getProfile(): Response<ApiResponse<EmployeeInfo>>

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ApiResponse<Any>>

    // ─── Attendance ───────────────────────────────────

    @POST("attendance/time-in")
    suspend fun timeIn(@Body request: TimeInRequest): Response<ApiResponse<AttendanceRecord>>

    @POST("attendance/time-out")
    suspend fun timeOut(@Body request: TimeOutRequest): Response<ApiResponse<AttendanceRecord>>

    @GET("attendance/today")
    suspend fun getAttendanceToday(): Response<ApiResponse<AttendanceRecord?>>

    @GET("attendance")
    suspend fun listAttendance(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): Response<PaginatedResponse<List<AttendanceRecord>>>

    // ─── Location ─────────────────────────────────────

    @POST("locations/batch")
    suspend fun syncLocations(@Body request: LocationBatchRequest): Response<ApiResponse<Any>>

    // ─── Geofences ────────────────────────────────────

    @GET("geofences/my")
    suspend fun getMyGeofences(): Response<ApiResponse<List<GeofenceInfo>>>

    @GET("geofences/check")
    suspend fun checkMyGeofences(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double
    ): Response<ApiResponse<GeofenceCheckResult>>
}
