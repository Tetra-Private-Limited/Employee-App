package com.employee.tracker.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.employee.tracker.data.repository.AuthRepository
import com.employee.tracker.network.model.LoginResponse
import com.employee.tracker.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _loginResult = MutableLiveData<Result<LoginResponse>>()
    val loginResult: LiveData<Result<LoginResponse>> = _loginResult

    fun login(email: String, password: String) {
        _loginResult.value = Result.Loading
        viewModelScope.launch {
            _loginResult.value = authRepository.login(email, password)
        }
    }

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()
}
