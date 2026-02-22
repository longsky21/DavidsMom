import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from '@/pages/RoleSelection';
import ParentLogin from '@/pages/parent/Login';
import ParentRegister from '@/pages/parent/Register';
import ParentDashboard from '@/pages/parent/Dashboard';
import ParentSettings from '@/pages/parent/Settings';
import ParentReport from '@/pages/parent/Report';
import ParentProfile from '@/pages/parent/Profile';
import WordManagement from '@/pages/parent/Words';
import ParentMedia from '@/pages/parent/Media';
import ChildHome from '@/pages/child/Home';
import ChildFlashcard from '@/pages/child/Flashcard';
import ChildVideos from '@/pages/child/Videos';
import ChildVideosPlayer from '@/pages/child/VideosPlayer';
import ChildListening from '@/pages/child/Listening';
import WebPlayer from '../player/frontend/WebPlayer'; // Update import path to use the new independent WebPlayer
import ProtectedRoute from '@/components/ProtectedRoute';
import AxiosInterceptor from '@/components/AxiosInterceptor';
import './i18n';
import './index.css';

function App() {
  return (
    <Router>
      <AxiosInterceptor />
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
          <Route path="/parent/settings" element={
            <ProtectedRoute>
              <ParentSettings />
            </ProtectedRoute>
          } />
          <Route path="/parent/report" element={
            <ProtectedRoute>
              <ParentReport />
            </ProtectedRoute>
          } />
          <Route path="/parent/profile" element={
            <ProtectedRoute>
              <ParentProfile />
            </ProtectedRoute>
          } />
          <Route path="/parent/media" element={
            <ProtectedRoute>
              <ParentMedia />
            </ProtectedRoute>
          } />
          
          <Route path="/child" element={
            <ProtectedRoute>
              <ChildHome />
            </ProtectedRoute>
          } />
          <Route path="/child/flashcard" element={
            <ProtectedRoute>
              <ChildFlashcard />
            </ProtectedRoute>
          } />
          <Route path="/child/videos" element={
            <ProtectedRoute>
              <ChildVideos />
            </ProtectedRoute>
          } />
          <Route path="/child/videos-player" element={
            <ProtectedRoute>
              <ChildVideosPlayer />
            </ProtectedRoute>
          } />
          <Route path="/child/listening" element={
            <ProtectedRoute>
              <ChildListening />
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
