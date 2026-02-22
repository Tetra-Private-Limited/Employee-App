package com.employee.tracker.network

import com.employee.tracker.security.TokenManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        // Skip auth for login and refresh endpoints
        val path = request.url.encodedPath
        if (path.endsWith("/auth/login") || path.endsWith("/auth/refresh")) {
            return chain.proceed(request)
        }

        val token = tokenManager.getAccessToken() ?: return chain.proceed(request)

        val authenticatedRequest = request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
