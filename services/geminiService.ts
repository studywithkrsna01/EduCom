import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, GlossaryTerm } from '../types';

// Initialize the Gemini AI client
// NOTE: We use process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

export interface Source {
  title: string;
  uri: string;
}

export interface ExplanationResult {
  content: string;
  sources: Source[];
}

// Specific reference URLs for subjects to ensure high-quality grounding
const REFERENCE_RESOURCES: Record<string, string[]> = {
  '12-Accountancy': [
    'https://cdn1.byjus.com/wp-content/uploads/2021/09/GSEB-Class-12-Elements-of-Accounts-Part-1-textbook-E.M..pdf',
    'https://gsebsolutions.com/gseb-textbook-solutions-class-12-commerce-accounts/',
    'https://cdn1.byjus.com/wp-content/uploads/2021/09/GSEB-Class-12-Elements-of-Accounts-Part-2-textbook-E.M..pdf'
  ]
};

/**
 * Generates a detailed list of progressive topics for a chapter.
 */
export const getChapterSyllabus = async (
  classLevel: number,
  subjectName: string,
  chapterTitle: string
): Promise<string[]> => {
  const resourceKey = `${classLevel}-${subjectName}`;
  const specificResources = REFERENCE_RESOURCES[resourceKey] 
    ? `Refer specifically to the following resources for accurate syllabus structure: ${REFERENCE_RESOURCES[resourceKey].join(', ')}` 
    : "Refer to 'gsebsolutions.com' and official GSEB textbooks";

  const prompt = `
    You are an expert teacher for GSEB (Gujarat Board) Commerce Class ${classLevel}.
    Create a detailed, ordered list of progressive study topics/sections for Subject: "${subjectName}", Chapter: "${chapterTitle}".
    
    ${specificResources}
    
    The syllabus must be comprehensive and strictly follow the official textbook structure.
    Break down the chapter into logical, learnable progressive topics.
    
    Return ONLY a valid JSON array of strings (topic titles).
  `;

  const schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleSearch: {} }] // Use search to get accurate syllabus structure
      },
    });

    const text = response.text;
    if (!text) return ["Introduction", "Key Concepts", "Summary"]; // Fallback
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini Syllabus Error:", error);
    return ["Overview", "Main Concepts", "Conclusion"]; // Fallback
  }
};

/**
 * Generates an educational explanation for a specific topic within a chapter.
 */
export const generateTopicExplanation = async (
  classLevel: number,
  subjectName: string,
  chapterTitle: string,
  topic: string
): Promise<ExplanationResult> => {
  const resourceKey = `${classLevel}-${subjectName}`;
  const specificResources = REFERENCE_RESOURCES[resourceKey] 
    ? `Ensure content aligns with these specific text books/solutions: ${REFERENCE_RESOURCES[resourceKey].join(', ')}` 
    : "Ensure content aligns with the latest GSEB syllabus, citing 'gsebsolutions.com' or textbooks where relevant.";

  const prompt = `
    You are an expert teacher for GSEB (Gujarat Board) Commerce Class ${classLevel}.
    Provide a detailed, highly engaging, and visually structured explanation for the topic: "${topic}"
    From Subject: "${subjectName}", Chapter: "${chapterTitle}".
    
    ${specificResources}
    
    **Formatting Rules for Visual Appeal:**
    1. **Structure**: Use **H3** headings for sub-sections.
    2. **Comparisons/Data**: MUST use **Markdown Tables** where possible (e.g., Features vs Limitations, Debit vs Credit).
    3. **Key Terms**: Use **Bold** for important vocabulary.
    4. **Definitions**: Use **Blockquotes (>)** for official definitions or formulas.
    5. **Lists**: Use bullet points for characteristics, advantages, steps.
    6. **Examples**: Provide distinct examples in a separate section.
    7. **Math & Formulas**: CRITICAL for Statistics and Accounting. Use standard **LaTeX** syntax for ALL formulas and equations.
       - Use single dollar signs for inline math: $E = mc^2$
       - Use double dollar signs for block equations: $$ \sigma = \sqrt{\frac{\sum(x - \mu)^2}{N}} $$
       - Ensure complex fractions, sigma notations, and indices are correctly formatted in LaTeX.

    **Content Structure:**
    1. **Concept Overview**: Brief intro with a blockquote definition.
    2. **Detailed Explanation**: Broken down with H3 sub-headers.
    3. **Key Insights/Table**: A comparison table or key data points.
    4. **Real-world Example**: An Indian commerce context example.
    5. **Summary**: 3-4 bullet points.
    
    Format in clean, rich Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const content = response.text || "Sorry, content generation failed.";
    
    // Extract sources from grounding metadata
    const sources: Source[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri
          });
        }
      });
    }

    // Deduplicate sources
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

    return { content, sources: uniqueSources };
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return { 
      content: "## Error\nCould not generate content at this time. Please check your connection and try again.",
      sources: []
    };
  }
};

/**
 * Generates a quiz for a specific chapter.
 */
export const generateChapterQuiz = async (
  classLevel: number,
  subjectName: string,
  chapterTitle: string
): Promise<QuizQuestion[]> => {
  const resourceKey = `${classLevel}-${subjectName}`;
  const specificResources = REFERENCE_RESOURCES[resourceKey] 
    ? `Reference material: ${REFERENCE_RESOURCES[resourceKey].join(', ')}` 
    : "";

  const prompt = `
    Create a quiz with 5 multiple-choice questions for GSEB Class ${classLevel} Commerce, Subject: ${subjectName}, Chapter: ${chapterTitle}.
    ${specificResources}
    
    **Crucial for Statistics and Accountancy:**
    - If a question, option, or explanation involves numerical equations, formulas, or symbols, use **LaTeX** formatting.
    - Inline math: $x + y = z$
    - Block math: $$ \frac{a}{b} $$
    - Ensure complex notation (sigma, integrals, roots) is correctly rendered in LaTeX.

    Return ONLY a valid JSON object matching this schema.
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        options: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Array of 4 options"
        },
        correctAnswer: { 
          type: Type.INTEGER,
          description: "Index of the correct option (0-3)"
        },
        explanation: { type: Type.STRING, description: "Why this answer is correct" }
      },
      required: ["question", "options", "correctAnswer", "explanation"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    return [];
  }
};

/**
 * Generates a glossary for a subject.
 */
export const generateSubjectGlossary = async (
  classLevel: number,
  subjectName: string
): Promise<GlossaryTerm[]> => {
  const resourceKey = `${classLevel}-${subjectName}`;
  const specificResources = REFERENCE_RESOURCES[resourceKey] 
    ? `Reference material: ${REFERENCE_RESOURCES[resourceKey].join(', ')}` 
    : "";

  const prompt = `
    Generate a glossary of 10 important terms for GSEB Class ${classLevel} Commerce Subject: ${subjectName}.
    ${specificResources}
    Focus on exam-oriented key terms.

    **Formatting:**
    - If a definition involves a mathematical formula (especially for Statistics/Accounts), use **LaTeX** with single dollar signs ($...$).
  `;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        term: { type: Type.STRING },
        definition: { type: Type.STRING }
      },
      required: ["term", "definition"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as GlossaryTerm[];
  } catch (error) {
    console.error("Gemini Glossary Error:", error);
    return [];
  }
};