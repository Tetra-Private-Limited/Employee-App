package com.employee.tracker.util

import org.json.JSONObject
import retrofit2.Response

fun <T> parseErrorMessage(response: Response<T>, fallback: String): String {
    return try {
        val errorBody = response.errorBody()?.string()
        if (errorBody != null) {
            val json = JSONObject(errorBody)
            json.optString("error", fallback)
        } else {
            fallback
        }
    } catch (e: Exception) {
        fallback
    }
}
