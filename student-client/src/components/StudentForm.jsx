import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function StudentForm({ student, onClose, onSuccess }) {
  const isEditMode = Boolean(student && student.id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    semester: 1
  });

  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        course: student.course || '',
        semester: student.semester || 1
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'semester' ? value : value
    }));
    // Clear error for edited field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerErrors([]);
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email format (e.g. user@example.com).';
    }

    if (!formData.course.trim()) {
      newErrors.course = 'Course name is required.';
    }

    const semNum = parseInt(formData.semester, 10);
    if (isNaN(semNum) || semNum <= 0) {
      newErrors.semester = 'Semester must be a positive integer greater than 0.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerErrors([]);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      course: formData.course.trim(),
      semester: parseInt(formData.semester, 10)
    };

    const url = isEditMode
      ? `${API_BASE_URL}/students/${student.id}`
      : `${API_BASE_URL}/students`;

    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(
          isEditMode
            ? `Student "${data.name}" updated successfully!`
            : `Student "${data.name}" added successfully!`
        );
        onClose();
      } else if (response.status === 400) {
        // Validation error from API
        if (data.errors && Array.isArray(data.errors)) {
          setServerErrors(data.errors);
        } else {
          setServerErrors([data.message || 'Invalid input data. Please check your form.']);
        }
      } else if (response.status === 404) {
        setServerErrors(['Student record not found on the server.']);
      } else {
        setServerErrors([data.message || 'An unexpected error occurred. Please try again.']);
      }
    } catch (err) {
      console.error('API submission error:', err);
      setServerErrors(['Unable to reach server. Please check backend API connection.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isEditMode ? <Save size={22} className="text-indigo-400" /> : <UserPlus size={22} className="text-indigo-400" />}
            <h3>{isEditMode ? 'Edit Student Details' : 'Add New Student'}</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {serverErrors.length > 0 && (
              <div className="alert-danger-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <AlertCircle size={18} />
                  <span>Validation Error (400 Bad Request)</span>
                </div>
                <ul>
                  {serverErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Aarav Patel"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. aarav@example.com"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              />
              {errors.email && <div className="error-text">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="course">Course / Department *</label>
              <input
                id="course"
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
                className={`form-control ${errors.course ? 'is-invalid' : ''}`}
              />
              {errors.course && <div className="error-text">{errors.course}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="semester">Current Semester *</label>
              <input
                id="semester"
                type="number"
                name="semester"
                min="1"
                max="12"
                value={formData.semester}
                onChange={handleChange}
                className={`form-control ${errors.semester ? 'is-invalid' : ''}`}
              />
              {errors.semester && <div className="error-text">{errors.semester}</div>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                'Saving...'
              ) : isEditMode ? (
                <>
                  <Save size={18} /> Update Student
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
