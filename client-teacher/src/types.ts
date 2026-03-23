export interface Location { id: string; label: string; x: number; y: number; }
export interface DefinitionPair { id: string; definition: string; term: string; }
export interface MatchingPair { id: string; left: string; right: string; }
export interface SubQuestion { id: string; text: string; points: number; correctAnswer?: string; }

export interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis' | 'timeline' | 'table-fill' | 'fill-blanks' | 'multi-true-false';
  text: string;
  content?: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  correctExplanation?: string;
  explainIfFalse?: boolean;
  image?: string;
  locations?: Location[];
  pairs?: DefinitionPair[];
  matchingPairs?: MatchingPair[];
  orderItems?: string[];
  statements?: { id: string; text: string; correctAnswer: 'Waar' | 'Onwaar'; }[]; // Voor multi-true-false
  totalBuckets?: number;
  startYear?: number;
  endYear?: number;
  timelineData?: { id: string; text: string; }[][];
  tableData?: string[][];
  tableConfig?: {
    mode: 'type' | 'drag';
    interactiveCells: { r: number; c: number }[];
    ignoreRowOrder?: boolean;
  };
  subQuestions?: SubQuestion[];
  labels?: string[]; // Voor de vraagbank
  isShared?: boolean; // Voor de vraagbank
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  exam_key: string;
  questions: Question[];
  labels: string[];
  isGraded: boolean;
  type: string; // Behouden voor data-integriteit
  requireFullscreen: boolean;
  detectTabSwitch: boolean;
  submissionCount: number;
  hasSubmissions: boolean;
  isShared: boolean;
  isDeleted: boolean;
  teacherName?: string;
  teacherEmail?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  student_klas: string;
  answers: any;
  scores: any;
  submitted_at: string;
}
