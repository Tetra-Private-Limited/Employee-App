package com.employee.tracker.ui.profile

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.employee.tracker.data.repository.AuthRepository
import com.employee.tracker.network.model.EmployeeInfo
import com.employee.tracker.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _profile = MutableLiveData<Result<EmployeeInfo>>()
    val profile: LiveData<Result<EmployeeInfo>> = _profile

    private val _changePasswordResult = MutableLiveData<Result<Unit>>()
    val changePasswordResult: LiveData<Result<Unit>> = _changePasswordResult

    fun loadProfile() {
        _profile.value = Result.Loading
        viewModelScope.launch {
            _profile.value = authRepository.getProfile()
        }
    }

    fun changePassword(oldPassword: String, newPassword: String) {
        _changePasswordResult.value = Result.Loading
        viewModelScope.launch {
            _changePasswordResult.value = authRepository.changePassword(oldPassword, newPassword)
        }
    }
}
