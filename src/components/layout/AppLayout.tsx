import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Ticket, FileText, Settings, LogOut, BarChart3, PlusCircle } from 'lucide-react';

export default function AppLayout() {
  const { profile, logout } = useAuth();

  const isAdmin = profile?.role === 'Admin' || profile?.role === 'Management';
  const isLeader = profile?.role === 'Team Leader' || isAdmin;
  const isSales = profile?.role === 'Sales';

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <div className="bg-white/95 rounded-lg p-3 border border-slate-700/50 shadow-sm">
            <img 
              src="https://voltransvn.com/wp-content/uploads/2023/02/logo-full-1.png" 
              alt="Voltrans Logistics" 
              className="w-full max-w-[160px] h-auto object-contain mx-auto"
            />
          </div>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest text-center">Inland Ticketing Platform</p>
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 space-y-1">
          <div className="px-4 mb-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-4">Main Menu</div>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center px-6 py-3 transition-colors ${
                isActive ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5 mr-3 opacity-70" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/tickets"
            end
            className={({ isActive }) =>
              `flex items-center px-6 py-3 transition-colors ${
                isActive ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            <Ticket className="w-5 h-5 mr-3 opacity-70" />
            <span>Tickets</span>
          </NavLink>

          {(isSales || isAdmin || isLeader) && (
            <NavLink
              to="/tickets/new"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 transition-colors ${
                  isActive ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <PlusCircle className="w-5 h-5 mr-3 opacity-70" />
              <span>Create Ticket</span>
            </NavLink>
          )}

          {(isAdmin || isLeader) && (
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center px-6 py-3 transition-colors ${
                  isActive ? 'bg-slate-800 text-white border-l-4 border-blue-500' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <BarChart3 className="w-5 h-5 mr-3 opacity-70" />
              <span>Reports</span>
            </NavLink>
          )}
        </nav>

        <div className="p-4 bg-slate-950 flex items-center gap-3 text-white border-t border-slate-800">
          <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
            {profile?.displayName?.trim()?.charAt(0)?.toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-medium truncate">{profile?.displayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{profile?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-1 px-2 text-slate-400 hover:text-white transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 justify-between">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
             <button className="p-1.5 hover:bg-slate-100 rounded-full relative">
               <span className="w-2 h-2 bg-red-500 border-2 border-white rounded-full absolute top-1 right-1"></span>
               🔔
             </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 lg:p-8 bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
