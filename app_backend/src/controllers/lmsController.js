const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const LiveSession = require('../models/LiveSession');
const SessionLog = require('../models/SessionLog');
const LearningActivity = require('../models/LearningActivity');
const AIQuiz = require('../models/AIQuiz');
const QuizAttempt = require('../models/QuizAttempt');
const Staff = require('../models/Staff');

// Helper: get staff ID from request
const getStaffId = (req) => req.staff?._id || req.user?._id;

// Helper: get businessId
const getBusinessId = (req) => req.staff?.businessId || req.user?.companyId;

// GET /lms/courses - List all published courses (for library)
const getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find({ status: 'Published' }).sort({ createdAt: -1 }).limit(50);
        res.json({ success: true, data: courses });
    } catch (err) {
        console.error('[LMS] getAllCourses error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/courses/:id/enroll - Self-enroll in course
const enrollCourse = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const course = await Course.findById(id);
        if (!course || course.status !== 'Published') return res.status(404).json({ success: false, message: 'Course not found' });

        let progress = await CourseProgress.findOne({ courseId: id, employeeId: staffId });
        if (progress) return res.json({ success: true, data: progress });

        progress = await CourseProgress.create({
            courseId: id,
            employeeId: staffId,
            status: 'Not Started',
            contentProgress: [],
            completedLessons: [],
            businessId: getBusinessId(req),
        });
        res.status(201).json({ success: true, data: progress });
    } catch (err) {
        console.error('[LMS] enrollCourse error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/my-courses - Employee's enrolled courses
const getMyCourses = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const progressList = await CourseProgress.find({ employeeId: staffId })
            .populate('courseId')
            .sort({ updatedAt: -1 });

        const data = progressList
            .filter(p => p.courseId)
            .map(p => ({
                _id: p._id,
                courseId: p.courseId,
                status: p.status,
                completionPercentage: p.completionPercentage,
                lastAccessedAt: p.lastAccessedAt,
                timeSpent: p.timeSpent,
                createdAt: p.createdAt,
            }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('[LMS] getMyCourses error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/courses/:id/details - Course details with progress
const getCourseDetails = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;

        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        let progress = null;
        if (staffId) {
            progress = await CourseProgress.findOne({ courseId: id, employeeId: staffId });
        }

        res.json({ success: true, data: { course, progress } });
    } catch (err) {
        console.error('[LMS] getCourseDetails error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/courses/:id/my-progress
const getMyProgress = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const progress = await CourseProgress.findOne({ courseId: id, employeeId: staffId });
        res.json({ success: true, data: progress || {} });
    } catch (err) {
        console.error('[LMS] getMyProgress error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/courses/:id/complete-lesson - Mark lesson complete (by lessonTitle)
// Web may send lessonId (alias for lessonTitle) for compatibility
const completeLesson = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        const { lessonTitle, lessonId } = req.body || {};
        const lesson = lessonTitle || lessonId;
        if (!staffId || !lesson) return res.status(400).json({ success: false, message: 'Missing lessonTitle or lessonId' });

        let progress = await CourseProgress.findOne({ courseId: id, employeeId: staffId });
        if (!progress) {
            progress = await CourseProgress.create({
                courseId: id,
                employeeId: staffId,
                status: 'In Progress',
                contentProgress: [],
                completedLessons: [lesson],
                completionPercentage: 0,
            });
        } else {
            if (!progress.completedLessons.includes(lesson)) {
                progress.completedLessons.push(lesson);
                await progress.save();
            }
        }

        const course = await Course.findById(id);
        const allMaterials = [...(course?.materials || []), ...(course?.contents || [])];
        const lessonMaterials = allMaterials.filter(m => (m.lessonTitle || 'Course Materials') === lesson);
        for (const m of lessonMaterials) {
            const existing = progress.contentProgress.find(p => String(p.contentId) === String(m._id));
            if (!existing) {
                progress.contentProgress.push({ contentId: m._id, viewed: true, viewedAt: new Date() });
            } else if (!existing.viewed) {
                existing.viewed = true;
                existing.viewedAt = new Date();
            }
        }
        const total = allMaterials.length;
        const viewed = progress.contentProgress.filter(p => p.viewed).length;
        progress.completionPercentage = total > 0 ? Math.round((viewed / total) * 100) : 0;
        progress.status = progress.completionPercentage >= 100 ? 'Completed' : 'In Progress';
        progress.lastAccessedAt = new Date();
        await progress.save();

        res.json({ success: true, data: progress });
    } catch (err) {
        console.error('[LMS] completeLesson error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/courses/:id/progress - Update content progress
const updateProgress = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        const { contentId, completed, watchTime } = req.body;
        if (!staffId || !contentId) return res.status(400).json({ success: false, message: 'Missing contentId' });

        let progress = await CourseProgress.findOne({ courseId: id, employeeId: staffId });
        if (!progress) {
            progress = await CourseProgress.create({
                courseId: id,
                employeeId: staffId,
                status: 'In Progress',
                contentProgress: [],
                completedLessons: [],
            });
        }

        let entry = progress.contentProgress.find(p => String(p.contentId) === String(contentId));
        if (!entry) {
            progress.contentProgress.push({
                contentId,
                viewed: !!completed,
                viewedAt: completed ? new Date() : undefined,
            });
        } else {
            entry.viewed = completed !== undefined ? completed : entry.viewed;
            entry.viewedAt = completed ? new Date() : entry.viewedAt;
        }
        if (watchTime) progress.timeSpent = (progress.timeSpent || 0) + watchTime;
        progress.lastAccessedAt = new Date();

        const course = await Course.findById(id);
        const total = (course?.materials?.length || 0) + (course?.contents?.length || 0);
        const viewed = progress.contentProgress.filter(p => p.viewed).length;
        progress.completionPercentage = total > 0 ? Math.round((viewed / total) * 100) : 0;
        progress.status = progress.completionPercentage >= 100 ? 'Completed' : 'In Progress';
        await progress.save();

        res.json({ success: true, data: progress });
    } catch (err) {
        console.error('[LMS] updateProgress error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Live Sessions ---

// GET /lms/my-sessions - Employee's live sessions
const getMySessions = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const staff = await Staff.findById(staffId);
        const departmentId = staff?.department;
        const query = { status: { $ne: 'Cancelled' } };

        const orConditions = [
            { assignmentType: 'All' },
            { assignedEmployees: staffId },
        ];
        if (departmentId) orConditions.push({ assignmentType: 'Department', departments: departmentId });
        query.$or = orConditions;

        const sessions = await LiveSession.find(query)
            .populate('trainerId', 'name')
            .populate('assignedEmployees', 'name')
            .sort({ dateTime: 1 });

        const sessionLogs = await SessionLog.find({ employeeId: staffId }).lean();
        const logMap = Object.fromEntries(sessionLogs.map(l => [String(l.sessionId), l]));

        const data = sessions.map(s => {
            const log = logMap[s._id.toString()];
            return {
                ...s.toObject(),
                mySessionLog: log,
                myAttendance: log,
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error('[LMS] getMySessions error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/sessions - Create session
const createSession = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const userId = req.user?._id;
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const staff = await Staff.findById(staffId);
        const {
            title, description, agenda, category, platform, meetingLink,
            dateTime, duration, assignmentType, departments, assignedEmployees,
        } = req.body;

        const session = await LiveSession.create({
            title,
            description,
            agenda,
            category: category || 'Normal Session',
            platform: platform || 'Google Meet',
            meetingLink,
            dateTime: dateTime ? new Date(dateTime) : new Date(),
            duration: duration || 60,
            assignmentType: assignmentType || 'All',
            departments: departments || [],
            assignedEmployees: assignedEmployees || [],
            trainerId: staffId,
            trainerName: staff?.name || 'Host',
            createdBy: userId,
            businessId: getBusinessId(req),
        });

        res.status(201).json({ success: true, data: session });
    } catch (err) {
        console.error('[LMS] createSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /lms/sessions/:id - Update session
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, agenda, dateTime, duration, meetingLink, status } = req.body;

        const session = await LiveSession.findByIdAndUpdate(id, {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(agenda !== undefined && { agenda }),
            ...(dateTime && { dateTime: new Date(dateTime) }),
            ...(duration !== undefined && { duration }),
            ...(meetingLink !== undefined && { meetingLink }),
            ...(status && { status }),
        }, { new: true });

        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true, data: session });
    } catch (err) {
        console.error('[LMS] updateSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /lms/sessions/:id
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await LiveSession.findByIdAndDelete(id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('[LMS] deleteSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/my-sessions/:id/join
const joinSession = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        await SessionLog.findOneAndUpdate(
            { sessionId: id, employeeId: staffId },
            { $set: { joinedAt: new Date(), left: false } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[LMS] joinSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/my-sessions/:id/leave
const leaveSession = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        const { feedbackSummary, issues, rating } = req.body || {};
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        await SessionLog.findOneAndUpdate(
            { sessionId: id, employeeId: staffId },
            { $set: { left: true, leftAt: new Date(), feedbackSummary, issues, rating } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[LMS] leaveSession error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Learning Engine ---

// GET /lms/learning-engine — heatmap from LearningActivity + QuizAttempt (match web/bb: show quiz & activity)
const getLearningEngine = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const start = new Date(Date.now() - 371 * 24 * 60 * 60 * 1000);
        const end = new Date();

        // Source 1: LearningActivity (if any explicit logging)
        const activities = await LearningActivity.find({
            employeeId: staffId,
            date: { $gte: start, $lte: end },
        }).sort({ date: 1 }).lean();

        // Source 2: Quiz attempts (practice quizzes) — same as bb AIQuiz submittedAt
        const quizAttempts = await QuizAttempt.find({
            employeeId: staffId,
            createdAt: { $gte: start, $lte: end },
        }).select('createdAt').lean();

        // Source 3: Course progress — contentProgress.viewedAt (days when user viewed content)
        const progressList = await CourseProgress.find({
            employeeId: staffId,
            'contentProgress.viewedAt': { $gte: start, $lte: end },
        }).select('contentProgress.viewedAt').lean();

        const toKey = (d) => d.toISOString().slice(0, 10);
        const byDate = new Map();
        const init = (key) => {
            if (!byDate.has(key)) byDate.set(key, { totalMinutes: 0, lessonsCompleted: 0, quizzesAttempted: 0, assessmentsAttempted: 0, liveSessionsAttended: 0 });
        };

        activities.forEach((a) => {
            const key = toKey(a.date);
            init(key);
            const e = byDate.get(key);
            e.totalMinutes += a.totalMinutes || 0;
            e.lessonsCompleted += a.lessonsCompleted || 0;
            e.quizzesAttempted += a.quizzesAttempted || 0;
            e.assessmentsAttempted += a.assessmentsAttempted || 0;
            e.liveSessionsAttended += a.liveSessionsAttended || 0;
        });

        quizAttempts.forEach((q) => {
            if (!q.createdAt) return;
            const key = toKey(q.createdAt);
            init(key);
            byDate.get(key).quizzesAttempted += 1;
        });

        progressList.forEach((p) => {
            (p.contentProgress || []).forEach((cp) => {
                if (cp.viewedAt) {
                    const key = toKey(cp.viewedAt);
                    if (key >= toKey(start) && key <= toKey(end)) {
                        init(key);
                        const e = byDate.get(key);
                        e.lessonsCompleted += 1;
                        e.totalMinutes = (e.totalMinutes || 0) + 5;
                    }
                }
            });
        });

        // Build heatmap array with activityScore (match bb: time*1 + lessons*10 + quizzes*15 + assessments*20 + live*20)
        const heatmap = Array.from(byDate.entries()).map(([date, agg]) => {
            const activityScore = (agg.totalMinutes || 0) * 1 + (agg.lessonsCompleted || 0) * 10 +
                (agg.quizzesAttempted || 0) * 15 + (agg.assessmentsAttempted || 0) * 20 + (agg.liveSessionsAttended || 0) * 20;
            return {
                date,
                totalMinutes: agg.totalMinutes || 0,
                lessonsCompleted: agg.lessonsCompleted || 0,
                quizzesAttempted: agg.quizzesAttempted || 0,
                assessmentsAttempted: agg.assessmentsAttempted || 0,
                liveSessionsAttended: agg.liveSessionsAttended || 0,
                activityScore,
            };
        });

        res.json({ success: true, heatmap });
    } catch (err) {
        console.error('[LMS] getLearningEngine error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Helper: compute due date from completionDuration and start date
function addDuration(startDate, duration) {
    if (!duration || !duration.value || !duration.unit) return null;
    const d = new Date(startDate);
    const v = Number(duration.value) || 0;
    switch (String(duration.unit)) {
        case 'Days': d.setDate(d.getDate() + v); break;
        case 'Weeks': d.setDate(d.getDate() + v * 7); break;
        case 'Months': d.setMonth(d.getMonth() + v); break;
        default: return null;
    }
    return d;
}

// GET /lms/analytics/my-scores
const getMyScores = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const progressList = await CourseProgress.find({ employeeId: staffId })
            .populate('courseId')
            .lean();

        const totalCourses = progressList.length;
        const completedCourses = progressList.filter(p => p.status === 'Completed').length;
        const inProgress = progressList.filter(p => p.status === 'In Progress').length;
        const overallScore = totalCourses > 0
            ? Math.round(progressList.reduce((s, p) => s + (p.completionPercentage || 0), 0) / totalCourses)
            : 0;

        const now = new Date();
        const courses = progressList.map(p => {
            const course = p.courseId;
            const start = p.createdAt ? new Date(p.createdAt) : new Date();
            const dueDate = course?.completionDuration ? addDuration(start, course.completionDuration) : null;
            const daysRemaining = dueDate
                ? Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                : null;
            return {
                courseId: course?._id,
                title: course?.title,
                status: p.status,
                progress: p.completionPercentage || 0,
                dueDate: dueDate || null,
                daysRemaining,
                completedAt: p.status === 'Completed' ? p.updatedAt : null,
                openedAt: p.lastAccessedAt || p.createdAt,
            };
        });

        const quizAttempts = await QuizAttempt.find({ employeeId: staffId })
            .populate('quizId')
            .lean();

        // By difficulty: total = unique quizzes, completed = those with at least one passed attempt
        const byDiff = { Easy: new Map(), Medium: new Map(), Hard: new Map() };
        for (const a of quizAttempts) {
            const qid = a.quizId?._id?.toString();
            if (!qid) continue;
            const diff = (a.quizId?.difficulty || 'Medium').trim();
            const key = byDiff[diff] || byDiff.Medium;
            if (!key.has(qid)) key.set(qid, { completed: false });
            if (a.passed !== undefined && a.passed !== null) key.get(qid).completed = true;
        }
        const toStat = (m) => {
            const total = m.size;
            const completed = [...m.values()].filter((x) => x.completed).length;
            return {
                total,
                completed,
                percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                beatsPercent: 0,
            };
        };

        const totalQuizzes = quizAttempts.length;
        const uniqueQuizzes = new Set(quizAttempts.map((a) => a.quizId?._id?.toString()).filter(Boolean));
        const completedQuizzes = [...uniqueQuizzes].filter((qid) =>
            quizAttempts.some((a) => a.quizId?._id?.toString() === qid && a.passed !== undefined && a.passed !== null)
        ).length;

        res.json({
            success: true,
            data: {
                summary: {
                    totalCourses,
                    completedCourses,
                    inProgress,
                    overallScore,
                    passedAssessments: completedQuizzes,
                    failedAssessments: uniqueQuizzes.size - completedQuizzes,
                },
                courses,
                quizStats: {
                    totalAssigned: uniqueQuizzes.size,
                    totalCompleted: completedQuizzes,
                    completionPercent: uniqueQuizzes.size > 0 ? Math.round((completedQuizzes / uniqueQuizzes.size) * 100) : 0,
                    easy: toStat(byDiff.Easy),
                    medium: toStat(byDiff.Medium),
                    hard: toStat(byDiff.Hard),
                },
            },
        });
    } catch (err) {
        console.error('[LMS] getMyScores error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- AI Quiz ---

// POST /lms/ai-quiz/generate
// Uses GEMINI_API_KEY from .env when available for AI-generated questions based on lesson content
const generateAIQuiz = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { courseId, lessonTitles, questionCount, difficulty, materialId } = req.body;
        if (!staffId || !courseId) return res.status(400).json({ success: false, message: 'Missing courseId' });

        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const count = Math.min(parseInt(questionCount, 10) || 5, 50);
        let questions = [];

        const course = await Course.findById(courseId).lean();
        const materials = course?.materials || course?.contents || [];
        const lessons = course?.lessons || [];
        const materialsList = materials.map((m, i) => ({
            _id: m._id,
            order: i + 1,
            type: m.type || 'URL',
            title: m.title || m.lessonTitle || 'Untitled',
            lessonTitle: m.lessonTitle || m.title,
            url: m.url || m.filePath || m.link,
            content: m.content || m.description || '',
        }));
        const relevanceFilter = lessonTitles?.length
            ? materialsList.filter((m) =>
                lessonTitles.some((t) =>
                    String(t || '').toLowerCase().includes(String(m.lessonTitle || '').toLowerCase()) ||
                    String(m.lessonTitle || '').toLowerCase().includes(String(t || '').toLowerCase())
                )
            )
            : materialsList;
        const materialFocus = materialId
            ? materialsList.find((m) => m._id && String(m._id) === String(materialId)) || relevanceFilter[0]
            : relevanceFilter[0];
        const focusList = materialFocus ? [materialFocus] : relevanceFilter.slice(0, 5);

        // Build lesson content for AI: course description, materials with content, lessons structure
        const contentParts = [];
        if (course?.description && String(course.description).trim()) {
            contentParts.push(`Course Description:\n${course.description.trim()}`);
        }
        const materialsWithContent = lessonTitles?.length ? relevanceFilter : materialsList;
        const lessonContentBlocks = [];
        for (const m of materialsWithContent) {
            const lessonTitle = m.lessonTitle || m.title || 'Course Materials';
            let block = `Lesson: ${lessonTitle}\nMaterial: ${m.title || 'Untitled'} (${m.type || 'URL'})`;
            if (m.content && String(m.content).trim()) {
                block += `\nContent:\n${m.content.trim()}`;
            }
            lessonContentBlocks.push(block);
        }
        if (lessonContentBlocks.length) {
            contentParts.push(`\nLesson Content:\n${lessonContentBlocks.join('\n\n')}`);
        }
        if (lessons && lessons.length) {
            const lessonTexts = lessons
                .filter((l) => !lessonTitles?.length || lessonTitles.some((t) => String(t).toLowerCase() === String(l.title || '').toLowerCase()))
                .map((l) => {
                    let t = `Lesson: ${l.title || 'Untitled'}`;
                    (l.materials || []).forEach((m) => {
                        t += `\n  - ${m.title || 'Material'}: ${(m.content || m.description || '').trim() || '(no text content)'}`;
                    });
                    return t;
                });
            if (lessonTexts.length) contentParts.push(`\nStructured Lessons:\n${lessonTexts.join('\n\n')}`);
        }
        const assessmentQs = course?.assessmentQuestions;
        if (assessmentQs && Array.isArray(assessmentQs)) {
            const topicHints = assessmentQs.flatMap((g) => (g.questions || []).map((q) => q.questionText || q.question)).filter(Boolean);
            if (topicHints.length) {
                contentParts.push(`\nKey Topics (from assessment): ${topicHints.slice(0, 10).join('; ')}`);
            }
        }
        const fullLessonContent = contentParts.join('\n') || `Course: ${course?.title || 'Unknown'}. Lessons: ${(lessonTitles || []).join(', ') || 'All'}`;

        if (geminiKey && geminiKey.trim()) {
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiKey });
                const prompt = `You are a quiz generator. Generate exactly ${count} quiz questions based ONLY on the following lesson content. Questions must test understanding of the concepts, facts, and topics in the content below. Return ONLY a valid JSON array. Each item: question, type ("multiple-choice" or "true-false"), options (4 for mc, ["True","False"] for tf), correctAnswer, points:1. Difficulty: ${difficulty || 'Medium'}.

LESSON CONTENT:
${fullLessonContent}

Return JSON array format: [{"question":"...","type":"multiple-choice","options":["A","B","C","D"],"correctAnswer":"A","points":1}]`;

                const response = await ai.models.generateContent({
                    model: geminiModel,
                    contents: prompt,
                    config: { maxOutputTokens: 2048 },
                });
                const text = response?.text?.trim?.() || '';
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        questions = parsed.slice(0, count).map((q, idx) => ({
                            question: String(q.question || '').trim() || `Question ${idx + 1}`,
                            type: ['multiple-choice', 'true-false'].includes(q.type) ? q.type : 'multiple-choice',
                            options: Array.isArray(q.options) ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
                            correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : (q.options && q.options[0] ? String(q.options[0]) : 'Option A'),
                            points: Math.max(1, parseInt(q.points, 10) || 1),
                        }));
                    }
                }
            } catch (geminiErr) {
                console.error('[LMS] generateAIQuiz Gemini error:', geminiErr);
            }
        }

        if (questions.length === 0) {
            for (let i = 0; i < count; i++) {
                questions.push({
                    question: `Sample question ${i + 1} from ${(lessonTitles || [course?.title || 'course']).join(', ')}`,
                    type: 'multiple-choice',
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correctAnswer: 'Option A',
                    points: 1,
                });
            }
        }

        const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);
        const quiz = await AIQuiz.create({
            courseId,
            employeeId: staffId,
            lessonTitles: lessonTitles || [],
            difficulty: difficulty || 'Medium',
            questionCount: questions.length,
            questions,
            totalPoints,
            passingScore: Math.ceil(totalPoints * 0.6),
            materialId,
        });

        res.status(201).json({ success: true, data: quiz });
    } catch (err) {
        console.error('[LMS] generateAIQuiz error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/ai-quiz/:id
const getAIQuiz = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        const quiz = await AIQuiz.findById(id).populate('courseId', 'title');
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
        if (String(quiz.employeeId) !== String(staffId)) return res.status(403).json({ success: false, message: 'Forbidden' });
        res.json({ success: true, data: quiz });
    } catch (err) {
        console.error('[LMS] getAIQuiz error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/ai-quiz/:id/submit
const submitAIQuiz = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id } = req.params;
        const { responses, completionTime } = req.body || {};

        const quiz = await AIQuiz.findById(id);
        if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
        if (String(quiz.employeeId) !== String(staffId)) return res.status(403).json({ success: false, message: 'Forbidden' });

        let earned = 0;
        const results = (responses || []).map((r, i) => {
            const q = quiz.questions[i];
            const correct = q && String(r.answer) === String(q.correctAnswer);
            if (correct) earned += q.points || 1;
            return { questionIndex: i, correct, answer: r.answer };
        });
        const totalPoints = quiz.questions.reduce((s, q) => s + (q.points || 1), 0);
        const passed = earned >= (quiz.passingScore || Math.ceil(totalPoints * 0.6));

        await QuizAttempt.create({
            quizId: quiz._id,
            employeeId: staffId,
            responses: responses || [],
            score: earned,
            totalPoints,
            passed,
            completionTime,
        });

        res.json({ success: true, data: { score: earned, passed, totalPoints, earnedPoints: earned } });
    } catch (err) {
        console.error('[LMS] submitAIQuiz error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /lms/courses/:id/assessment/submit - Submit final assessment
const submitCourseAssessment = async (req, res) => {
    try {
        const staffId = getStaffId(req);
        const { id: courseId } = req.params;
        const { answers } = req.body || {};
        if (!staffId || !courseId) return res.status(400).json({ success: false, message: 'Missing courseId' });

        const course = await Course.findById(courseId).lean();
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        const assessmentQuestions = course.assessmentQuestions;
        if (!assessmentQuestions || !Array.isArray(assessmentQuestions)) {
            return res.status(400).json({ success: false, message: 'No assessment questions for this course' });
        }

        const flatQuestions = assessmentQuestions.flatMap((g) =>
            (g.questions || []).map((q) => ({ ...q, lessonTitle: g.lessonTitle }))
        );
        if (flatQuestions.length === 0) {
            return res.status(400).json({ success: false, message: 'No assessment questions' });
        }

        const answerMap = {};
        for (const a of answers || []) {
            if (a.questionId && Array.isArray(a.answers)) {
                answerMap[a.questionId] = a.answers;
            }
        }

        let totalMarks = 0;
        let earnedMarks = 0;
        const questionResults = [];

        for (const q of flatQuestions) {
            const qId = q.id ?? q._id?.toString();
            const marks = q.marks || 1;
            totalMarks += marks;
            const userAnswers = answerMap[qId] || [];
            const correctStrs = Array.isArray(q.correctAnswers)
                ? q.correctAnswers.map(String).sort()
                : [String(q.correctAnswers ?? '')];
            const userStrs = userAnswers.map(String).filter(Boolean).sort();
            const isCorrect = correctStrs.length === userStrs.length &&
                correctStrs.every((c, i) => (userStrs[i] ?? '') === c);
            if (isCorrect) earnedMarks += marks;
            questionResults.push({
                questionId: qId,
                correctAnswer: correctStrs.length === 1 ? correctStrs[0] : correctStrs,
                userAnswer: userStrs.length === 1 ? userStrs[0] : userStrs,
                isCorrect,
                marksAwarded: isCorrect ? marks : 0,
                marksTotal: marks,
            });
        }

        const passingScore = course.qualificationScore || 80;
        const score = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;
        const passed = score >= passingScore;

        const progress = await CourseProgress.findOne({ courseId, employeeId: staffId });
        if (progress) {
            progress.assessmentStatus = passed ? 'Passed' : 'Failed';
            progress.assessmentScore = score;
            progress.assessmentAttempts = (progress.assessmentAttempts || 0) + 1;
            if (passed) progress.status = 'Completed';
            await progress.save();
        }

        res.json({
            success: true,
            data: {
                score,
                passed,
                totalPoints: totalMarks,
                earnedPoints: earnedMarks,
                questionResults,
            },
        });
    } catch (err) {
        console.error('[LMS] submitCourseAssessment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Departments & Employees (for schedule modal) ---

// GET /lms/departments
const getDepartments = async (req, res) => {
    try {
        const departments = await Staff.distinct('department').then(arr =>
            arr.filter(Boolean).map(name => ({ _id: name, name }))
        );
        res.json({ success: true, data: { departments } });
    } catch (err) {
        console.error('[LMS] getDepartments error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/employees
const getEmployees = async (req, res) => {
    try {
        const staff = await Staff.find({ status: 'Active' })
            .select('name email')
            .limit(1000)
            .lean();
        res.json({ success: true, data: { staff } });
    } catch (err) {
        console.error('[LMS] getEmployees error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /lms/categories
const getCategories = async (req, res) => {
    const categories = ['Development', 'Business', 'Design', 'Marketing', 'IT & Software', 'Personal Development', 'GENERAL'];
    res.json({ success: true, data: categories });
};

module.exports = {
    getAllCourses,
    enrollCourse,
    getMyCourses,
    getCourseDetails,
    getMyProgress,
    completeLesson,
    updateProgress,
    getMySessions,
    createSession,
    updateSession,
    deleteSession,
    joinSession,
    leaveSession,
    getLearningEngine,
    getMyScores,
    generateAIQuiz,
    getAIQuiz,
    submitAIQuiz,
    getDepartments,
    getEmployees,
    getCategories,
    submitCourseAssessment,
};
