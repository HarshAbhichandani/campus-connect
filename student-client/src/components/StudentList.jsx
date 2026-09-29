import React from 'react';
import { Edit2, Trash2, GraduationCap, AlertCircle, RefreshCw } from 'lucide-react';

export default function StudentList({
  students,
  isLoading,
  error,
  onRetry,
  onEdit,
  onDelete
}) {
  if (isLoading) {
    return (
      <div className="table-card">
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading student records from database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Unable to load student data</h3>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
        <button onClick={onRetry} className="btn-secondary">
          <RefreshCw size={18} /> Retry Connection
        </button>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="table-card">
        <div className="empty-state">
          <GraduationCap size={54} style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3>No Student Records Found</h3>
          <p style={{ marginTop: '0.4rem' }}>Click "Add Student" to create your first student document in MongoDB.</p>
        </div>
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="table-card">
      <table className="students-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Course</th>
            <th>Semester</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td>
                <div className="student-name-cell">
                  <div className="avatar-circle">{getInitials(student.name)}</div>
                  <div>
                    <div>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      ID: {student.id}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ color: '#cbd5e1' }}>{student.email}</td>
              <td>
                <span className="course-badge">{student.course}</span>
              </td>
              <td>
                <span className="semester-pill">Sem {student.semester}</span>
              </td>
              <td>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    className="btn-icon-edit"
                    onClick={() => onEdit(student)}
                    title="Edit Student"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => onDelete(student)}
                    title="Delete Student"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
