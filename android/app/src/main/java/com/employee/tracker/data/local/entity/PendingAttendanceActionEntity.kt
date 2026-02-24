package com.employee.tracker.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_attendance_actions")
data class PendingAttendanceActionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val actionType: String,
    val latitude: Double,
    val longitude: Double,
    val actionTimestamp: Long,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
