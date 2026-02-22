import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Words from './pages/Words';
import Media from './pages/Media';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="words" element={<Words />} />
          <Route path="media/:type" element={<Media />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
