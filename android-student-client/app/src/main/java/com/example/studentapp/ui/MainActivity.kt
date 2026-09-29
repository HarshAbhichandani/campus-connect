package com.example.studentapp.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.studentapp.data.network.ApiClient
import com.example.studentapp.databinding.ActivityMainBinding
import com.example.studentapp.ui.adapter.StudentAdapter
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val studentAdapter = StudentAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()

        binding.swipeRefresh.setOnRefreshListener {
            loadStudents()
        }

        binding.fabAddStudent.setOnClickListener {
            val intent = Intent(this, AddStudentActivity::class.java)
            startActivity(intent)
        }

        loadStudents()
    }

    override fun onResume() {
        super.onResume()
        loadStudents()
    }

    private fun setupRecyclerView() {
        binding.recyclerViewStudents.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = studentAdapter
        }
    }

    private fun loadStudents() {
        binding.swipeRefresh.isRefreshing = true
        binding.tvError.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getStudents()
                binding.swipeRefresh.isRefreshing = false

                if (response.isSuccessful) {
                    val students = response.body() ?: emptyList()
                    studentAdapter.updateData(students)
                    
                    if (students.isEmpty()) {
                        binding.tvError.text = "No students found in database."
                        binding.tvError.visibility = View.VISIBLE
                    }
                } else {
                    val errorMsg = when (response.code()) {
                        404 -> "Students endpoint not found (404)"
                        400 -> "Bad Request (400)"
                        else -> "Server error (${response.code()})"
                    }
                    Toast.makeText(this@MainActivity, errorMsg, Toast.LENGTH_LONG).show()
                    binding.tvError.text = errorMsg
                    binding.tvError.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                binding.swipeRefresh.isRefreshing = false
                val errorMsg = "Unable to connect to server at 10.0.2.2:3000. Is Express API running?"
                Toast.makeText(this@MainActivity, errorMsg, Toast.LENGTH_LONG).show()
                binding.tvError.text = errorMsg
                binding.tvError.visibility = View.VISIBLE
            }
        }
    }
}
