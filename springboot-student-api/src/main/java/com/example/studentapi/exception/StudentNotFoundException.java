package com.example.studentapi.exception;

public class StudentNotFoundException extends RuntimeException {
    public StudentNotFoundException(Long id) {
        super("Requested student with ID " + id + " does not exist.");
    }
}
