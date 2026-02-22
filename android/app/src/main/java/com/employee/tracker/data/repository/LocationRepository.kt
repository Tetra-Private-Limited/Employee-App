package com.employee.tracker.data.repository

import com.employee.tracker.data.local.dao.LocationDao
import com.employee.tracker.data.local.entity.LocationEntity
import com.employee.tracker.network.ApiService
import com.employee.tracker.network.model.LocationBatchRequest
import com.employee.tracker.network.model.LocationEntry
import com.employee.tracker.security.DeviceInfo
import com.employee.tracker.util.Result
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocationRepository @Inject constructor(
    private val api: ApiService,
    private val locationDao: LocationDao,
    private val deviceInfo: DeviceInfo
) {
    suspend fun saveLocationLocally(entity: LocationEntity) {
        locationDao.insert(entity)
    }

    suspend fun getPendingCount(): Int = locationDao.getPendingCount()

    suspend fun syncPendingLocations(): Result<Int> {
        val pending = locationDao.getPending(500)
        if (pending.isEmpty()) return Result.Success(0)

        val entries = pending.map { loc ->
            LocationEntry(
                latitude = loc.latitude,
                longitude = loc.longitude,
                accuracy = loc.accuracy,
                altitude = loc.altitude,
                speed = loc.speed,
                bearing = loc.bearing,
                provider = loc.provider,
                isMock = loc.isMock,
                batteryLevel = loc.batteryLevel,
                deviceId = loc.deviceId,
                satelliteCount = loc.satelliteCount,
                snrAverage = loc.snrAverage,
                accelerometerX = loc.accelerometerX,
                accelerometerY = loc.accelerometerY,
                accelerometerZ = loc.accelerometerZ,
                recordedAt = loc.recordedAt
            )
        }

        return try {
            val response = api.syncLocations(
                LocationBatchRequest(
                    locations = entries,
                    deviceId = deviceInfo.getDeviceId(),
                    integrityToken = null
                )
            )
            if (response.isSuccessful) {
                locationDao.deleteByIds(pending.map { it.id })
                Result.Success(pending.size)
            } else {
                Result.Error("Sync failed: ${response.code()}")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Sync failed")
        }
    }
}
