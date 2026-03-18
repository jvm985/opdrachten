export interface Location { id: string; label: string; x: number; y: number; }
export interface DefinitionPair { id: string; definition: string; term: string; }
export interface MatchingPair { id: string; left: string; right: string; }
export interface SubQuestion { id: string; text: string; points: number; }

export interface Question {
  id: string;
  type: 'open' | 'multiple-choice' | 'true-false' | 'map' | 'definitions' | 'matching' | 'ordering' | 'image-analysis' | 'timeline' | 'table-fill' | 'fill-blanks';
  text: string;
  points: number;
  options?: string[];
  correctAnswer: string;
  correctExplanation?: string;
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
}

export interface Exam {
  id: string;
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
  created_at: string;
}
