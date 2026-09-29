package com.example.studentapi.model;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Student entity representation")
public class Student {

    @Schema(description = "Unique Student ID", example = "1")
    private Long id;

    @NotBlank(message = "Name is required and cannot be empty.")
    @Schema(description = "Full name of student", example = "Aarav Patel")
    private String name;

    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be a valid email address.")
    @Schema(description = "Valid email address", example = "aarav@example.com")
    private String email;

    @NotBlank(message = "Course is required and cannot be empty.")
    @Schema(description = "Enrolled course", example = "Computer Science")
    private String course;

    @NotNull(message = "Semester is required.")
    @Min(value = 1, message = "Semester must be a positive integer (at least 1).")
    @Max(value = 12, message = "Semester cannot exceed 12.")
    @Schema(description = "Current semester", example = "5")
    private Integer semester;

    public Student() {
    }

    public Student(Long id, String name, String email, String course, Integer semester) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.course = course;
        this.semester = semester;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public Integer getSemester() {
        return semester;
    }

    public void setSemester(Integer semester) {
        this.semester = semester;
    }
}
