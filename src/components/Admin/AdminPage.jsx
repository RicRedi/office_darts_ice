import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import GameTypesManagement from './GameTypesManagement.jsx';
import DeletionRequestsManagement from './DeletionRequestsManagement.jsx';
import PlayerManagement from './PlayerManagement.jsx';
import ExtendedHistory from './ExtendedHistory.jsx';

const TABS = [
  { id: 'game-types', label: 'Typy her' },
  { id: 'deletion-requests', label: 'Žádosti o smazání' },
  { id: 'history', label: 'Historie' },
  { id: 'players', label: 'Správa hráčů' },
];

export default function AdminPage() {
  const { isAdmin, authReady } = useFirebase();
  const [tab, setTab] = useState('game-types');

  if (!authReady) return null;
  if (!isAdmin) return <Navigate to="/admin-login" replace />;

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'game-types' && <GameTypesManagement />}
      {tab === 'deletion-requests' && <DeletionRequestsManagement />}
      {tab === 'history' && <ExtendedHistory />}
      {tab === 'players' && <PlayerManagement />}
    </div>
  );
}
