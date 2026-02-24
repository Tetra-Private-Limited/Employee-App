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
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.TimeZone

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
    private val localZone: ZoneId = ZoneId.systemDefault()
    private val timeDisplayFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("hh:mm a", Locale.getDefault())
    private val dateDisplayFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM dd, yyyy", Locale.getDefault())
    private val legacyTimestampPatterns = listOf(
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd HH:mm:ss"
    )
    private val legacyDatePatterns = listOf("yyyy-MM-dd")

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
        holder.tvDate.text = parseApiDate(item.date)
            ?.format(dateDisplayFormatter)
            ?: item.date

        holder.tvStatus.text = item.status

        holder.tvTimeIn.text = item.timeIn?.let {
            val localTime = parseApiTimestamp(it)?.format(timeDisplayFormatter) ?: it
            "In: $localTime"
        } ?: "In: --"

        holder.tvTimeOut.text = item.timeOut?.let {
            val localTime = parseApiTimestamp(it)?.format(timeDisplayFormatter) ?: it
            "Out: $localTime"
        } ?: "Out: --"
    }

    private fun parseApiTimestamp(rawValue: String): ZonedDateTime? {
        val value = rawValue.trim()

        try {
            return Instant.parse(value).atZone(localZone)
        } catch (_: DateTimeParseException) {
        }

        try {
            return OffsetDateTime.parse(value).atZoneSameInstant(localZone)
        } catch (_: DateTimeParseException) {
        }

        legacyTimestampPatterns.forEach { pattern ->
            try {
                return LocalDateTime.parse(value, DateTimeFormatter.ofPattern(pattern, Locale.US)).atZone(localZone)
            } catch (_: DateTimeParseException) {
            }

            try {
                val parser = SimpleDateFormat(pattern, Locale.US).apply {
                    timeZone = TimeZone.getDefault()
                    isLenient = false
                }
                val date = parser.parse(value)
                if (date != null) {
                    return date.toInstant().atZone(localZone)
                }
            } catch (_: Exception) {
            }
        }

        return null
    }

    private fun parseApiDate(rawValue: String): ZonedDateTime? {
        parseApiTimestamp(rawValue)?.let { return it }

        val value = rawValue.trim()
        legacyDatePatterns.forEach { pattern ->
            try {
                return LocalDate.parse(value, DateTimeFormatter.ofPattern(pattern, Locale.US))
                    .atStartOfDay(localZone)
            } catch (_: DateTimeParseException) {
            }
        }

        return null
    }

    override fun getItemCount() = items.size
}
