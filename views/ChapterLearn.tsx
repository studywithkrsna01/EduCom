import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ClassLevel, SubjectId } from '../types';
import { SUBJECTS, CHAPTERS } from '../constants';
import { generateTopicExplanation, getChapterSyllabus, ExplanationResult, Source } from '../services/geminiService';
import { markChapterComplete, getCachedContent, saveCachedContent } from '../services/storage';
import { 
  ArrowLeft, 
  BookOpen, 
  Loader2, 
  CheckCircle, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  List,
  Quote,
  Target
} from 'lucide-react';

interface ChapterLearnProps {
  selectedClass: ClassLevel;
  onProgressUpdate: () => void;
}

const ChapterLearn: React.FC<ChapterLearnProps> = ({ selectedClass, onProgressUpdate }) => {
  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState<number>(0);
  const [content, setContent] = useState<string>("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [loadingSyllabus, setLoadingSyllabus] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const subject = SUBJECTS.find(s => s.id === subjectId);
  const chapter = CHAPTERS[selectedClass][subjectId as SubjectId]?.find(c => c.id === chapterId);
  
  // Ref to track if we are currently initializing to prevent race conditions
  const initializingRef = useRef(false);

  // 1. Unified Initialization Effect (Syllabus + First Topic Parallel Fetching)
  useEffect(() => {
    if (subject && chapter) {
      const initializeChapter = async () => {
        initializingRef.current = true;
        setLoadingSyllabus(true);
        // Reset view for new chapter
        setCurrentTopicIndex(0);
        setContent("");
        setSources([]);
        setReadProgress(0);

        const syllabusKey = `syllabus_${selectedClass}_${subject.id}_${chapter.id}`;
        const cachedSyllabus = getCachedContent<string[]>(syllabusKey);

        if (cachedSyllabus && cachedSyllabus.length > 0) {
          // Scenario A: Cache Hit - Just load syllabus, content effect will handle the rest (likely cached too)
          setTopics(cachedSyllabus);
          setLoadingSyllabus(false);
        } else {
          // Scenario B: Cache Miss - Parallel Fetch
          try {
            // We assume the first topic is "Introduction" to start fetching content immediately
            const firstTopicPlaceholder = "Introduction";
            
            // Trigger both requests
            const syllabusPromise = getChapterSyllabus(selectedClass, subject.name, chapter.title);
            const contentPromise = generateTopicExplanation(selectedClass, subject.name, chapter.title, firstTopicPlaceholder);

            // Wait for both
            const [fetchedTopics, firstContentResult] = await Promise.all([syllabusPromise, contentPromise]);

            // Construct final topic list (Ensure Introduction is first)
            let finalTopics = fetchedTopics;
            
            // Remove "Introduction" from fetched list if present to avoid duplicates, then prepend
            const filteredTopics = fetchedTopics.filter(t => t.toLowerCase() !== "introduction");
            finalTopics = [firstTopicPlaceholder, ...filteredTopics];

            // Save Syllabus to Cache
            saveCachedContent(syllabusKey, finalTopics);
            
            // Pre-seed Content Cache for Index 0 so the next useEffect picks it up instantly
            const contentKey = `content_${selectedClass}_${subject.id}_${chapter.id}_0`;
            saveCachedContent(contentKey, firstContentResult);

            // Update State
            setTopics(finalTopics);
            setLoadingSyllabus(false);
          } catch (error) {
            console.error("Initialization error", error);
            setTopics(["Detailed Explanation"]); 
            setLoadingSyllabus(false);
          }
        }
        initializingRef.current = false;
      };

      initializeChapter();
    }
  }, [subject, chapter, selectedClass, subjectId, chapterId]);

  // 2. Fetch Content when Topic changes
  // This will naturally pick up the pre-seeded cache from Step 1 for the first topic
  useEffect(() => {
    if (subject && chapter && topics.length > 0) {
      const currentTopic = topics[currentTopicIndex];
      const contentKey = `content_${selectedClass}_${subject.id}_${chapter.id}_${currentTopicIndex}`; 
      
      const cachedData = getCachedContent<ExplanationResult>(contentKey);

      setLoadingContent(true);
      setReadProgress(0); // Reset reading progress
      
      if (cachedData) {
        setContent(cachedData.content);
        setSources(cachedData.sources || []);
        setLoadingContent(false);
      } else {
        // Only fetch if not in cache (and not currently being handled by init logic for index 0)
        generateTopicExplanation(selectedClass, subject.name, chapter.title, currentTopic)
          .then(result => {
            setContent(result.content);
            setSources(result.sources);
            saveCachedContent(contentKey, result);
            setLoadingContent(false);
          })
          .catch(() => {
            setContent("## Error\nUnable to load this topic.");
            setLoadingContent(false);
          });
      }
    }
  }, [subject, chapter, selectedClass, topics, currentTopicIndex]);

  // Mark complete when finishing the last topic
  useEffect(() => {
    if (topics.length > 0 && currentTopicIndex === topics.length - 1 && !loadingContent && subject && chapter) {
       markChapterComplete(selectedClass, subject.id, chapter.id);
       onProgressUpdate();
    }
  }, [currentTopicIndex, topics.length, loadingContent, selectedClass, subject, chapter, onProgressUpdate]);


  if (!subject || !chapter) return <div className="p-8 dark:text-slate-200">Chapter not found</div>;

  const handleNext = () => {
    if (currentTopicIndex < topics.length - 1) {
      setCurrentTopicIndex(prev => prev + 1);
      const contentArea = document.getElementById('content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }
  };

  const handlePrev = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(prev => prev - 1);
       const contentArea = document.getElementById('content-area');
       if (contentArea) contentArea.scrollTop = 0;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - clientHeight > 0) {
        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setReadProgress(progress);
    } else {
        setReadProgress(100);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header for Learning Mode */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm relative transition-colors">
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Toggle Syllabus"
            >
                <List className="h-5 w-5" />
            </button>
            <Link 
              to={`/subject/${subjectId}`} 
              className="text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors"
              title="Back to Subject"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 md:text-base line-clamp-1">{chapter.title}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1">
                 <BookOpen className="h-3 w-3" />
                 {loadingSyllabus ? 'Loading syllabus...' : topics[currentTopicIndex]}
              </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
             <Link
                to={`/quiz/${subjectId}/${chapterId}`}
                className="hidden sm:flex items-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors border border-orange-200 dark:border-orange-800/50"
            >
                Take Quiz <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar (Drawer on All Screens) */}
        <aside className={`
            absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 z-30 shadow-2xl
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chapter Syllabus</h2>
                    <button 
                      onClick={() => setIsSidebarOpen(false)}
                      className="md:hidden text-slate-400 hover:text-slate-600"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingSyllabus ? (
                        <div className="flex items-center justify-center h-20">
                            <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                        </div>
                    ) : (
                        topics.map((topic, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setCurrentTopicIndex(idx);
                                    setIsSidebarOpen(false); // Close drawer on selection on all screens
                                }}
                                className={`w-full text-left px-3 py-3 text-sm rounded-lg transition-colors flex items-start gap-3 group ${
                                    currentTopicIndex === idx 
                                    ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-200 font-semibold' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className={`mt-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] shrink-0 border transition-colors ${
                                    currentTopicIndex === idx 
                                    ? 'border-teal-500 bg-teal-500 text-white' 
                                    : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 group-hover:border-teal-400 group-hover:text-teal-500'
                                }`}>
                                    {idx + 1}
                                </span>
                                <span className="line-clamp-2 leading-snug">{topic}</span>
                                {currentTopicIndex > idx && <CheckCircle className="h-4 w-4 ml-auto text-green-500 dark:text-green-400 mt-0.5 shrink-0" />}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </aside>

        {/* Backdrop for All Screens when Sidebar is open */}
        {isSidebarOpen && (
            <div 
                className="absolute inset-0 bg-black/20 dark:bg-black/50 z-20 backdrop-blur-[1px]"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}

        {/* Content Area with Fixed Footer Layout */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Reading Progress Bar (Top Sticky) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 z-20">
                <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-150 ease-out"
                    style={{ width: `${readProgress}%` }}
                />
            </div>

            {/* Scrollable Content */}
            <div 
                id="content-area"
                className="flex-1 overflow-y-auto scroll-smooth"
                onScroll={handleScroll}
            >
                <div className="max-w-3xl mx-auto p-4 md:p-8 pb-10">
                    {loadingContent ? (
                        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                            <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
                            <div className="text-center">
                                <p className="text-slate-800 dark:text-slate-200 font-medium text-lg">Preparing Topic...</p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    {topics[currentTopicIndex] || "Fetching details"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div key={currentTopicIndex} className="animate-in fade-in duration-300">
                            {/* Topic Title */}
                            <div className="mb-6">
                                <span className="inline-block px-2 py-1 bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-bold rounded uppercase tracking-wider mb-2">
                                    Topic {currentTopicIndex + 1}/{topics.length}
                                </span>
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                    {topics[currentTopicIndex]}
                                </h2>
                            </div>

                            {/* Enhanced Markdown Content */}
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        // Headers
                                        h1: ({node, ...props}) => <h1 className="text-3xl font-extrabold text-teal-900 dark:text-teal-50 mt-8 mb-6 border-b-2 border-teal-100 dark:border-teal-900 pb-2" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-10 mb-4 flex items-center" {...props} />,
                                        
                                        // H3 as Interactive Topic Header with Icon
                                        h3: ({node, ...props}) => (
                                            <div className="flex items-start gap-3 mt-8 mb-4">
                                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg mt-0.5 shrink-0 shadow-sm border border-orange-200 dark:border-orange-800/30">
                                                     <Target className="h-5 w-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 pt-1.5" {...props} />
                                            </div>
                                        ),
                                        
                                        h4: ({node, ...props}) => <h4 className="text-base font-bold text-teal-700 dark:text-teal-400 mt-6 mb-2 flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-teal-500"></div>{props.children}</h4>,
                                        
                                        // Paragraphs and text
                                        p: ({node, ...props}) => <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-5 text-base" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold text-teal-900 dark:text-teal-100 bg-teal-50 dark:bg-teal-900/30 px-1 rounded-sm" {...props} />,
                                        
                                        // Lists
                                        ul: ({node, ...props}) => <ul className="space-y-3 mb-6 list-none" {...props} />,
                                        ol: ({node, ...props}) => <ol className="space-y-3 mb-6 list-decimal list-inside font-medium text-slate-700 dark:text-slate-300" {...props} />,
                                        li: ({node, ...props}) => (
                                            <li className="flex gap-3 text-slate-700 dark:text-slate-300" {...props}>
                                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-400 dark:bg-teal-500 flex-shrink-0" />
                                                <div className="flex-1">{props.children}</div>
                                            </li>
                                        ),
                                        
                                        // Blockquotes
                                        blockquote: ({node, ...props}) => (
                                            <div className="relative pl-6 py-4 my-8 border-l-4 border-teal-500 bg-gradient-to-r from-teal-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-r-lg group hover:bg-teal-50/50 dark:hover:bg-slate-800/80 transition-colors duration-300">
                                                <Quote className="absolute -top-3 -left-3 h-6 w-6 text-white bg-teal-500 rounded-full p-1 border-2 border-white dark:border-slate-800 shadow-sm" />
                                                <div className="italic text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {props.children}
                                                </div>
                                            </div>
                                        ),

                                        // Tables
                                        table: ({node, ...props}) => (
                                            <div className="overflow-x-auto my-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700" {...props} />
                                            </div>
                                        ),
                                        thead: ({node, ...props}) => <thead className="bg-slate-50 dark:bg-slate-800" {...props} />,
                                        th: ({node, ...props}) => <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider" {...props} />,
                                        tbody: ({node, ...props}) => <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700" {...props} />,
                                        tr: ({node, ...props}) => <tr className="hover:bg-teal-50/30 dark:hover:bg-slate-800/50 transition-colors" {...props} />,
                                        td: ({node, ...props}) => <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 align-top" {...props} />,

                                        // Code/Pre
                                        code: ({node, ...props}) => <code className="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200 dark:border-slate-700" {...props} />,
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>

                            {/* Sources */}
                            {sources.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Verified Sources
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {sources.map((source, idx) => (
                                            <a 
                                                key={idx} 
                                                href={source.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 transition-all shadow-sm transform hover:scale-105"
                                            >
                                                <span className="truncate max-w-[200px] font-medium">{source.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Fixed Bottom Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 transition-colors">
                <button
                    onClick={handlePrev}
                    disabled={currentTopicIndex === 0}
                    className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        currentTopicIndex === 0
                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400'
                    }`}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </button>

                <div className="flex flex-col items-center">
                   <div className="w-24 sm:w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-teal-500 transition-all duration-300"
                         style={{ width: `${((currentTopicIndex + 1) / topics.length) * 100}%` }}
                       ></div>
                   </div>
                   <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1 uppercase tracking-wide">
                     Topic {currentTopicIndex + 1} of {topics.length}
                   </span>
                </div>

                {currentTopicIndex < topics.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={loadingContent || loadingSyllabus}
                        className="flex items-center px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-teal-700 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                ) : (
                    <Link
                        to={`/quiz/${subjectId}/${chapterId}`}
                        className="flex items-center px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-orange-600 hover:shadow-lg transition-all active:scale-95 animate-pulse"
                    >
                        Start Quiz <CheckCircle className="h-4 w-4 ml-1" />
                    </Link>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default ChapterLearn;