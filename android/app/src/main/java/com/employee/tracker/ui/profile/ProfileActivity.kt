package com.employee.tracker.ui.profile

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.employee.tracker.databinding.ActivityProfileBinding
import com.employee.tracker.util.Result
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProfileBinding
    private val viewModel: ProfileViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Profile"
        binding.toolbar.setNavigationOnClickListener { finish() }

        observeViewModel()
        viewModel.loadProfile()

        binding.btnChangePassword.setOnClickListener {
            val oldPw = binding.etOldPassword.text.toString()
            val newPw = binding.etNewPassword.text.toString()

            if (oldPw.length < 6 || newPw.length < 6) {
                Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            viewModel.changePassword(oldPw, newPw)
        }
    }

    private fun observeViewModel() {
        viewModel.profile.observe(this) { result ->
            when (result) {
                is Result.Success -> {
                    val p = result.data
                    binding.tvName.text = p.name
                    binding.tvEmail.text = p.email
                    binding.tvEmployeeCode.text = p.employeeCode
                    binding.tvPhone.text = p.phone ?: "N/A"
                    binding.tvDepartment.text = p.department ?: "N/A"
                    binding.tvDesignation.text = p.designation ?: "N/A"
                    binding.tvRole.text = p.role
                    binding.contentGroup.visibility = View.VISIBLE
                }
                is Result.Error -> Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                is Result.Loading -> {}
            }
        }

        viewModel.changePasswordResult.observe(this) { result ->
            when (result) {
                is Result.Success -> {
                    Toast.makeText(this, "Password changed successfully", Toast.LENGTH_SHORT).show()
                    binding.etOldPassword.text?.clear()
                    binding.etNewPassword.text?.clear()
                }
                is Result.Error -> Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                is Result.Loading -> {}
            }
        }
    }
}
