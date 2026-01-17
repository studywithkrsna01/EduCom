import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ClassLevel, SubjectId } from '../types';
import { SUBJECTS, CHAPTERS } from '../constants';
import { loadProgress } from '../services/storage';
import { CheckCircle2, Circle, PlayCircle, HelpCircle, ArrowLeft } from 'lucide-react';

interface SubjectDetailProps {
  selectedClass: ClassLevel;
}

const SubjectDetail: React.FC<SubjectDetailProps> = ({ selectedClass }) => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const progress = loadProgress();

  const subject = SUBJECTS.find(s => s.id === subjectId);
  
  if (!subject) {
    return <Navigate to="/" replace />;
  }

  const chapters = CHAPTERS[selectedClass][subject.id as SubjectId] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/" className="inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className={`rounded-2xl p-8 text-white shadow-lg ${subject.color.includes('blue') ? 'bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-700 dark:to-blue-900' : 
        subject.color.includes('purple') ? 'bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-700 dark:to-purple-900' :
        subject.color.includes('green') ? 'bg-gradient-to-r from-green-600 to-green-400 dark:from-green-700 dark:to-green-900' :
        subject.color.includes('orange') ? 'bg-gradient-to-r from-orange-600 to-orange-400 dark:from-orange-700 dark:to-orange-900' :
        'bg-gradient-to-r from-teal-600 to-teal-400 dark:from-teal-700 dark:to-teal-900'
      }`}>
        <h1 className="text-4xl font-bold mb-2">{subject.name}</h1>
        <p className="opacity-90 text-lg">Class {selectedClass}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Chapter Index</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Select a chapter to start learning or take a quiz.</p>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {chapters.map((chapter) => {
             const isCompleted = progress?.completedChapters.includes(`${selectedClass}-${subject.id}-${chapter.id}`);
             const quizScore = progress?.quizScores[`${selectedClass}-${subject.id}-${chapter.id}`];

             return (
              <div key={chapter.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        Chapter {chapter.number}
                      </span>
                      {isCompleted && (
                        <span className="flex items-center text-green-600 dark:text-green-400 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{chapter.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{chapter.description}</p>
                    
                    {quizScore && (
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Latest Quiz Score: <span className={quizScore.score >= quizScore.total * 0.7 ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}>
                                {quizScore.score}/{quizScore.total}
                            </span>
                        </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link 
                      to={`/learn/${subject.id}/${chapter.id}`}
                      className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Study
                    </Link>
                    <Link 
                      to={`/quiz/${subject.id}/${chapter.id}`}
                      className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Quiz
                    </Link>
                  </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectDetail;