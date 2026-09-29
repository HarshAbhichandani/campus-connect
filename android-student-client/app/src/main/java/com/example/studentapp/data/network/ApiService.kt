package com.example.studentapp.data.network

import com.example.studentapp.data.model.Student
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {

    @GET("students")
    suspend fun getStudents(): Response<List<Student>>

    @POST("students")
    suspend fun createStudent(@Body student: Student): Response<Student>
}
