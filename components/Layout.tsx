import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ClassLevel } from '../types';
import { SUBJECTS } from '../constants';
import { UserProgress } from '../services/storage';
import { 
  BookOpen, 
  GraduationCap, 
  LayoutDashboard, 
  Menu, 
  X, 
  BookA,
  Moon,
  Sun
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  selectedClass: ClassLevel;
  onClassChange: (c: ClassLevel) => void;
  userProgress: UserProgress;
  isDark: boolean;
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  selectedClass, 
  onClassChange, 
  userProgress,
  isDark,
  toggleTheme 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Calculate total progress
  const totalCompleted = userProgress.completedChapters.length;

  // Check if we are in learning mode to adjust layout constraints
  const isLearnMode = location.pathname.includes('/learn/');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 flex flex-col">
      
      {/* Universal Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-teal-800 dark:bg-slate-900 text-white z-40 flex items-center justify-between px-4 shadow-md transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar} 
            className="p-2 rounded-lg hover:bg-teal-700 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
            aria-label="Toggle Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2 select-none">
            <GraduationCap className="h-7 w-7 text-orange-400" />
            <span className="font-bold text-lg tracking-tight hidden sm:inline">GSEB Prep</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <span className="text-xs font-bold bg-teal-900 dark:bg-slate-800 px-3 py-1.5 rounded-full text-teal-200 border border-teal-700 dark:border-slate-700 shadow-sm">
             Class {selectedClass}
           </span>
           <button 
             onClick={toggleTheme} 
             className="p-2 text-teal-100 dark:text-slate-300 hover:bg-teal-700 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400"
             aria-label="Toggle Theme"
           >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
           </button>
        </div>
      </header>

      {/* Sidebar Drawer (Off-canvas) */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-teal-800 dark:bg-slate-900 text-white z-50 transform transition-transform duration-300 ease-in-out border-r border-teal-700 dark:border-slate-800 shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-teal-700 dark:border-slate-800 bg-teal-900/20">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-orange-400" />
              <span className="font-bold text-lg">Menu</span>
            </div>
            <button 
                onClick={closeSidebar} 
                className="p-2 text-teal-200 hover:text-white rounded-lg hover:bg-teal-700 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-teal-600 scrollbar-track-transparent">
            {/* Class Selector */}
            <div className="mb-6">
              <p className="text-xs font-bold text-teal-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Select Class</p>
              <div className="flex bg-teal-900 dark:bg-slate-950 rounded-lg p-1 border border-teal-700 dark:border-slate-800">
                <button
                  onClick={() => onClassChange(11)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    selectedClass === 11 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'text-teal-300 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-teal-700/50'
                  }`}
                >
                  Class 11
                </button>
                <button
                  onClick={() => onClassChange(12)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    selectedClass === 12 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'text-teal-300 dark:text-slate-400 hover:text-white dark:hover:text-slate-200 hover:bg-teal-700/50'
                  }`}
                >
                  Class 12
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              <NavLink 
                to="/" 
                onClick={closeSidebar}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                    ? 'bg-teal-700 dark:bg-slate-800 text-white shadow-sm font-medium' 
                    : 'text-teal-100 dark:text-slate-400 hover:bg-teal-700/50 dark:hover:bg-slate-800/50 hover:pl-5'
                  }`
                }
              >
                <LayoutDashboard className="h-5 w-5" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink 
                to="/glossary" 
                onClick={closeSidebar}
                className={({ isActive }) => 
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                    ? 'bg-teal-700 dark:bg-slate-800 text-white shadow-sm font-medium' 
                    : 'text-teal-100 dark:text-slate-400 hover:bg-teal-700/50 dark:hover:bg-slate-800/50 hover:pl-5'
                  }`
                }
              >
                <BookA className="h-5 w-5" />
                <span>Glossary</span>
              </NavLink>
              
              <div className="pt-6 pb-2 px-1 text-xs font-bold text-teal-400 dark:text-slate-500 uppercase tracking-wider border-t border-teal-700/50 dark:border-slate-800/50 mt-4">
                Subjects
              </div>
              {SUBJECTS.map((sub) => (
                <NavLink
                  key={sub.id}
                  to={`/subject/${sub.id}`}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                      ? 'bg-teal-700 dark:bg-slate-800 text-white shadow-sm font-medium' 
                      : 'text-teal-100 dark:text-slate-400 hover:bg-teal-700/50 dark:hover:bg-slate-800/50 hover:pl-5'
                    }`
                  }
                >
                  <BookOpen className="h-4 w-4 opacity-70" />
                  <span>{sub.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-teal-700 dark:border-slate-800 bg-teal-900/30 dark:bg-slate-900/30">
             <div className="flex items-center justify-between text-teal-200 dark:text-slate-400 text-sm">
                <span className="font-medium">Total Progress</span>
                <span className="text-orange-400 font-bold">{totalCompleted} Chapters</span>
              </div>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300 animate-in fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content Area */}
      <main 
        className={`flex-1 flex flex-col pt-16 transition-all duration-300 ${
            isLearnMode 
            ? 'w-full h-screen overflow-hidden' 
            : 'p-4 md:p-8 mt-4 max-w-7xl mx-auto w-full'
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;