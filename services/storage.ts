import { QuizResult } from '../types';

export interface UserProgress {
  completedChapters: string[]; // Format: "classId-subjectId-chapterId"
  quizScores: Record<string, QuizResult>; // Key: "classId-subjectId-chapterId"
}

const STORAGE_KEY = 'gseb_commerce_app_progress';
const CONTENT_CACHE_KEY = 'gseb_content_cache';

// --- Progress Management ---

export const saveProgress = (progress: UserProgress) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const loadProgress = (): UserProgress | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const markChapterComplete = (classId: number, subjectId: string, chapterId: string) => {
  const current = loadProgress() || { completedChapters: [], quizScores: {} };
  const key = `${classId}-${subjectId}-${chapterId}`;
  
  if (!current.completedChapters.includes(key)) {
    current.completedChapters.push(key);
    saveProgress(current);
  }
};

export const saveQuizScore = (classId: number, subjectId: string, chapterId: string, result: QuizResult) => {
  const current = loadProgress() || { completedChapters: [], quizScores: {} };
  const key = `${classId}-${subjectId}-${chapterId}`;
  
  // Always overwrite with the latest score
  current.quizScores[key] = result;
  saveProgress(current);
};

// --- Content Caching (AI Responses) ---

export const saveCachedContent = (key: string, data: any) => {
  try {
    const currentCache = JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY) || '{}');
    currentCache[key] = data;
    // Simple cache eviction if too large (naive approach)
    const jsonString = JSON.stringify(currentCache);
    if (jsonString.length > 4500000) { // ~4.5MB safety limit
        // If full, clear half of it randomly or just clear all for simplicity in this demo
        localStorage.removeItem(CONTENT_CACHE_KEY);
        // Try saving just the new item
        localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify({ [key]: data }));
    } else {
        localStorage.setItem(CONTENT_CACHE_KEY, jsonString);
    }
  } catch (e) {
    console.warn("Storage full or error saving cache", e);
  }
};

export const getCachedContent = <T>(key: string): T | null => {
  try {
    const currentCache = JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY) || '{}');
    return currentCache[key] as T || null;
  } catch (e) {
    return null;
  }
};