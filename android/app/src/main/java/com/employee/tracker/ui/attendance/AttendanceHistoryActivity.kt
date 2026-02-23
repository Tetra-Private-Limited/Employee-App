package com.employee.tracker.ui.attendance

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.employee.tracker.R
import com.employee.tracker.databinding.ActivityAttendanceHistoryBinding
import com.employee.tracker.network.model.AttendanceRecord
import com.employee.tracker.util.Result
import dagger.hilt.android.AndroidEntryPoint
import java.text.SimpleDateFormat
import java.util.*

@AndroidEntryPoint
class AttendanceHistoryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAttendanceHistoryBinding
    private val viewModel: AttendanceHistoryViewModel by viewModels()
    private val adapter = AttendanceAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAttendanceHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Attendance History"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter

        viewModel.history.observe(this) { result ->
            when (result) {
                is Result.Loading -> binding.progressBar.visibility = View.VISIBLE
                is Result.Success -> {
                    binding.progressBar.visibility = View.GONE
                    adapter.submitList(result.data)
                    binding.tvEmpty.visibility = if (result.data.isEmpty()) View.VISIBLE else View.GONE
                }
                is Result.Error -> {
                    binding.progressBar.visibility = View.GONE
                    Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                }
            }
        }

        viewModel.loadHistory()
    }
}

class AttendanceAdapter : RecyclerView.Adapter<AttendanceAdapter.ViewHolder>() {

    private val items = mutableListOf<AttendanceRecord>()

    fun submitList(list: List<AttendanceRecord>) {
        items.clear()
        items.addAll(list)
        notifyDataSetChanged()
    }

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val tvTimeIn: TextView = view.findViewById(R.id.tvTimeIn)
        val tvTimeOut: TextView = view.findViewById(R.id.tvTimeOut)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_attendance, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
        val dateFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())

        try {
            val date = parser.parse(item.date)
            holder.tvDate.text = date?.let { dateFormat.format(it) } ?: item.date
        } catch (e: Exception) {
            holder.tvDate.text = item.date
        }

        holder.tvStatus.text = item.status

        holder.tvTimeIn.text = item.timeIn?.let {
            try {
                val d = parser.parse(it)
                "In: ${d?.let { t -> timeFormat.format(t) } ?: it}"
            } catch (e: Exception) { "In: $it" }
        } ?: "In: --"

        holder.tvTimeOut.text = item.timeOut?.let {
            try {
                val d = parser.parse(it)
                "Out: ${d?.let { t -> timeFormat.format(t) } ?: it}"
            } catch (e: Exception) { "Out: $it" }
        } ?: "Out: --"
    }

    override fun getItemCount() = items.size
}
