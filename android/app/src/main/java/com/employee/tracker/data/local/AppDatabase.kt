package com.employee.tracker.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.employee.tracker.data.local.dao.LocationDao
import com.employee.tracker.data.local.dao.PendingAttendanceActionDao
import com.employee.tracker.data.local.entity.LocationEntity
import com.employee.tracker.data.local.entity.PendingAttendanceActionEntity

@Database(
    entities = [
        LocationEntity::class,
        PendingAttendanceActionEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao
    abstract fun pendingAttendanceActionDao(): PendingAttendanceActionDao
}
