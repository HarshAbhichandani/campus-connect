import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function NotificationToast({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-400" />
          ) : (
            <AlertCircle size={20} className="text-red-400" />
          )}
          <span style={{ flex: 1, fontSize: '0.9rem' }}>{toast.message}</span>
          <button
            onClick={() => onClose(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
