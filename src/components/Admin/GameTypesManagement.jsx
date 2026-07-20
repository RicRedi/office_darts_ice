import { useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { useGameTypes, toEntries } from '../../hooks/useFirebaseData.js';
import { createGameType, updateGameType } from '../../services/gameTypesService.js';

export default function GameTypesManagement() {
  const { db } = useFirebase();
  const { data } = useGameTypes();
  const gameTypes = toEntries(data);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [supportsTraining, setSupportsTraining] = useState(true);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await createGameType(db, { name: name.trim(), category: category.trim(), supportsTraining });
    setName('');
    setCategory('');
    setSupportsTraining(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border rounded-2xl p-4 flex flex-col gap-2">
        {gameTypes.map((gt) => (
          <div key={gt.id} className="flex items-center justify-between text-sm border-b py-2 last:border-0">
            <span>
              {gt.name} <span className="text-gray-400">({gt.category})</span>
            </span>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={!!gt.supports_training}
                onChange={(e) => updateGameType(db, gt.id, { supports_training: e.target.checked })}
              />
              Umožnit trénink
            </label>
          </div>
        ))}
        {gameTypes.length === 0 && <p className="text-gray-400 text-sm">Zatím žádné typy her.</p>}
      </div>

      <form onSubmit={handleAdd} className="border rounded-2xl p-4 flex flex-col gap-3">
        <h3 className="font-medium">Nový typ hry</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Název (např. 701)"
          className="border rounded-lg px-3 py-2"
          required
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Kategorie (např. X01)"
          className="border rounded-lg px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={supportsTraining}
            onChange={(e) => setSupportsTraining(e.target.checked)}
          />
          Umožnit trénink
        </label>
        <button type="submit" className="bg-purple-600 text-white rounded-lg py-2 font-medium">
          Přidat typ hry
        </button>
      </form>
    </div>
  );
}
