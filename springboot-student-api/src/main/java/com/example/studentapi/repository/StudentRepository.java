package com.example.studentapi.repository;

import com.example.studentapi.model.Student;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class StudentRepository {

    private final ConcurrentHashMap<Long, Student> store = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    public StudentRepository() {
        // Pre-populate with sample data
        save(new Student(null, "Aarav Patel", "aarav@example.com", "Computer Science", 5));
        save(new Student(null, "Priya Sharma", "priya@example.com", "Information Technology", 3));
        save(new Student(null, "Rohan Verma", "rohan@example.com", "Software Engineering", 4));
    }

    public List<Student> findAll() {
        return new ArrayList<>(store.values());
    }

    public Optional<Student> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public Student save(Student student) {
        if (student.getId() == null) {
            student.setId(idGenerator.getAndIncrement());
        }
        store.put(student.getId(), student);
        return student;
    }

    public boolean deleteById(Long id) {
        return store.remove(id) != null;
    }

    public boolean existsById(Long id) {
        return store.containsKey(id);
    }
}
