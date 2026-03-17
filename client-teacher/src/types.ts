export interface Location { id: string; label: string; x: number; y: number; }
export interface DefinitionPair { id: string; definition: string; term: string; }
export interface MatchingPair { id: string; left: string; right: string; }
export interface SubQuestion { id: string; text: string; points: number; correctAnswer?: string; }

export interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis' | 'timeline' | 'table-fill';
  text: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  image?: string;
  locations?: Location[];
  pairs?: DefinitionPair[];
  matchingPairs?: MatchingPair[];
  orderItems?: string[];
  orderDirection?: 'vertical' | 'horizontal';
  subQuestions?: SubQuestion[];
  tableData?: string[][];
  tableConfig?: { interactiveCells: { r: number, c: number }[], mode: 'type' | 'drag', ignoreRowOrder?: boolean };
  timelineData?: { id: string, text: string }[][];
  startYear?: number;
  endYear?: number;
  totalBuckets?: number;
  explainIfFalse?: boolean;
  labels?: string[];
  isShared?: boolean;
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  exam_key: string;
  questions: Question[];
  labels: string[];
  type: 'taak' | 'toets' | 'examen' | 'formulier';
  isGraded: boolean;
  requireFullscreen: boolean;
  detectTabSwitch: boolean;
  submissionCount: number;
  hasSubmissions: boolean;
  isShared: boolean;
  isDeleted: boolean;
  teacherName?: string;
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
