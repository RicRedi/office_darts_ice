import GameForm from '../GameForm/index.jsx';
import Leaderboard from './Leaderboard.jsx';
import MatchOfTheMonth from './MatchOfTheMonth.jsx';
import WeeklyRecap from './WeeklyRecap.jsx';
import { usePlayers, useMatches, toEntries } from '../../hooks/useFirebaseData.js';

export default function Dashboard() {
  const { data: playersData } = usePlayers();
  const { data: matchesData } = useMatches();
  const players = toEntries(playersData);

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
      <GameForm />
      <div className="grid md:grid-cols-2 gap-4">
        <MatchOfTheMonth matches={matchesData} players={playersData} />
        <WeeklyRecap matches={matchesData} players={playersData} />
      </div>
      <Leaderboard players={players} matches={matchesData} />
    </div>
  );
}
