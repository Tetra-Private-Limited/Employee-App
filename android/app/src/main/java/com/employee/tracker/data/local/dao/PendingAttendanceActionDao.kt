package com.employee.tracker.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.employee.tracker.data.local.entity.PendingAttendanceActionEntity

@Dao
interface PendingAttendanceActionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(action: PendingAttendanceActionEntity)

    @Query("SELECT * FROM pending_attendance_actions ORDER BY actionTimestamp ASC, id ASC LIMIT :limit")
    suspend fun getPending(limit: Int = 100): List<PendingAttendanceActionEntity>

    @Query("SELECT COUNT(*) FROM pending_attendance_actions")
    suspend fun getPendingCount(): Int

    @Query("DELETE FROM pending_attendance_actions WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("UPDATE pending_attendance_actions SET retryCount = retryCount + 1, lastError = :error WHERE id = :id")
    suspend fun incrementRetry(id: Long, error: String?)
}
