import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import SubjectDetail from './views/SubjectDetail';
import ChapterLearn from './views/ChapterLearn';
import Quiz from './views/Quiz';
import Glossary from './views/Glossary';
import { ClassLevel, SubjectId } from './types';
import { loadProgress, UserProgress } from './services/storage';

export default function App() {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(12);
  const [userProgress, setUserProgress] = useState<UserProgress>({ completedChapters: [], quizScores: {} });
  
  // Theme State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Load progress on mount
  useEffect(() => {
    const saved = loadProgress();
    if (saved) {
      setUserProgress(saved);
    }
  }, []);

  const refreshProgress = () => {
    const saved = loadProgress();
    if (saved) {
      setUserProgress(saved);
    }
  };

  return (
    <HashRouter>
      <Layout 
        selectedClass={selectedClass} 
        onClassChange={setSelectedClass}
        userProgress={userProgress}
        isDark={isDark}
        toggleTheme={toggleTheme}
      >
        <Routes>
          <Route path="/" element={<Home selectedClass={selectedClass} userProgress={userProgress} />} />
          <Route path="/subject/:subjectId" element={<SubjectDetail selectedClass={selectedClass} />} />
          <Route path="/learn/:subjectId/:chapterId" element={<ChapterLearn selectedClass={selectedClass} onProgressUpdate={refreshProgress} />} />
          <Route path="/quiz/:subjectId/:chapterId" element={<Quiz selectedClass={selectedClass} onProgressUpdate={refreshProgress} />} />
          <Route path="/glossary" element={<Glossary selectedClass={selectedClass} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}