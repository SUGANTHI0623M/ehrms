// Data Contracts for Learning Engine Dashboard

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DailyGoal {
    date: string;
    targetMinutes: number;
    currentMinutes: number;
    tasksCompleted: number;
    tasksTarget: number;
    streakDays: number;
    streakFrozen: boolean; // Grace period used?
    longestStreak?: number;
    status: 'pending' | 'achieved' | 'exceeded';
    message: string; // Dynamic insight text
}


export interface SkillMetric {
    skillId: string;
    name: string;
    competence: number; // 0-100 (Real skill level)
    confidence: number; // 0-100 (Self-reported or implicit)
    gap: number; // Difference required for role
    category: 'Technical' | 'Soft' | 'Domain';
}


export interface ActivityPoint {
    date: string; // YYYY-MM-DD
    intensity: number; // 0-4 (LeetCode style) - calculated from score
    // Detailed Metrics
    totalMinutes?: number;
    lessonsCompleted?: number;
    quizzesAttempted?: number;
    assessmentsAttempted?: number;
    activityScore?: number;
    activityLevel?: 'none' | 'low' | 'medium' | 'high';
    details: Array<{
        type: 'lesson' | 'quiz' | 'assignment';
        title: string;
        score?: number;
    }>;
}

export interface CourseFriction {
    courseId: string;
    title: string;
    progress: number;
    isStuck: boolean;
    stuckReason?: 'repeated_failures' | 'high_replay_count' | 'long_inactivity';
    stuckAtLayout?: string; // e.g., "Lesson 4: Advanced Redux"
    suggestedAction: {
        type: 'revise' | 'mentor' | 'skip';
        label: string;
        targetUrl: string;
    };
}

export interface Recommendation {
    id: string;
    type: 'resume' | 'challenge' | 'revise' | 'new_path';
    title: string;
    reason: string; // "Because you failed Quiz 3 twice"
    timeEstimate: string; // "10 min"
    priority: UrgencyLevel;
}

export interface PerformanceMatrixPoint {
    courseName: string;
    timeSpent: number; // Normalized 0-100
    scoreImprovement: number; // Normalized 0-100
    status: 'efficient' | 'needs_practice' | 'struggling' | 'master';
}

export interface RoleReadiness {
    targetRole: string; // e.g. "Senior Frontend Dev"
    currentScore: number; // 72
    missingSkills: string[];
    nextMilestone: string;
}

export interface LearningEngineData {
    dailyGoal: DailyGoal;
    skills: SkillMetric[];
    heatmap: ActivityPoint[];
    frictionCourses: CourseFriction[];
    recommendations: Recommendation[];
    performanceMatrix: PerformanceMatrixPoint[];
    readiness: RoleReadiness;
}
