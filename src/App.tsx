import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from '@/pages/RoleSelection';
import ParentLogin from '@/pages/parent/Login';
import ParentRegister from '@/pages/parent/Register';
import ParentDashboard from '@/pages/parent/Dashboard';
import WordManagement from '@/pages/parent/Words';
import ChildHome from '@/pages/child/Home';
import Flashcard from '@/pages/child/Flashcard';
import './i18n';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent/register" element={<ParentRegister />} />
          <Route path="/parent/dashboard" element={<ParentDashboard />} />
          <Route path="/parent/words" element={<WordManagement />} />
          <Route path="/child" element={<ChildHome />} />
          <Route path="/child/flashcard" element={<Flashcard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
