package com.employee.tracker.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.employee.tracker.data.local.dao.LocationDao
import com.employee.tracker.data.local.entity.LocationEntity

@Database(
    entities = [LocationEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao
}
