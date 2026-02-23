package com.employee.tracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.employee.tracker.data.local.entity.LocationEntity

@Dao
interface LocationDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(location: LocationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(locations: List<LocationEntity>)

    @Query("SELECT * FROM pending_locations ORDER BY recordedAt ASC LIMIT :limit")
    suspend fun getPending(limit: Int = 500): List<LocationEntity>

    @Query("SELECT COUNT(*) FROM pending_locations")
    suspend fun getPendingCount(): Int

    @Query("DELETE FROM pending_locations WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<Long>)

    @Query("DELETE FROM pending_locations")
    suspend fun deleteAll()
}
