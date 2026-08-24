package com.employee.tracker.data.repository

import com.employee.tracker.network.ApiService
import com.employee.tracker.network.model.*
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.security.TokenManager
import com.employee.tracker.util.Result
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenManager: TokenManager,
    private val deviceInfo: DeviceInfo
) {
    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = api.login(
                LoginRequest(
                    email = email,
                    password = password,
                    deviceId = deviceInfo.getDeviceId(),
                    deviceModel = deviceInfo.getDeviceModel()
                )
            )
            if (response.isSuccessful && response.body()?.data != null) {
                val data = response.body()!!.data!!
                tokenManager.saveTokens(data.accessToken, data.refreshToken)
                tokenManager.saveEmployeeId(data.employee.id)
                Result.Success(data)
            } else {
                Result.Error(response.body()?.message ?: "Login failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getProfile(): Result<EmployeeInfo> {
        return try {
            val response = api.getProfile()
            if (response.isSuccessful && response.body()?.data != null) {
                Result.Success(response.body()!!.data!!)
            } else {
                Result.Error(response.body()?.message ?: "Failed to fetch profile")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun changePassword(oldPassword: String, newPassword: String): Result<Unit> {
        return try {
            val response = api.changePassword(ChangePasswordRequest(oldPassword, newPassword))
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error(response.body()?.message ?: "Failed to change password")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // Invalidates the refresh token server-side so logout actually ends the
    // session (previously this only cleared local storage, leaving the
    // refresh token valid server-side for its full lifetime). Local state
    // is always cleared, even if the request fails (e.g. offline) — logout
    // must never leave the user stuck signed in on the device.
    suspend fun logout() {
        try {
            api.logout()
        } catch (e: Exception) {
            // Best-effort — local logout proceeds regardless.
        } finally {
            tokenManager.clearAll()
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()
}
