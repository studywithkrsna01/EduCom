import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ClassLevel, SubjectId, QuizQuestion } from '../types';
import { SUBJECTS, CHAPTERS } from '../constants';
import { generateChapterQuiz } from '../services/geminiService';
import { saveQuizScore, getCachedContent, saveCachedContent } from '../services/storage';
import { ArrowLeft, Loader2, Check, X, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';

interface QuizProps {
  selectedClass: ClassLevel;
  onProgressUpdate: () => void;
}

const Quiz: React.FC<QuizProps> = ({ selectedClass, onProgressUpdate }) => {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const subject = SUBJECTS.find(s => s.id === subjectId);
  const chapter = CHAPTERS[selectedClass][subjectId as SubjectId]?.find(c => c.id === chapterId);

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chapterId, selectedClass]);

  const loadQuiz = () => {
    if (subject && chapter) {
        setLoading(true);
        setShowResults(false);
        setCurrentQuestionIndex(0);
        setScore(0);
        setQuestions([]);
        setSelectedOption(null);
        setIsAnswered(false);
        
        const cacheKey = `quiz_${selectedClass}_${subject.id}_${chapter.id}`;
        const cachedData = getCachedContent<QuizQuestion[]>(cacheKey);

        if (cachedData) {
          setQuestions(cachedData);
          setLoading(false);
        } else {
          generateChapterQuiz(selectedClass, subject.name, chapter.title)
            .then(qs => {
              setQuestions(qs);
              if (qs.length > 0) {
                saveCachedContent(cacheKey, qs);
              }
              setLoading(false);
            })
            .catch(err => {
              console.error(err);
              setLoading(false);
            });
        }
    }
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    
    setIsAnswered(true);
    if (selectedOption === questions[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(p => p + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      if (subject && chapter) {
          saveQuizScore(selectedClass, subject.id, chapter.id, {
              score: score + (selectedOption === questions[currentQuestionIndex].correctAnswer ? 1 : 0),
              total: questions.length,
              date: new Date().toISOString()
          });
          onProgressUpdate();
      }
    }
  };

  if (!subject || !chapter) return <div>Invalid URL</div>;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-12 w-12 text-teal-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">Generating Quiz...</h2>
        <p className="text-slate-500 dark:text-slate-400">AI is crafting questions for {chapter.title}</p>
      </div>
    );
  }

  if (questions.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">Could not generate questions. Please try again.</p>
              <button onClick={loadQuiz} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Retry</button>
          </div>
      )
  }

  if (showResults) {
    const finalScore = score + (selectedOption === questions[currentQuestionIndex].correctAnswer ? 1 : 0);
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-800">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Quiz Completed!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">{subject.name} - {chapter.title}</p>

            <div className="mb-8 relative inline-block">
                <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                        className="text-slate-100 dark:text-slate-800"
                        strokeWidth="12"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                    />
                    <circle
                        className={percentage >= 70 ? "text-green-500" : percentage >= 40 ? "text-orange-500" : "text-red-500"}
                        strokeWidth="12"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * percentage) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="70"
                        cx="80"
                        cy="80"
                    />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center flex-col">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white">{percentage}%</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">Score</span>
                </div>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 mb-8">
                You answered <span className="font-bold text-slate-900 dark:text-white">{finalScore}</span> out of <span className="font-bold text-slate-900 dark:text-white">{questions.length}</span> questions correctly.
            </p>

            <div className="flex flex-col gap-3">
            <button 
                onClick={loadQuiz}
                className="w-full flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-bold shadow-md hover:shadow-lg"
            >
                <RefreshCw className="h-5 w-5 mr-2" /> Try Again
            </button>
            <Link 
                to={`/subject/${subjectId}`}
                className="w-full flex items-center justify-center px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
                Back to Chapters
            </Link>
            </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      {/* Header with Progress */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-colors">
        <div className="px-4 py-3 flex items-center justify-between">
             <Link to={`/subject/${subjectId}`} className="text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 p-1">
                <ArrowLeft className="h-5 w-5" />
             </Link>
             <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Question {currentQuestionIndex + 1} <span className="text-slate-400 dark:text-slate-500 font-normal">of {questions.length}</span>
             </div>
             <div className="w-6"></div> {/* Spacer for centering */}
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 w-full">
            <div 
                className="h-full bg-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
        </div>
      </div>

      {/* Scrollable Question Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-8 pb-32">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 mb-6 transition-colors">
                <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({node, ...props}) => <p {...props} className="mb-0" />
                        }}
                    >
                        {currentQ.question}
                    </ReactMarkdown>
                </div>
            </div>

            <div className="space-y-3">
                {currentQ.options.map((option, idx) => {
                    let containerClass = "relative w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200 outline-none ";
                    
                    if (isAnswered) {
                        if (idx === currentQ.correctAnswer) {
                            containerClass += "border-green-500 bg-green-50 dark:bg-green-900/30 shadow-md";
                        } else if (idx === selectedOption) {
                            containerClass += "border-red-500 bg-red-50 dark:bg-red-900/30 opacity-90";
                        } else {
                            containerClass += "border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-50";
                        }
                    } else {
                        if (selectedOption === idx) {
                            containerClass += "border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-md transform scale-[1.01]";
                        } else {
                            containerClass += "border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300";
                        }
                    }

                    return (
                        <button 
                            key={idx}
                            disabled={isAnswered}
                            onClick={() => handleOptionSelect(idx)}
                            className={containerClass}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
                                    isAnswered && idx === currentQ.correctAnswer ? 'border-green-500 bg-green-500 text-white' :
                                    isAnswered && idx === selectedOption && idx !== currentQ.correctAnswer ? 'border-red-500 bg-red-500 text-white' :
                                    selectedOption === idx ? 'border-teal-500 bg-teal-500 text-white' :
                                    'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                                }`}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className={`flex-1 font-medium ${isAnswered && idx === currentQ.correctAnswer ? 'text-green-900 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm, remarkMath]} 
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({node, ...props}) => <span {...props} />
                                        }}
                                    >
                                        {option}
                                    </ReactMarkdown>
                                </span>
                                {isAnswered && idx === currentQ.correctAnswer && <Check className="h-5 w-5 text-green-600 dark:text-green-400" />}
                                {isAnswered && idx === selectedOption && idx !== currentQ.correctAnswer && <X className="h-5 w-5 text-red-600 dark:text-red-400" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            {isAnswered && (
                <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">Explanation</p>
                            <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm, remarkMath]} 
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        p: ({node, ...props}) => <p {...props} className="mb-0" />
                                    }}
                                >
                                    {currentQ.explanation}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 transition-colors">
        <div className="max-w-2xl mx-auto">
            {!isAnswered ? (
                <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${
                        selectedOption === null 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' 
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 hover:shadow-teal-600/30'
                    }`}
                >
                    Submit Answer
                </button>
            ) : (
                <button
                    onClick={handleNextQuestion}
                    className="w-full flex items-center justify-center py-4 rounded-xl font-bold text-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 transition-all transform active:scale-[0.98]"
                >
                    {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ChevronRight className="h-5 w-5 ml-2" />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;