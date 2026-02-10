import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from '@/pages/RoleSelection';
import ParentLogin from '@/pages/parent/Login';
import ParentRegister from '@/pages/parent/Register';
import ParentDashboard from '@/pages/parent/Dashboard';
import WordManagement from '@/pages/parent/Words';
import ChildHome from '@/pages/child/Home';
import Flashcard from '@/pages/child/Flashcard';
import ProtectedRoute from '@/components/ProtectedRoute';
import './i18n';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<ParentLogin />} />
          <Route path="/register" element={<ParentRegister />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <RoleSelection />
            </ProtectedRoute>
          } />
          
          <Route path="/parent/dashboard" element={
            <ProtectedRoute>
              <ParentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/parent/words" element={
            <ProtectedRoute>
              <WordManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/child" element={
            <ProtectedRoute>
              <ChildHome />
            </ProtectedRoute>
          } />
          <Route path="/child/flashcard" element={
            <ProtectedRoute>
              <Flashcard />
            </ProtectedRoute>
          } />

          {/* Catch all - Redirect to Home (which is guarded) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
