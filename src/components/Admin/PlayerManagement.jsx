import { useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { usePlayers, toEntries } from '../../hooks/useFirebaseData.js';
import { renamePlayer, setPlayerArchived } from '../../services/playersService.js';

export default function PlayerManagement() {
  const { db } = useFirebase();
  const { data } = usePlayers();
  const players = toEntries(data);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = players.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = players.find((p) => p.id === selectedId);

  function selectPlayer(p) {
    setSelectedId(p.id);
    setRenaming(false);
    setNewName(p.name);
  }

  async function handleRename() {
    if (!newName.trim()) return;
    await renamePlayer(db, selectedId, newName.trim());
    setRenaming(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Hledat hráče podle jména…"
        className="border rounded-lg px-3 py-2"
      />
      <div className="border rounded-2xl divide-y">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPlayer(p)}
            className={`w-full text-left px-4 py-2 text-sm ${selectedId === p.id ? 'bg-purple-50' : ''}`}
          >
            {p.name} {p.is_archived && <span className="text-xs text-gray-400">(archivovaný)</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm px-4 py-2">Žádný hráč neodpovídá hledání.</p>}
      </div>

      {selected && (
        <div className="border rounded-2xl p-4 flex flex-col gap-3">
          {renaming ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border rounded-lg px-3 py-2 flex-1"
              />
              <button type="button" onClick={handleRename} className="bg-purple-600 text-white rounded-lg px-3">
                Uložit
              </button>
              <button type="button" onClick={() => setRenaming(false)} className="text-gray-400 px-2">
                Zrušit
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="text-sm text-purple-700 border border-purple-300 rounded-lg px-3 py-1.5"
              >
                Přejmenovat
              </button>
              <button
                type="button"
                onClick={() => setPlayerArchived(db, selected.id, !selected.is_archived)}
                className="text-sm text-red-500 border border-red-300 rounded-lg px-3 py-1.5"
              >
                {selected.is_archived ? 'Obnovit' : 'Archivovat'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
