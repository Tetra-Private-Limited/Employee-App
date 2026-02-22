package com.employee.tracker.network

import com.employee.tracker.network.model.RefreshTokenRequest
import com.employee.tracker.security.TokenManager
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenManager: TokenManager,
    private val apiServiceProvider: Provider<ApiService>
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Prevent infinite retry loops
        if (response.request.header("X-Retry-Auth") != null) {
            tokenManager.clearTokens()
            return null
        }

        val refreshToken = tokenManager.getRefreshToken() ?: run {
            tokenManager.clearTokens()
            return null
        }

        return runBlocking {
            try {
                val refreshResponse = apiServiceProvider.get()
                    .refreshToken(RefreshTokenRequest(refreshToken))

                if (refreshResponse.isSuccessful && refreshResponse.body()?.data != null) {
                    val tokens = refreshResponse.body()!!.data!!
                    tokenManager.saveTokens(tokens.accessToken, tokens.refreshToken)

                    response.request.newBuilder()
                        .header("Authorization", "Bearer ${tokens.accessToken}")
                        .header("X-Retry-Auth", "true")
                        .build()
                } else {
                    tokenManager.clearTokens()
                    null
                }
            } catch (e: Exception) {
                tokenManager.clearTokens()
                null
            }
        }
    }
}
