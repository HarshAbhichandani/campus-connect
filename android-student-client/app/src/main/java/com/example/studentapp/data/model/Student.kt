package com.example.studentapp.data.model

import com.google.gson.annotations.SerializedName

data class Student(
    @SerializedName("id") val id: String? = null,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("course") val course: String,
    @SerializedName("semester") val semester: Int
)

data class ErrorResponse(
    @SerializedName("status") val status: Int,
    @SerializedName("error") val error: String,
    @SerializedName("message") val message: String,
    @SerializedName("errors") val errors: List<String>? = null
)
