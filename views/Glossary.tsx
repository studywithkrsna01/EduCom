import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ClassLevel, SubjectId, GlossaryTerm } from '../types';
import { SUBJECTS } from '../constants';
import { generateSubjectGlossary } from '../services/geminiService';
import { getCachedContent, saveCachedContent } from '../services/storage';
import { Search, BookA, Loader2 } from 'lucide-react';

interface GlossaryProps {
  selectedClass: ClassLevel;
}

const Glossary: React.FC<GlossaryProps> = ({ selectedClass }) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(SUBJECTS[0].id);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchTerms(selectedSubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedClass]);

  const fetchTerms = async (subId: SubjectId) => {
    const key = `glossary_${selectedClass}_${subId}`;
    
    // Check Cache
    const cached = getCachedContent<GlossaryTerm[]>(key);
    if (cached) {
        setTerms(cached);
        return;
    }

    setLoading(true);
    const subName = SUBJECTS.find(s => s.id === subId)?.name || '';
    const newTerms = await generateSubjectGlossary(selectedClass, subName);
    
    if (newTerms.length > 0) {
        saveCachedContent(key, newTerms);
    }
    setTerms(newTerms);
    setLoading(false);
  };

  const filteredTerms = terms.filter(t => 
    t.term.toLowerCase().includes(filter.toLowerCase()) || 
    t.definition.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-teal-900 dark:text-teal-100 flex items-center gap-2">
             <BookA className="h-8 w-8 text-teal-600 dark:text-teal-400" />
             Commerce Glossary
           </h1>
           <p className="text-slate-500 dark:text-slate-400">Key terms for Class {selectedClass}</p>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search terms..." 
                className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full md:w-64 placeholder-slate-400"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
        </div>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {SUBJECTS.map((sub) => (
            <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedSubject === sub.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
            >
                {sub.name}
            </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
            <p className="ml-3 text-slate-500 dark:text-slate-400 mt-2">Generating glossary...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTerms.length > 0 ? (
                filteredTerms.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200 mb-2">{item.term}</h3>
                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                             <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]} 
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  p: ({node, ...props}) => <p {...props} className="mb-0" />
                                }}
                            >
                                {item.definition}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">
                    No terms found.
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Glossary;