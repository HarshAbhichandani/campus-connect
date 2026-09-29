package com.example.studentapp.ui

import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.studentapp.data.model.ErrorResponse
import com.example.studentapp.data.model.Student
import com.example.studentapp.data.network.ApiClient
import com.example.studentapp.databinding.ActivityAddStudentBinding
import com.google.gson.Gson
import kotlinx.coroutines.launch

class AddStudentActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAddStudentBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAddStudentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Add Student"

        binding.btnSubmit.setOnClickListener {
            submitStudentForm()
        }
    }

    private fun submitStudentForm() {
        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val course = binding.etCourse.text.toString().trim()
        val semesterStr = binding.etSemester.text.toString().trim()

        // Pre-validation
        if (name.isEmpty()) {
            binding.etName.error = "Name is required"
            return
        }

        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            binding.etEmail.error = "Valid email is required"
            return
        }

        if (course.isEmpty()) {
            binding.etCourse.error = "Course is required"
            return
        }

        val semester = semesterStr.toIntOrNull()
        if (semester == null || semester <= 0) {
            binding.etSemester.error = "Semester must be a positive integer"
            return
        }

        val newStudent = Student(
            name = name,
            email = email,
            course = course,
            semester = semester
        )

        binding.progressBar.visibility = View.VISIBLE
        binding.btnSubmit.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.createStudent(newStudent)
                binding.progressBar.visibility = View.GONE
                binding.btnSubmit.isEnabled = true

                if (response.isSuccessful) {
                    Toast.makeText(
                        this@AddStudentActivity,
                        "Student added successfully! (201 Created)",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                } else {
                    val errorJson = response.errorBody()?.string()
                    val errorMessage = parseErrorMessage(errorJson, response.code())
                    Toast.makeText(
                        this@AddStudentActivity,
                        "Error ${response.code()}: $errorMessage",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: Exception) {
                binding.progressBar.visibility = View.GONE
                binding.btnSubmit.isEnabled = true
                Toast.makeText(
                    this@AddStudentActivity,
                    "Network error: Unable to reach REST API server.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun parseErrorMessage(errorJson: String?, statusCode: Int): String {
        if (errorJson.isNull_or_Empty()) {
            return when (statusCode) {
                400 -> "Validation error (400 Bad Request)"
                404 -> "Endpoint not found (404)"
                else -> "Server error ($statusCode)"
            }
        }
        return try {
            val errorResponse = Gson().fromJson(errorJson, ErrorResponse::class.java)
            if (!errorResponse.errors.isNullOrEmpty()) {
                errorResponse.errors.joinToString("\n")
            } else {
                errorResponse.message
            }
        } catch (e: Exception) {
            "Validation failed ($statusCode)"
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}

// Extension helper
private fun String?.isNull_or_Empty(): Boolean = this == null || this.trim().isEmpty()
