import { useEffect, useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext.jsx';

const PIN = import.meta.env.VITE_APP_PIN || '1234';
const STORAGE_KEY = 'dartstats_pin_ok';

export default function PinGate({ children }) {
  const { signInAnon, user } = useFirebase();
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (unlocked) {
      signInAnon().catch(() => {});
    }
    // signInAnon identity is stable for the lifetime of the app; only re-run on unlock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  function handleSubmit(e) {
    e.preventDefault();
    if (input === PIN) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setUnlocked(true);
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 400);
    }
  }

  if (unlocked) {
    // Wait for the anonymous sign-in to actually resolve before mounting the
    // rest of the app — otherwise the first database reads race ahead of
    // auth and can get permission-denied before Firebase retries them.
    if (!user) {
      return (
        <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Připojuji…</div>
      );
    }
    return children;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <h1 className="text-3xl font-semibold">🎯 DartStats</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`text-3xl tracking-[0.5em] text-center w-40 border-2 rounded-lg py-2 outline-none ${
            shake ? 'border-red-500 animate-shake' : 'border-gray-300 focus:border-purple-500'
          }`}
        />
        {shake && <p className="text-red-500 text-sm">Špatný PIN, zkuste to znovu</p>}
        <button type="submit" className="px-6 py-2 rounded-lg bg-purple-600 text-white font-medium">
          Vstoupit
        </button>
      </form>
    </div>
  );
}
