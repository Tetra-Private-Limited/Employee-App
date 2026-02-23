package com.employee.tracker.ui.attendance

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.employee.tracker.data.repository.AttendanceRepository
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AttendanceHistoryViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository
) : ViewModel() {

    private val _history = MutableLiveData<Result<List<AttendanceRecord>>>()
    val history: LiveData<Result<List<AttendanceRecord>>> = _history

    fun loadHistory(page: Int = 1) {
        _history.value = Result.Loading
        viewModelScope.launch {
            _history.value = attendanceRepository.getHistory(page = page, limit = 30)
        }
    }
}
