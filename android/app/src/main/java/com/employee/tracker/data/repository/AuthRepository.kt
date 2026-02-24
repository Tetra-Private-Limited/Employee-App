package com.employee.tracker.data.repository

import com.employee.tracker.network.ApiService
import com.employee.tracker.network.model.*
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.security.TokenManager
import com.employee.tracker.util.Result
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val tokenManager: TokenManager,
    private val deviceInfo: DeviceInfo
) {
    data class BootSessionStatus(
        val canStartTracking: Boolean,
        val reasonCode: String
    )

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

    fun logout() {
        tokenManager.clearAll()
    }

    fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()

    suspend fun validateSessionForBoot(
        performLightweightValidation: Boolean = true
    ): BootSessionStatus {
        if (!tokenManager.hasRefreshToken()) {
            tokenManager.clearTokens()
            return BootSessionStatus(
                canStartTracking = false,
                reasonCode = "BOOT_SKIP_NO_REFRESH_TOKEN"
            )
        }

        val refreshToken = tokenManager.getRefreshToken()
        if (refreshToken.isNullOrBlank()) {
            tokenManager.clearTokens()
            return BootSessionStatus(
                canStartTracking = false,
                reasonCode = "BOOT_SKIP_NO_REFRESH_TOKEN"
            )
        }

        if (!performLightweightValidation) {
            return BootSessionStatus(
                canStartTracking = true,
                reasonCode = "BOOT_START_REFRESH_TOKEN_PRESENT"
            )
        }

        return try {
            val response = api.refreshToken(RefreshTokenRequest(refreshToken))
            if (response.isSuccessful && response.body()?.data != null) {
                val tokens = response.body()!!.data!!
                tokenManager.saveTokens(tokens.accessToken, tokens.refreshToken)
                BootSessionStatus(
                    canStartTracking = true,
                    reasonCode = "BOOT_START_REFRESH_VALIDATED"
                )
            } else {
                tokenManager.clearTokens()
                BootSessionStatus(
                    canStartTracking = false,
                    reasonCode = "BOOT_SKIP_REFRESH_REJECTED"
                )
            }
        } catch (e: Exception) {
            if (e is HttpException) {
                tokenManager.clearTokens()
                return BootSessionStatus(
                    canStartTracking = false,
                    reasonCode = "BOOT_SKIP_REFRESH_HTTP_${e.code()}"
                )
            }

            BootSessionStatus(
                canStartTracking = true,
                reasonCode = "BOOT_START_REFRESH_CHECK_SKIPPED_NETWORK"
            )
        }
    }
}
