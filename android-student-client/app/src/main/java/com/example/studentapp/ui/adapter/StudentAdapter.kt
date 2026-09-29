package com.example.studentapp.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.studentapp.data.model.Student
import com.example.studentapp.databinding.ItemStudentBinding

class StudentAdapter(
    private var students: List<Student> = emptyList()
) : RecyclerView.Adapter<StudentAdapter.StudentViewHolder>() {

    fun updateData(newStudents: List<Student>) {
        this.students = newStudents
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StudentViewHolder {
        val binding = ItemStudentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return StudentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: StudentViewHolder, position: Int) {
        holder.bind(students[position])
    }

    override fun getItemCount(): Int = students.size

    class StudentViewHolder(private val binding: ItemStudentBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(student: Student) {
            binding.tvStudentName.text = student.name
            binding.tvStudentEmail.text = student.email
            binding.tvStudentCourse.text = student.course
            binding.tvStudentSemester.text = "Sem ${student.semester}"
            
            // Set initials for avatar
            val initials = student.name.trim().split(" ")
                .mapNotNull { it.firstOrNull()?.uppercase() }
                .take(2)
                .joinToString("")
            binding.tvAvatar.text = if (initials.isNotEmpty()) initials else "S"
        }
    }
}
