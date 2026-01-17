import React from 'react';
import { Link } from 'react-router-dom';
import { ClassLevel, Chapter } from '../types';
import { SUBJECTS, CHAPTERS } from '../constants';
import { UserProgress } from '../services/storage';
import { ArrowRight, Trophy, BookCheck, TrendingUp } from 'lucide-react';

interface HomeProps {
  selectedClass: ClassLevel;
  userProgress: UserProgress;
}

const Home: React.FC<HomeProps> = ({ selectedClass, userProgress }) => {
  const getTotalChapters = () => {
    let total = 0;
    Object.values(CHAPTERS[selectedClass]).forEach((chapters: Chapter[]) => total += chapters.length);
    return total;
  };

  // Calculate stats for current class only
  const totalClassChapters = getTotalChapters();
  const completedInClass = userProgress.completedChapters.filter(id => id.startsWith(`${selectedClass}-`)).length;
  const progressPercentage = totalClassChapters > 0 ? Math.round((completedInClass / totalClassChapters) * 100) : 0;
  
  // Recent quizzes in this class
  const quizzesTaken = Object.entries(userProgress.quizScores)
    .filter(([key]) => key.startsWith(`${selectedClass}-`)).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-teal-900 dark:text-teal-100">Welcome, Student!</h1>
        <p className="text-teal-600 dark:text-teal-400 mt-2">Here is your progress for Class {selectedClass} Commerce.</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-teal-100 dark:border-slate-800 p-6 flex items-center space-x-4 transition-colors">
          <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400">
            <BookCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-teal-500 dark:text-teal-400 font-medium">Chapters Completed</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{completedInClass} / {totalClassChapters}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-teal-100 dark:border-slate-800 p-6 flex items-center space-x-4 transition-colors">
          <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-teal-500 dark:text-teal-400 font-medium">Quizzes Taken</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{quizzesTaken}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-teal-100 dark:border-slate-800 p-6 flex items-center space-x-4 transition-colors">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-teal-500 dark:text-teal-400 font-medium">Overall Progress</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{progressPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div>
        <h2 className="text-xl font-bold text-teal-900 dark:text-teal-100 mb-4">Your Subjects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBJECTS.map((subject) => {
            const subjectChapters = CHAPTERS[selectedClass][subject.id] || [];
            const subjectCompletedCount = subjectChapters.filter(ch => 
              userProgress.completedChapters.includes(`${selectedClass}-${subject.id}-${ch.id}`)
            ).length;
            const subProgress = subjectChapters.length > 0 ? (subjectCompletedCount / subjectChapters.length) * 100 : 0;

            return (
              <Link 
                key={subject.id} 
                to={`/subject/${subject.id}`}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className={`h-2 ${subject.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                      {subject.name}
                    </h3>
                  </div>
                  
                  <div className="mb-4">
                     <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(subProgress)}%</span>
                     </div>
                     <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                        <div 
                          className="bg-teal-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${subProgress}%` }}
                        ></div>
                     </div>
                  </div>

                  <div className="flex items-center text-sm text-teal-600 dark:text-teal-400 font-medium group-hover:translate-x-1 transition-transform">
                    <span>View Chapters</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;