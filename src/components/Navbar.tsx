import React from 'react';
import { Smartphone, MonitorPlay } from 'lucide-react';

export type ActiveTab = 'lecturer' | 'student' | 'admin' | 'tests' | 'dualsim';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeSessionTopic?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onSelectTab('lecturer')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90"
        >
          <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center text-sm font-black">
            A
          </span>
          AttendPulse
        </button>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('lecturer')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 py-1 border-b-2 ${
              activeTab === 'lecturer'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-600'
            }`}
          >
            Lecturer Console
          </button>
          <button
            onClick={() => onSelectTab('student')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 py-1 border-b-2 ${
              activeTab === 'student'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-600'
            }`}
          >
            Student Mobile
          </button>
          <button
            onClick={() => onSelectTab('admin')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 py-1 border-b-2 ${
              activeTab === 'admin'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-600'
            }`}
          >
            Admin & Audit
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 py-1 border-b-2 ${
              activeTab === 'tests'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-600'
            }`}
          >
            19-Attack Lab
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dualsim')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'dualsim'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            Dual Simulator
          </button>
        </div>
      </div>

      {/* Mobile nav fallback */}
      <div className="flex md:hidden items-center justify-around px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-600">
        <button
          onClick={() => onSelectTab('lecturer')}
          className={`py-1 ${activeTab === 'lecturer' ? 'text-slate-900 font-bold' : ''}`}
        >
          Lecturer
        </button>
        <button
          onClick={() => onSelectTab('student')}
          className={`py-1 flex items-center gap-1 ${activeTab === 'student' ? 'text-slate-900 font-bold' : ''}`}
        >
          <Smartphone className="w-3 h-3" /> Student
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`py-1 ${activeTab === 'admin' ? 'text-slate-900 font-bold' : ''}`}
        >
          Admin
        </button>
        <button
          onClick={() => onSelectTab('tests')}
          className={`py-1 ${activeTab === 'tests' ? 'text-slate-900 font-bold' : ''}`}
        >
          Test Lab
        </button>
      </div>
    </header>
  );
};
