import { Routes, Route } from 'react-router-dom';
import { FirebaseProvider } from './context/FirebaseContext.jsx';
import PinGate from './components/Auth/PinGate.jsx';
import AdminLogin from './components/Auth/AdminLogin.jsx';
import Layout from './components/Common/Layout.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import History from './components/History/History.jsx';
import PlayerProfile from './components/PlayerProfile/PlayerProfile.jsx';
import AdminPage from './components/Admin/AdminPage.jsx';

export default function App() {
  return (
    <FirebaseProvider>
      <PinGate>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </PinGate>
    </FirebaseProvider>
  );
}
