import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { DataSync } from './pages/DataSync';
import { Dealers } from './pages/Dealers';
import { Map } from './pages/Map';
import { DealerDetail } from './pages/DealerDetail';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dealers" element={<Dealers />} />
          <Route path="dealers/:id" element={<DealerDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="map" element={<Map />} />
          <Route path="sync" element={<DataSync />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
