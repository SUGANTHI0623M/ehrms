export interface LessonMaterial {
  id: string;
  title: string;
  contentType: "Video" | "YouTube" | "PDF" | "External URL" | "";
  url?: string;
  subtitleUrl?: string;
  file?: File;
  fileName?: string;
  publicId?: string;
  format?: string;
  provider?: string;
}

export interface AssessmentQuestion {
  id: string;
  type: "MCQ" | "Multiple Correct" | "True / False" | "Short Answer";
  questionText: string;
  options: string[];
  correctAnswers: string[];
  marks: number;
}

export interface Lesson {
  id: string;
  title: string;
  materials: LessonMaterial[];
  questions: AssessmentQuestion[];
}

export interface CourseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

export interface MaterialPreviewState {
  visible: boolean;
  type: "video" | "pdf" | "youtube" | "iframe" | null;
  url: string;
  title: string;
  subtitleUrl?: string;
}

export interface MaterialSaveUploadProgressState {
  visible: boolean;
  perFile: Record<number, number>;
  fileNames: Record<number, string>;
  totalFiles: number;
}
