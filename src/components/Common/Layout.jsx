import { NavLink, Outlet } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext.jsx';

function navClass({ isActive }) {
  return `px-3 py-1.5 rounded-lg text-sm font-medium ${
    isActive ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;
}

export default function Layout() {
  const { isAdmin, adminLogout } = useFirebase();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center gap-2 px-4 py-3 border-b">
        <span className="font-semibold mr-2">🎯 DartStats</span>
        <NavLink to="/" end className={navClass}>
          Dashboard
        </NavLink>
        <NavLink to="/history" className={navClass}>
          Historie
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={navClass}>
            Admin
          </NavLink>
        )}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => adminLogout()}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Odhlásit admina
          </button>
        ) : (
          <NavLink to="/admin-login" className="ml-auto text-xs text-gray-400 hover:text-gray-600">
            Admin přihlášení
          </NavLink>
        )}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
