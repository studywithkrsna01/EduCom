export type ClassLevel = 11 | 12;

export type SubjectId = 'accounts' | 'stats' | 'ba' | 'eco' | 'english';

export interface Subject {
  id: SubjectId;
  name: string;
  icon: string;
  color: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  explanation: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface QuizResult {
  score: number;
  total: number;
  date: string;
}
