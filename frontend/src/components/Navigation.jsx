import { LayoutDashboard, List, FolderInput, Settings } from 'lucide-react';
import { motion } from 'motion/react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history',   label: 'History',   icon: List },
  { id: 'data',      label: 'Data',      icon: FolderInput },
];

export default function Navigation({ view, setView, onOpenSettings }) {
  return (
    <>
      {/* ── Top brand bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-[#1A1A1A]/5 pt-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5A5A40] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">₹</span>
            </div>
            <h1 className="font-serif text-xl font-semibold text-[#1A1A1A] leading-none">
              Expense Tracker
            </h1>
          </div>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl border border-[#1A1A1A]/8 text-[#8A8A70] flex items-center justify-center hover:bg-[#5A5A40]/8 hover:text-[#5A5A40] transition-colors"
            aria-label="Settings"
          >
            <Settings size={17} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* ── Bottom tab bar ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#F5F5F0]/95 backdrop-blur-md border-t border-[#1A1A1A]/8 bottom-nav-safe">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="relative flex flex-col items-center gap-1 flex-1 py-2.5 transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute top-1 w-12 h-8 bg-[#5A5A40]/10 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  className="relative z-10 transition-colors"
                  style={{ color: active ? '#5A5A40' : '#8A8A70' }}
                  strokeWidth={active ? 2 : 1.6}
                />
                <span
                  className="relative z-10 text-[10px] font-medium tracking-wide"
                  style={{ color: active ? '#5A5A40' : '#8A8A70' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
