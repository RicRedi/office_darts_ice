import { useMemo, useState } from 'react';
import Avatar from './Avatar.jsx';

/**
 * Autocomplete player picker shared by GameForm, Admin player management and
 * the head-to-head selector. `players` should already be filtered to the
 * desired pool (e.g. non-archived) by the caller.
 */
export default function PlayerSearchSelect({
  players,
  value,
  onChange,
  placeholder = 'Hledat hráče…',
  excludeIds = [],
  onCreateRegular = null,
  onCreateGuest = null,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [players, query, excludeIds]);

  const selectedPlayer = players.find((p) => p.id === value);

  if (selectedPlayer) {
    return (
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
        <Avatar player={selectedPlayer} size="sm" />
        <span className="flex-1 truncate">{selectedPlayer.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-400 text-sm px-1"
          aria-label="Zrušit výběr hráče"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2"
      />
      {open && (filtered.length > 0 || (query.trim() && (onCreateRegular || onCreateGuest))) && (
        <ul className="absolute z-10 bg-white border rounded-lg mt-1 w-full shadow-lg max-h-56 overflow-auto">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(p.id);
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
              >
                <Avatar player={p} size="sm" />
                <span>{p.name}</span>
              </button>
            </li>
          ))}
          {query.trim() && onCreateRegular && (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onCreateRegular(query.trim());
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full px-3 py-2 hover:bg-gray-50 text-left text-purple-700 text-sm"
              >
                + Nový kolega „{query.trim()}“
              </button>
            </li>
          )}
          {query.trim() && onCreateGuest && (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onCreateGuest(query.trim());
                  setQuery('');
                  setOpen(false);
                }}
                className="w-full px-3 py-2 hover:bg-gray-50 text-left text-gray-500 text-sm"
              >
                + Přidat jako hosta „{query.trim()}“
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
