package com.employee.tracker.di

import android.content.Context
import androidx.room.Room
import com.employee.tracker.data.local.AppDatabase
import com.employee.tracker.data.local.dao.LocationDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "employee_tracker.db"
        ).build()
    }

    @Provides
    fun provideLocationDao(database: AppDatabase): LocationDao {
        return database.locationDao()
    }
}
