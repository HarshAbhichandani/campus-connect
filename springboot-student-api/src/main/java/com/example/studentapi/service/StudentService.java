package com.example.studentapi.service;

import com.example.studentapi.exception.StudentNotFoundException;
import com.example.studentapi.model.Student;
import com.example.studentapi.repository.StudentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {

    private final StudentRepository studentRepository;

    public StudentService(StudentRepository studentRepository) {
        this.studentRepository = studentRepository;
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new StudentNotFoundException(id));
    }

    public Student createStudent(Student student) {
        student.setId(null); // Ensure repository auto-generates ID
        return studentRepository.save(student);
    }

    public Student updateStudent(Long id, Student updatedStudent) {
        if (!studentRepository.existsById(id)) {
            throw new StudentNotFoundException(id);
        }
        updatedStudent.setId(id);
        return studentRepository.save(updatedStudent);
    }

    public void deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) {
            throw new StudentNotFoundException(id);
        }
        studentRepository.deleteById(id);
    }
}
