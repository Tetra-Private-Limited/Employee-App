package com.employee.tracker.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_locations")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
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
    val satelliteCount: Int?,
    val snrAverage: Float?,
    val accelerometerX: Float?,
    val accelerometerY: Float?,
    val accelerometerZ: Float?,
    val recordedAt: Long,
    val createdAt: Long = System.currentTimeMillis()
)
