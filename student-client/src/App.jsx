import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Plus, Search, RefreshCw, Server, Database } from 'lucide-react';
import { API_BASE_URL } from './config';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import NotificationToast from './components/NotificationToast';

export default function App() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/students`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Unable to load data. Please ensure the Express REST API is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAddModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleFormSuccess = (successMsg) => {
    addToast(successMsg, 'success');
    fetchStudents();
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to delete student "${student.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/students/${student.id}`, {
        method: 'DELETE'
      });

      if (response.status === 204 || response.ok) {
        addToast(`Student "${student.name}" deleted successfully!`, 'success');
        fetchStudents();
      } else if (response.status === 404) {
        addToast(`Student not found (404).`, 'error');
        fetchStudents();
      } else {
        const data = await response.json();
        addToast(data.message || 'Failed to delete student.', 'error');
      }
    } catch (err) {
      console.error('Delete request error:', err);
      addToast('Network error while deleting student.', 'error');
    }
  };

  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q) ||
      student.course?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="brand-title">Student Management Portal</h1>
            <p className="brand-subtitle">
              Web Services & SOA — Lab 4 Full-Stack REST API & MongoDB Atlas
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={handleOpenAddModal}>
          <Plus size={20} /> Add Student
        </button>
      </header>

      {/* Control Bar: Search & Status */}
      <div className="controls-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge-count">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
          </span>

          <button
            className="btn-secondary"
            onClick={fetchStudents}
            title="Refresh List"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Student List Table */}
      <StudentList
        students={filteredStudents}
        isLoading={isLoading}
        error={error}
        onRetry={fetchStudents}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteStudent}
      />

      {/* Modal Form for Add / Edit */}
      {isModalOpen && (
        <StudentForm
          student={selectedStudent}
          onClose={handleCloseModal}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Toast Notifications */}
      <NotificationToast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
