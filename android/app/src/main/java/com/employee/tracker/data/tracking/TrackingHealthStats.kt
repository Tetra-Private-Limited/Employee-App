package com.employee.tracker.data.tracking

data class TrackingHealthStats(
    val lastLocationTimestamp: Long?,
    val lastSuccessfulSyncTimestamp: Long?,
    val pendingLocationCount: Int,
    val gpsAccuracyBucket: String,
    val mockLocationWarning: Boolean
)
