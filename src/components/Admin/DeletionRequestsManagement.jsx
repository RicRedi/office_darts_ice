import { useFirebase } from '../../context/FirebaseContext.jsx';
import { useDeletionRequests, useMatches, useGameTypes, toEntries } from '../../hooks/useFirebaseData.js';
import { approveDeletionRequest, rejectDeletionRequest } from '../../services/matchesService.js';
import { formatDate } from '../../utils/formatters.js';

export default function DeletionRequestsManagement() {
  const { db } = useFirebase();
  const { data } = useDeletionRequests();
  const { data: matchesData } = useMatches();
  const { data: gameTypesData } = useGameTypes();

  const pending = toEntries(data).filter((r) => r.status === 'pending');

  return (
    <div className="border rounded-2xl p-4 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Žádosti o smazání</h2>
      {pending.length === 0 && <p className="text-gray-400 text-sm">Žádné čekající žádosti.</p>}
      {pending.map((req) => {
        const match = matchesData[req.match_id];
        return (
          <div key={req.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm">
            <span>
              {match
                ? `${gameTypesData[match.game_type_id]?.name ?? ''} — ${formatDate(match.timestamp)}`
                : '(zápas již neexistuje)'}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => approveDeletionRequest(db, req)} className="text-red-500">
                Schválit smazání
              </button>
              <button type="button" onClick={() => rejectDeletionRequest(db, req.id)} className="text-gray-400">
                Zamítnout
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
