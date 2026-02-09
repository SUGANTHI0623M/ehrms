import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, Steps, Form, Input, InputNumber, Select, Switch, Button,
    Upload, Card, Row, Col, Space, Tag, Typography, Divider, message,
    List, Badge, Tooltip, Empty, Collapse, Avatar, AutoComplete, Progress
} from 'antd';
import {
    CloudUploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    InfoCircleOutlined, PlayCircleOutlined, FilePdfOutlined, YoutubeOutlined,
    GlobalOutlined, ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined,
    CheckCircleOutlined, DragOutlined, ArrowUpOutlined, ArrowDownOutlined,
    EyeOutlined, CloseOutlined, VideoCameraOutlined, LinkOutlined,
    FileTextOutlined, TeamOutlined, UserOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { lmsService } from '@/services/lmsService';
import { getFileUrl } from '@/utils/url';

const { Title, Text, Paragraph } = Typography;
const Strong = (props: any) => <Text strong {...props} />;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { Panel } = Collapse;

// --- Constants & Types ---
const PRIMARY_COLOR = '#1D9B51'; // Matching HRMS Green
const CONTENT_TYPE_MAP: Record<string, string> = {
    Video: 'VIDEO',
    YouTube: 'YOUTUBE',
    PDF: 'PDF',
    'External URL': 'URL'
};
const MATERIAL_TYPE_OPTIONS = [
    { value: 'Video', label: 'MP4 Video', icon: VideoCameraOutlined },
    { value: 'YouTube', label: 'YouTube Video', icon: YoutubeOutlined },
    { value: 'PDF', label: 'PDF Document', icon: FilePdfOutlined },
    { value: 'External URL', label: 'Embedded Website/URL', icon: GlobalOutlined },
] as const;
const VIDEO_SIZE_LIMIT_GB = 1;
const PDF_SIZE_LIMIT_MB = 50;

/** Extract a clean material title from a file name (PDF or video). */
function cleanFileNameToTitle(fileName: string): string {
    const withoutExt = fileName.replace(/\.(pdf|mp4|webm|mov|mkv)$/i, '').trim();
    const withSpaces = withoutExt.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return withSpaces.replace(/\b\w/g, (c) => c.toUpperCase()) || fileName;
}

/** Ensure we have a File for upload (FormData/API often expect File; Blob is supported by converting). */
function toFile(file: File | Blob, defaultName: string): File {
    return file instanceof File ? file : new File([file], defaultName, { type: file.type || 'application/octet-stream' });
}

/** Fetch material title from YouTube or normal URL via backend (avoids CORS). Falls back to null if endpoint not available. */
async function fetchMaterialTitleFromUrl(url: string): Promise<string | null> {
    try {
        const fn = (lmsService as { getMaterialTitle?: (u: string) => Promise<string | null> }).getMaterialTitle;
        return fn ? await fn.call(lmsService, url) : null;
    } catch {
        return null;
    }
}



interface LessonMaterial {
    id: string;
    title: string;
    contentType: 'Video' | 'YouTube' | 'PDF' | 'External URL' | '';
    url?: string;
    subtitleUrl?: string;
    file?: File;
    fileName?: string;
    publicId?: string;
    format?: string;
    provider?: string;
}

interface AssessmentQuestion {
    id: string;
    type: 'MCQ' | 'Multiple Correct' | 'True / False' | 'Short Answer';
    questionText: string;
    options: string[];
    correctAnswers: string[];
    marks: number;
}

interface Lesson {
    id: string;
    title: string; // Lesson Group Title
    materials: LessonMaterial[];
    questions: AssessmentQuestion[];
}

interface CourseFormProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: any;
}

const CourseFormWizard: React.FC<CourseFormProps> = ({ open, onClose, onSuccess, initialData }) => {
    const [form] = Form.useForm();
    const [inlineLessonForm] = Form.useForm();
    const thumbnailInputRef = useRef<HTMLInputElement>(null);

    // Steps & Loading
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Step 1 Data (Org Data)
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [categories, setCategories] = useState<{ id?: string, value: string }[]>([]);
    const [languages, setLanguages] = useState<{ id?: string, value: string }[]>([]);
    const [categorySearchValue, setCategorySearchValue] = useState('');
    const [languageSearchValue, setLanguageSearchValue] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [creatingLanguage, setCreatingLanguage] = useState(false);
    const [fetchingOrg, setFetchingOrg] = useState(false);

    // Course State
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

    const [previewOpen, setPreviewOpen] = useState(false);
    const [assessmentMode, setAssessmentMode] = useState<boolean>(false);

    const [materialPreview, setMaterialPreview] = useState<{
        visible: boolean;
        type: 'video' | 'pdf' | 'youtube' | 'iframe' | null;
        url: string;
        title: string;
        subtitleUrl?: string;
    }>({
        visible: false,
        type: null,
        url: '',
        title: ''
    });
    const previewBlobUrlRef = useRef<string | null>(null);

    // Step 2 Data (Lessons)
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isAddingLesson, setIsAddingLesson] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [activeLessonType, setActiveLessonType] = useState<string>(''); // For dynamic input rendering
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    // Live progress when uploading material files on lesson save
    const [materialSaveUploadProgress, setMaterialSaveUploadProgress] = useState<{
        visible: boolean;
        perFile: Record<number, number>;
        fileNames: Record<number, string>;
        totalFiles: number;
    }>({ visible: false, perFile: {}, fileNames: {}, totalFiles: 0 });
    // Keep File refs for materials so they are not lost between save and submit (React state can lose File refs)
    const savedMaterialFilesRef = useRef<Map<string, { mIndex: number; file: File | Blob; fileName: string }[]>>(new Map());
    // Capture file as soon as user selects in Upload (form value can be missing); key = material index in Form.List
    const pendingMaterialFilesRef = useRef<Map<number, { file: File | Blob; fileName: string }>>(new Map());
    /** Snapshot of the lesson when we started editing; restored on cancel so existing materials are not lost */
    const editingLessonSnapshotRef = useRef<Lesson | null>(null);
    const [dragOverMaterialIndex, setDragOverMaterialIndex] = useState<number | null>(null);
    const [fetchingMaterialTitle, setFetchingMaterialTitle] = useState<number | null>(null); // material index (YouTube or External URL)

    const isEditMode = !!initialData?._id;

    // --- Effects ---
    useEffect(() => {
        if (open) {
            fetchOrgData();
            if (initialData) {
                // Populate Form for Editing
                const duration = initialData.completionDuration || {};
                const liveAssessment = initialData.isLiveAssessment || false;
                setAssessmentMode(liveAssessment);

                form.setFieldsValue({
                    title: initialData.title,
                    description: initialData.description,
                    categories: Array.isArray(initialData.categories) ? initialData.categories : (initialData.category ? [initialData.category] : []),
                    languages: Array.isArray(initialData.languages) ? initialData.languages : (initialData.language ? [initialData.language] : []),
                    isMandatory: initialData.isMandatory || false,
                    completionTimeValue: duration.value,
                    completionTimeUnit: duration.unit,
                    isLiveAssessment: liveAssessment,
                    qualificationScore: initialData.qualificationScore || 80,
                    assignmentType: initialData.assignmentType === 'DEPARTMENT' ? 'By Department' :
                        initialData.assignmentType === 'INDIVIDUAL' ? 'To Individuals' :
                            initialData.assignmentType === 'NONE' ? 'Don\'t assign to anyone' : 'All Employees',
                    departments: (initialData.departments || []).map((d: any) => typeof d === 'string' ? d : d?._id).filter(Boolean),
                    employees: (initialData.assignedEmployees || []).map((e: any) => typeof e === 'string' ? e : e?._id).filter(Boolean)
                });

                setThumbnailPreview(getFileUrl(initialData.thumbnailUrl) || '');

                // Populate Lessons
                let loadedLessons: Lesson[] = [];

                if (initialData.lessons && Array.isArray(initialData.lessons) && initialData.lessons.length > 0) {
                    // 1. New Structured Logic (Prefer this)
                    console.log('[CourseFormWizard] Prefilling from structured lessons');
                    loadedLessons = initialData.lessons.map((l: any) => ({
                        id: l._id || Math.random().toString(36).substr(2, 9),
                        title: l.title,
                        materials: (l.materials || []).map((m: any) => {
                            let typeLabel: LessonMaterial['contentType'] = 'External URL';
                            if (m.type === 'VIDEO') typeLabel = 'Video';
                            else if (m.type === 'YOUTUBE') typeLabel = 'YouTube';
                            else if (m.type === 'PDF') typeLabel = 'PDF';
                            else if (m.type === 'URL' && m.content) typeLabel = 'External URL';

                            return {
                                id: m._id || Math.random().toString(36).substr(2, 9),
                                title: m.title,
                                contentType: typeLabel,
                                url: m.url || m.filePath || '',
                                subtitleUrl: m.subtitleUrl,
                                publicId: m.publicId,
                                format: m.format,
                                provider: (m.url || m.filePath) && (m.url || m.filePath).includes('cloudinary.com') ? 'cloudinary' : (m.provider || 'local')
                            };
                        }),
                        questions: l.questions || []
                    }));
                } else {
                    // 2. Legacy Grouping Logic (Keep for backward compatibility)
                    console.log('[CourseFormWizard] Prefilling from legacy materials grouping');
                    const groupedMap: Record<string, LessonMaterial[]> = {};
                    (initialData.materials || []).forEach((m: any) => {
                        const lTitle = m.lessonTitle || 'General';
                        let typeLabel: LessonMaterial['contentType'] = 'External URL';
                        if (m.type === 'VIDEO') typeLabel = 'Video';
                        else if (m.type === 'YOUTUBE') typeLabel = 'YouTube';
                        else if (m.type === 'PDF') typeLabel = 'PDF';
                        else if (m.type === 'URL' && m.content) typeLabel = 'External URL';

                        if (!groupedMap[lTitle]) groupedMap[lTitle] = [];
                        groupedMap[lTitle].push({
                            id: m._id || Math.random().toString(36).substr(2, 9),
                            title: m.title,
                            contentType: typeLabel,
                            url: m.url || m.filePath,
                            subtitleUrl: m.subtitleUrl,
                            publicId: m.publicId,
                            format: m.format,
                            provider: m.url && m.url.includes('cloudinary.com') ? 'cloudinary' : (m.provider || 'local')
                        });
                    });

                    loadedLessons = Object.entries(groupedMap).map(([title, materials]) => {
                        const lessonQuestions = (initialData.assessmentQuestions || []).find((aq: any) => aq.lessonTitle === title)?.questions || [];
                        return {
                            id: Math.random().toString(36).substr(2, 9),
                            title: title,
                            materials: materials,
                            questions: lessonQuestions
                        };
                    });
                }
                setLessons(loadedLessons);
                setIsAddingLesson(false);
                setEditingLessonId(null);
            } else {
                // Reset only when creating (no initialData). When editing, don't reset so we don't overwrite with "None"
                if (!initialData?._id) {
                    form.resetFields();
                    setAssessmentMode(false);
                    setThumbnailPreview('');
                    setLessons([]);
                    setThumbnailFile(null);
                    setCurrentStep(0);
                    setIsAddingLesson(false);
                    setEditingLessonId(null);
                    savedMaterialFilesRef.current.clear();
                    pendingMaterialFilesRef.current.clear();
                }
            }
        }
    }, [open, initialData]);

    // Cleanup object URLs to prevent leaks
    useEffect(() => {
        return () => {
            if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
                URL.revokeObjectURL(thumbnailPreview);
            }
        };
    }, [thumbnailPreview]);

    const handleCreateMetaOption = async (type: 'CATEGORY' | 'LANGUAGE', value: string) => {
        if (!value || value.trim().length < 2) return;

        const trimmedValue = value.trim();
        const existingList = type === 'CATEGORY' ? categories : languages;

        // Case-insensitive duplicate check
        const isDuplicate = existingList.some(item => item.value.toLowerCase() === trimmedValue.toLowerCase());
        if (isDuplicate) {
            const existingItem = existingList.find(item => item.value.toLowerCase() === trimmedValue.toLowerCase());
            if (existingItem) {
                if (type === 'CATEGORY') {
                    const current = form.getFieldValue('categories') || [];
                    if (!current.includes(existingItem.value)) form.setFieldValue('categories', [...current, existingItem.value]);
                } else {
                    const current = form.getFieldValue('languages') || [];
                    if (!current.includes(existingItem.value)) form.setFieldValue('languages', [...current, existingItem.value]);
                }
            }
            return;
        }

        if (type === 'CATEGORY') setCreatingCategory(true);
        else setCreatingLanguage(true);
        try {
            const res = await lmsService.createMetaOption(type, trimmedValue);
            if (res?.success && res?.data) {
                const id = res.data.id != null ? String(res.data.id) : undefined;
                const newItem = { id, value: res.data.value };
                if (type === 'CATEGORY') {
                    setCategories(prev => [...prev, newItem].sort((a, b) => a.value.localeCompare(b.value)));
                    const current = form.getFieldValue('categories') || [];
                    if (!current.includes(newItem.value)) form.setFieldValue('categories', [...current, newItem.value]);
                    setCategorySearchValue('');
                } else {
                    setLanguages(prev => [...prev, newItem].sort((a, b) => a.value.localeCompare(b.value)));
                    const current = form.getFieldValue('languages') || [];
                    if (!current.includes(newItem.value)) form.setFieldValue('languages', [...current, newItem.value]);
                    setLanguageSearchValue('');
                }
                message.success(`${type === 'CATEGORY' ? 'Category' : 'Language'} created successfully`);
            }
        } catch (error: any) {
            console.error('Failed to create meta option:', error);
            const errData = error.response?.data;
            const errMsg = errData?.error?.message ?? errData?.message ?? error.message ?? `Failed to create ${type.toLowerCase()}.`;
            message.error(errMsg);
        } finally {
            setCreatingCategory(false);
            setCreatingLanguage(false);
        }
    };

    const handleDeleteMetaOption = async (e: React.MouseEvent, type: 'CATEGORY' | 'LANGUAGE', id: string, name: string) => {
        e.stopPropagation();
        Modal.confirm({
            title: `Delete ${type.toLowerCase()}`,
            content: `Are you sure you want to delete "${name}"? This will remove it from the system-wide options.`,
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    const res = await lmsService.deleteMetaOption(id);
                    if (res.success) {
                        if (type === 'CATEGORY') {
                            setCategories(prev => prev.filter(c => c.id !== id));
                            const current = form.getFieldValue('categories') || [];
                            form.setFieldValue('categories', current.filter((v: string) => v !== name));
                        } else {
                            setLanguages(prev => prev.filter(l => l.id !== id));
                            const current = form.getFieldValue('languages') || [];
                            form.setFieldValue('languages', current.filter((v: string) => v !== name));
                        }
                        message.success(`${type === 'CATEGORY' ? 'Category' : 'Language'} deleted`);
                    }
                } catch (error: any) {
                    const errData = error.response?.data;
                    const errMsg = errData?.error?.message ?? errData?.message ?? error.message ?? 'Failed to delete';
                    message.error(errMsg);
                }
            }
        });
    };

    const fetchOrgData = async () => {
        setFetchingOrg(true);
        const errors: string[] = [];
        try {
            const [deptResult, empResult, catResult, langResult] = await Promise.allSettled([
                lmsService.getDepartments(),
                lmsService.getEmployees(),
                lmsService.getMetaOptions('CATEGORY'),
                lmsService.getMetaOptions('LANGUAGE')
            ]);

            if (deptResult.status === 'fulfilled') {
                setDepartments(deptResult.value?.data?.departments ?? []);
            } else {
                const msg = (deptResult.reason?.response?.data?.error?.message ?? deptResult.reason?.response?.data?.message ?? deptResult.reason?.message) || 'Departments';
                errors.push(`Departments: ${msg}`);
                setDepartments([]);
            }

            if (empResult.status === 'fulfilled') {
                setEmployees(empResult.value?.data?.staff ?? []);
            } else {
                const msg = (empResult.reason?.response?.data?.error?.message ?? empResult.reason?.response?.data?.message ?? empResult.reason?.message) || 'Employees';
                errors.push(`Employees: ${msg}`);
                setEmployees([]);
            }

            const dbCategories: { id?: string; value: string }[] = catResult.status === 'fulfilled' && Array.isArray(catResult.value?.data)
                ? (catResult.value.data as any[]).map((c: any) => ({ id: c.id, value: c.value }))
                : [];
            if (catResult.status === 'rejected') {
                const msg = (catResult.reason?.response?.data?.error?.message ?? catResult.reason?.response?.data?.message ?? catResult.reason?.message) || 'Categories';
                errors.push(`Categories: ${msg}`);
            }
            setCategories(dbCategories.sort((a, b) => a.value.localeCompare(b.value)));

            const dbLanguages: { id?: string; value: string }[] = langResult.status === 'fulfilled' && Array.isArray(langResult.value?.data)
                ? (langResult.value.data as any[]).map((l: any) => ({ id: l.id, value: l.value }))
                : [];
            if (langResult.status === 'rejected') {
                const msg = (langResult.reason?.response?.data?.error?.message ?? langResult.reason?.response?.data?.message ?? langResult.reason?.message) || 'Languages';
                errors.push(`Languages: ${msg}`);
            }
            setLanguages(dbLanguages.sort((a, b) => a.value.localeCompare(b.value)));

            if (errors.length > 0) {
                console.warn('[fetchOrgData] Some requests failed:', errors);
                message.warning(`Some data could not be loaded: ${errors.join('; ')}.`);
            }
        } catch (error: any) {
            console.error('[fetchOrgData] Error:', error);
            const errMsg = error?.response?.data?.error?.message ?? error?.response?.data?.message ?? error?.message ?? 'Unknown error';
            message.error(`Failed to fetch organization data: ${errMsg}`);
            setDepartments([]);
            setEmployees([]);
            setCategories([]);
            setLanguages([]);
        } finally {
            setFetchingOrg(false);
        }
    };

    // --- Logic: Step 1 (Course Details) ---
    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must be smaller than 2MB!');
            return;
        }

        if (!file.type.startsWith('image/')) {
            message.error('Selection must be a valid image format!');
            return;
        }

        setThumbnailFile(file);
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setThumbnailPreview(URL.createObjectURL(file));

        // Reset input value to allow re-selecting same file if needed
        e.target.value = '';
    };

    const removeThumbnail = (e: React.MouseEvent) => {
        e.stopPropagation();
        setThumbnailFile(null);
        if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
        setThumbnailPreview('');
    };

    const normFile = (e: any) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    /** Upload a material file immediately to Cloudinary. ONLY used when editing an existing course; new course defers upload until Publish/Save as Draft. */
    const uploadingMaterialRef = useRef<Set<number>>(new Set());
    const uploadMaterialImmediately = async (name: number, file: File | Blob, type: 'Video' | 'PDF') => {
        if (!isEditMode) return; // Never upload immediately when creating new course; only when editing existing course
        const materialId = inlineLessonForm.getFieldValue(['materials', name, 'id']) || `temp-${name}`;
        if (uploadingMaterialRef.current.has(name)) return;
        uploadingMaterialRef.current.add(name);
        setUploadProgress((prev) => ({ ...prev, [materialId]: 0 }));
        const apiType = type === 'Video' ? 'VIDEO' : 'PDF';
        const fileName = file instanceof File ? file.name : type === 'Video' ? 'video.mp4' : 'document.pdf';
        const titleFromFile = cleanFileNameToTitle(fileName);
        try {
            const res = await lmsService.uploadMaterial(toFile(file, fileName), apiType, (percent) => {
                setUploadProgress((prev) => ({ ...prev, [materialId]: percent }));
            });
            if (res?.success && res?.data) {
                const materials = inlineLessonForm.getFieldValue('materials') || [];
                const next = materials.map((m: any, i: number) =>
                    i === name
                        ? {
                            ...m,
                            url: res.data.url,
                            publicId: res.data.publicId,
                            format: res.data.format,
                            provider: 'cloudinary',
                            title: m.title || titleFromFile,
                            file: [],
                            fileName
                        }
                        : m
                );
                inlineLessonForm.setFieldsValue({ materials: next });
                if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                    inlineLessonForm.setFieldValue('title', titleFromFile);
                }
                pendingMaterialFilesRef.current.delete(name);
                message.success(`${type === 'Video' ? 'Video' : 'PDF'} uploaded — you can edit the title below`);
            } else {
                const errMsg = (res as any)?.error?.message || (res as any)?.message || 'Upload failed';
                message.error(errMsg);
            }
        } catch (e: any) {
            const errMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? 'Upload failed';
            message.error(errMsg);
        } finally {
            uploadingMaterialRef.current.delete(name);
            setUploadProgress((prev) => ({ ...prev, [materialId]: 100 }));
            setTimeout(() => setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[materialId];
                return next;
            }), 500);
        }
    };

    /** Subtitle upload: same rule as materials — only immediately when editing existing course. */
    const uploadingSubtitleRef = useRef<Set<number>>(new Set());
    const uploadSubtitleImmediately = async (name: number, file: File) => {
        if (!isEditMode) return; // Defer until Publish/Save as Draft when creating new course
        const materialId = inlineLessonForm.getFieldValue(['materials', name, 'id']) || `temp-${name}`;
        const progressKey = `subtitle-${materialId}`;
        if (uploadingSubtitleRef.current.has(name)) return;
        uploadingSubtitleRef.current.add(name);
        setUploadProgress((prev) => ({ ...prev, [progressKey]: 0 }));
        try {
            const res = await lmsService.uploadMaterial(file, 'SUBTITLE', (percent) => {
                setUploadProgress((prev) => ({ ...prev, [progressKey]: percent }));
            });
            if (res?.success && res?.data?.url) {
                const materials = inlineLessonForm.getFieldValue('materials') || [];
                const next = materials.map((m: any, i: number) =>
                    i === name ? { ...m, subtitleUrl: res.data.url } : m
                );
                inlineLessonForm.setFieldsValue({ materials: next });
                message.success('Subtitle (.vtt) uploaded');
            } else {
                message.error((res as any)?.error?.message || 'Subtitle upload failed');
            }
        } catch (e: any) {
            message.error(e?.response?.data?.error?.message || e?.message || 'Subtitle upload failed');
        } finally {
            uploadingSubtitleRef.current.delete(name);
            setUploadProgress((prev) => ({ ...prev, [progressKey]: 100 }));
            setTimeout(() => setUploadProgress((prev) => {
                const next = { ...prev };
                delete next[progressKey];
                return next;
            }), 500);
        }
    };

    // --- Logic: Step 2 (Curriculum) ---
    const startAddLesson = () => {
        setIsAddingLesson(true);
        setEditingLessonId(null);
        pendingMaterialFilesRef.current.clear();
        inlineLessonForm.resetFields();
        inlineLessonForm.setFieldsValue({
            title: '',
            materials: [{ id: Math.random().toString(36).substr(2, 9), contentType: '', file: [], url: '', title: '' }]
        });
    };

    const startEditLesson = (lesson: Lesson) => {
        setIsAddingLesson(true);
        setEditingLessonId(lesson.id);
        pendingMaterialFilesRef.current.clear();
        // Snapshot current lesson so we can restore it on cancel (existing materials must stay until Save)
        editingLessonSnapshotRef.current = {
            id: lesson.id,
            title: lesson.title,
            materials: lesson.materials.map(m => ({ ...m, id: m.id || Math.random().toString(36).substr(2, 9) })),
            questions: (lesson.questions || []).map(q => ({ ...q }))
        };
        const materialsWithFilePlaceholder = lesson.materials.map(m => ({
            ...m,
            id: m.id || Math.random().toString(36).substr(2, 9),
            title: m.title ?? '',
            url: (m as any).url ?? '',
            subtitleUrl: (m as any).subtitleUrl,
            contentType: (m.contentType || '') as LessonMaterial['contentType'],
            file: [], // restored from ref below if we have pending files for this lesson
            content: (m as any).content
        }));
        inlineLessonForm.setFieldsValue({
            title: lesson.title,
            materials: materialsWithFilePlaceholder,
            questions: (lesson.questions || []).map(q => {
                if (q.type === 'MCQ' || q.type === 'Multiple Correct') {
                    const indices = q.correctAnswers.map(ans => {
                        const idx = q.options.indexOf(ans);
                        return idx !== -1 ? idx.toString() : null;
                    }).filter(idx => idx !== null) as string[];

                    return {
                        ...q,
                        correctAnswers: q.type === 'MCQ' ? indices[0] : indices
                    };
                }
                if (q.type === 'True / False') {
                    return {
                        ...q,
                        correctAnswers: q.correctAnswers[0] || 'True'
                    };
                }
                if (q.type === 'Short Answer') {
                    return {
                        ...q,
                        correctAnswers: q.correctAnswers[0] || ''
                    };
                }
                return q;
            })
        });
        // Restore pending files from ref so "File selected" shows when editing a lesson saved with unsaved files (new course flow)
        const refFiles = savedMaterialFilesRef.current.get(lesson.id);
        if (refFiles && refFiles.length > 0) {
            const currentMaterials = inlineLessonForm.getFieldValue('materials') || [];
            const updated = currentMaterials.map((m: any, i: number) => {
                const refEntry = refFiles.find(e => e.mIndex === i);
                if (refEntry && (refEntry.file instanceof File || refEntry.file instanceof Blob)) {
                    pendingMaterialFilesRef.current.set(i, { file: refEntry.file, fileName: refEntry.fileName });
                    return { ...m, file: [{ originFileObj: refEntry.file, name: refEntry.fileName }] };
                }
                return m;
            });
            inlineLessonForm.setFieldsValue({ materials: updated });
        }
    };

    const cancelLessonEdit = () => {
        const lessonIdToRestore = editingLessonId;
        const snapshot = editingLessonSnapshotRef.current;
        editingLessonSnapshotRef.current = null;
        setIsAddingLesson(false);
        setEditingLessonId(null);
        inlineLessonForm.resetFields();
        // Restore lesson in state from snapshot so existing materials are not lost when user cancels without saving
        if (lessonIdToRestore && snapshot) {
            setLessons(prev => prev.map(l => l.id === lessonIdToRestore ? snapshot : l));
        }
    };

    // Helper for extracting raw file from AntD Upload or internal state
    const extractRawFile = (val: any): File | Blob | null => {
        if (!val) return null;
        if (val instanceof File || val instanceof Blob) return val;
        if (Array.isArray(val) && val.length > 0) {
            const first = val[0];
            return (first && (first.originFileObj || first)) || null;
        }
        if (val.fileList && Array.isArray(val.fileList) && val.fileList.length > 0) {
            const first = val.fileList[0];
            return (first && (first.originFileObj || first)) || null;
        }
        if (val.file) return val.file.originFileObj || val.file;
        return null;
    };

    const saveInlineLesson = async () => {
        try {
            const values = await inlineLessonForm.validateFields();
            const materialsArray = Array.isArray(values.materials) ? values.materials : [];
            if (materialsArray.length === 0) {
                message.warning('Add at least one material');
                return;
            }

            let processedMaterials = materialsArray.map((m: any, matIndex: number) => {
                const isFileMaterial = m.contentType === 'Video' || m.contentType === 'PDF';
                let uploadedFile: File | Blob | null = null;
                let fileNameFromPending: string | undefined;
                if (isFileMaterial) {
                    const formFile = inlineLessonForm.getFieldValue(['materials', matIndex, 'file']);
                    uploadedFile = extractRawFile(formFile ?? m.file);
                    if (!uploadedFile) {
                        const pending = pendingMaterialFilesRef.current.get(matIndex);
                        if (pending) {
                            uploadedFile = pending.file;
                            fileNameFromPending = pending.fileName;
                        }
                    }
                    if (!uploadedFile && m.file) {
                        uploadedFile = extractRawFile(m.file);
                    }
                } else {
                    uploadedFile = extractRawFile(m.file);
                }

                let processedUrl = m.url || '';
                if (m.contentType === 'YouTube' && processedUrl.includes('<iframe')) {
                    const match = processedUrl.match(/src="([^"]+)"/);
                    if (match) processedUrl = match[1];
                }

                return {
                    id: m.id || Math.random().toString(36).substr(2, 9),
                    title: m.title,
                    contentType: m.contentType,
                    url: processedUrl,
                    subtitleUrl: m.subtitleUrl,
                    file: uploadedFile,
                    fileName: fileNameFromPending || (uploadedFile instanceof File ? uploadedFile.name : undefined) || m.fileName,
                    publicId: m.publicId,
                    format: m.format,
                    provider: m.provider,
                    content: m.content?.trim?.() || undefined,
                    description: m.description?.trim?.() || undefined,
                };
            });

            // Upload Video/PDF to Cloudinary ONLY when EDITING an existing course. New course: no upload here — files stay in state until Publish/Save as Draft.
            const hasFile = (m: any, matIndex: number) => {
                if (m.url?.includes('cloudinary.com')) return false;
                if (m.file instanceof File || m.file instanceof Blob) return true;
                if (pendingMaterialFilesRef.current.get(matIndex)?.file) return true;
                const formFile = inlineLessonForm.getFieldValue(['materials', matIndex, 'file']);
                return !!(extractRawFile(formFile));
            };
            const toUpload = processedMaterials
                .map((m, matIndex) => ({ m, matIndex }))
                .filter(({ m, matIndex }) => (m.contentType === 'Video' || m.contentType === 'PDF') && hasFile(m, matIndex));
            if (isEditMode && toUpload.length > 0) {
                const initialPerFile = toUpload.reduce((acc, { matIndex }) => ({ ...acc, [matIndex]: 0 }), {} as Record<number, number>);
                const fileNames = toUpload.reduce(
                    (acc, { m, matIndex }) => ({ ...acc, [matIndex]: (m.fileName as string) || (m.file instanceof File ? (m.file as File).name : `File ${matIndex + 1}`) }),
                    {} as Record<number, string>
                );
                setMaterialSaveUploadProgress({ visible: true, perFile: initialPerFile, fileNames, totalFiles: toUpload.length });
                try {
                    const results = await Promise.all(
                        toUpload.map(async ({ m, matIndex }) => {
                            try {
                                const type = m.contentType === 'Video' ? 'VIDEO' : 'PDF';
                                let fileToSend: File | Blob | null = m.file instanceof File || m.file instanceof Blob ? m.file : null;
                                if (!fileToSend) {
                                    fileToSend = pendingMaterialFilesRef.current.get(matIndex)?.file ?? null;
                                }
                                if (!fileToSend) {
                                    const formVal = inlineLessonForm.getFieldValue(['materials', matIndex, 'file']);
                                    fileToSend = extractRawFile(formVal);
                                }
                                if (!fileToSend || !(fileToSend instanceof File || fileToSend instanceof Blob)) {
                                    message.error(`No valid file for material ${matIndex + 1}. Please select the file again.`);
                                    return { matIndex, url: null };
                                }
                                const fileForUpload = toFile(fileToSend, fileToSend instanceof File ? fileToSend.name : type === 'VIDEO' ? 'video.mp4' : 'document.pdf');
                                const res = await lmsService.uploadMaterial(fileForUpload, type, (percent) => {
                                    setMaterialSaveUploadProgress((prev) => ({
                                        ...prev,
                                        perFile: { ...prev.perFile, [matIndex]: percent }
                                    }));
                                });
                                if (res?.success && res?.data) {
                                    return { matIndex, url: res.data.url, publicId: res.data.publicId, format: res.data.format };
                                }
                                const errMsg = (res as any)?.error?.message || (res as any)?.message || 'Upload failed';
                                message.error(`${type} upload failed: ${errMsg}`);
                            } catch (e: any) {
                                console.error('Upload material failed', e);
                                const errMsg = e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? 'Upload failed';
                                message.error(`Upload failed: ${errMsg}`);
                            }
                            return { matIndex, url: null };
                        })
                    );
                    setMaterialSaveUploadProgress((prev) => ({ ...prev, visible: false }));
                    processedMaterials = processedMaterials.map((mat, i) => {
                        const r = results.find((x) => x.matIndex === i);
                        if (r?.url) {
                            return { ...mat, url: r.url, publicId: r.publicId, format: r.format, provider: 'cloudinary', file: null };
                        }
                        return mat;
                    });
                } catch (err) {
                    setMaterialSaveUploadProgress((prev) => ({ ...prev, visible: false }));
                    message.error('Some file uploads failed. You can still save and try again on final submit.');
                }
            }

            const processedQuestions = (values.questions || []).map((q: any) => {
                let answers: string[] = [];
                if (q.type === 'MCQ' || q.type === 'Multiple Correct') {
                    const raw = Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswers];
                    answers = raw.map((idx: string) => q.options[parseInt(idx)]).filter(Boolean);
                } else if (q.type === 'True / False' || q.type === 'Short Answer') {
                    answers = [q.correctAnswers].filter(Boolean);
                }

                return {
                    id: q.id || Math.random().toString(36).substr(2, 9),
                    type: q.type,
                    questionText: q.questionText,
                    options: q.options || [],
                    correctAnswers: answers,
                    marks: q.marks || 1
                };
            });

            const lessonId = editingLessonId || Math.random().toString(36).substr(2, 9);
            // Preserve existing materials when only assessments were edited (do not overwrite with empty)
            const existingLesson = lessons.find((l) => l.id === lessonId);
            const materialsToSave =
                processedMaterials.length > 0
                    ? processedMaterials
                    : (existingLesson?.materials ?? []);

            const lessonPayload: Lesson = {
                id: lessonId,
                title: values.title,
                materials: materialsToSave,
                questions: processedQuestions
            };

            // Store material files in ref so they are available at submit even if state loses File refs
            const filesForRef = processedMaterials
                .map((m, mIndex) => {
                    const f = m.file;
                    if (f instanceof File || f instanceof Blob) {
                        return { mIndex, file: f, fileName: (m.fileName as string) || `material-${mIndex}` };
                    }
                    return null;
                })
                .filter(Boolean) as { mIndex: number; file: File | Blob; fileName: string }[];
            if (filesForRef.length > 0) {
                savedMaterialFilesRef.current.set(lessonId, filesForRef);
            }

            if (editingLessonId) {
                setLessons(prev => prev.map(l => l.id === editingLessonId ? lessonPayload : l));
                message.success('Lesson updated');
            } else {
                setLessons(prev => [...prev, lessonPayload]);
                message.success('Lesson added');
            }

            pendingMaterialFilesRef.current.clear();
            editingLessonSnapshotRef.current = null; // Don't restore snapshot on cancel after a successful save
            cancelLessonEdit();
        } catch (error: any) {
            console.error('Validation failed', error);
            const errMsg = error?.errorFields?.[0]?.errors?.[0]
                || error?.message
                || (typeof error === 'string' ? error : 'Please complete all required fields (Lesson Title, Material type, and file/URL for each material).');
            message.error(errMsg);
        }
    };

    const deleteLesson = (id: string) => {
        setLessons(prev => prev.filter(l => l.id !== id));
    };

    const moveLesson = (index: number, direction: 'up' | 'down') => {
        const newLessons = [...lessons];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newLessons.length) {
            [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
            setLessons(newLessons);
        }
    };

    // --- Navigation & Submission ---
    const handleNext = async () => {
        try {
            if (currentStep === 0) {
                await form.validateFields();
                if (!thumbnailFile && !thumbnailPreview) {
                    message.warning('Please upload a course thumbnail');
                    return;
                }
                // Capture the assessment mode before moving to Step 2
                setAssessmentMode(form.getFieldValue('isLiveAssessment') || false);
                setCurrentStep(1);
            } else if (currentStep === 1) {
                if (isAddingLesson) {
                    message.warning('Please save or cancel the current lesson edit first.');
                    return;
                }
                if (lessons.length === 0) {
                    message.warning('Please add at least one lesson.');
                    return;
                }
                setCurrentStep(2);
            }
        } catch (err) {
            console.error('Validation Error:', err);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
    };

    const onFinalSubmit = async (status: 'Draft' | 'Published') => {
        setLoading(true);
        const saveMsg = message.loading(`Preparing to ${status === 'Draft' ? 'save draft' : 'publish'} course...`, 0);

        try {
            const formData = form.getFieldsValue();
            const formDataPayload = new FormData();
            const materialFilesToAppend: { lessonIndex: number; materialIndex: number; fieldname: string; file: File | Blob; fileName: string; contentType: string }[] = [];

            // 1. Structure Lessons with Materials and Questions
            let structuredLessons = lessons.map((lesson, lIndex) => {
                const materials = lesson.materials.map((material, mIndex) => {
                    let fileToUpload = extractRawFile(material.file);
                    if (!fileToUpload && (material.contentType === 'Video' || material.contentType === 'PDF')) {
                        const fromRef = savedMaterialFilesRef.current.get(lesson.id)?.find(e => e.mIndex === mIndex);
                        if (fromRef) {
                            fileToUpload = fromRef.file;
                            if (!material.fileName) (material as any).fileName = fromRef.fileName;
                        }
                    }

                    let provider = material.provider || 'local';
                    if (fileToUpload instanceof File || fileToUpload instanceof Blob) {
                        provider = 'cloudinary';
                    } else if (material.url && material.url.includes('cloudinary.com')) {
                        provider = 'cloudinary';
                    }

                    const materialData: any = {
                        title: material.title,
                        type: CONTENT_TYPE_MAP[material.contentType] || 'URL',
                        url: material.url || '',
                        subtitleUrl: material.subtitleUrl || '',
                        publicId: material.publicId,
                        format: material.format,
                        provider: provider,
                        ...(material.content && { content: material.content }),
                        ...(material.description && { description: material.description }),
                    };

                    if (fileToUpload instanceof File || fileToUpload instanceof Blob) {
                        materialFilesToAppend.push({
                            lessonIndex: lIndex,
                            materialIndex: mIndex,
                            fieldname: `lesson_${lIndex}_material_${mIndex}`,
                            file: fileToUpload,
                            fileName: (fileToUpload instanceof File ? fileToUpload.name : undefined) || material.fileName || `material-${lIndex}-${mIndex}`,
                            contentType: material.contentType || 'Video'
                        });
                        materialData.hasPendingFile = true;
                    } else if (material.file) {
                        console.warn(`[onFinalSubmit] Material had 'file' property but it was NOT a File/Blob:`, material.file);
                    }
                    return materialData;
                });

                return {
                    title: lesson.title,
                    materials: materials,
                    questions: lesson.questions
                };
            });

            // 2. NEW COURSE: Upload material files to Cloudinary first, then put URLs in payload (no orphaned files if user cancels earlier)
            if (!isEditMode && materialFilesToAppend.length > 0) {
                const fileNames: Record<number, string> = {};
                const perFile: Record<number, number> = {};
                materialFilesToAppend.forEach((item, idx) => {
                    fileNames[idx] = item.fileName;
                    perFile[idx] = 0;
                });
                setMaterialSaveUploadProgress({
                    visible: true,
                    totalFiles: materialFilesToAppend.length,
                    fileNames,
                    perFile
                });
                try {
                    const uploadResults = await Promise.all(
                        materialFilesToAppend.map(async (item, idx) => {
                            try {
                                const apiType = item.contentType === 'PDF' ? 'PDF' : 'VIDEO';
                                const fileForUpload = toFile(item.file, item.fileName || (apiType === 'VIDEO' ? 'video.mp4' : 'document.pdf'));
                                const res = await lmsService.uploadMaterial(fileForUpload, apiType, (percent) => {
                                    setMaterialSaveUploadProgress((prev) => ({
                                        ...prev,
                                        perFile: { ...prev.perFile, [idx]: percent }
                                    }));
                                });
                                if (res?.success && res?.data) {
                                    return {
                                        lessonIndex: item.lessonIndex,
                                        materialIndex: item.materialIndex,
                                        url: res.data.url,
                                        publicId: res.data.publicId,
                                        format: res.data.format
                                    };
                                }
                                return { lessonIndex: item.lessonIndex, materialIndex: item.materialIndex, url: null };
                            } catch (err) {
                                console.error('Material upload failed', err);
                                return { lessonIndex: item.lessonIndex, materialIndex: item.materialIndex, url: null };
                            }
                        })
                    );
                    const failed = uploadResults.filter((r) => !r.url);
                    if (failed.length > 0) {
                        setMaterialSaveUploadProgress((prev) => ({ ...prev, visible: false }));
                        message.error(`${failed.length} file(s) failed to upload. Please try again or remove those materials.`);
                        setLoading(false);
                        saveMsg();
                        return;
                    }
                    structuredLessons = structuredLessons.map((lesson, lIdx) => ({
                        ...lesson,
                        materials: lesson.materials.map((mat, mIdx) => {
                            const result = uploadResults.find((r) => r.lessonIndex === lIdx && r.materialIndex === mIdx && r.url);
                            if (result?.url) {
                                return {
                                    ...mat,
                                    url: result.url,
                                    publicId: result.publicId,
                                    format: result.format,
                                    provider: 'cloudinary',
                                    hasPendingFile: undefined
                                };
                            }
                            return mat;
                        })
                    }));
                } finally {
                    setMaterialSaveUploadProgress((prev) => ({ ...prev, visible: false }));
                }
            }

            // 3. Append files to FormData: thumbnail + material files (only in edit mode we append materials; new course already has URLs in structuredLessons)
            if (thumbnailFile) {
                formDataPayload.append('thumbnail', thumbnailFile, thumbnailFile.name);
            }
            if (isEditMode) {
                materialFilesToAppend.forEach(({ fieldname, file, fileName }) => {
                    formDataPayload.append(fieldname, file, fileName);
                });
            }

            // 3. Construct the Course Metadata
            const payload = {
                title: formData.title,
                description: formData.description,
                categories: Array.isArray(formData.categories) ? formData.categories : (formData.category ? [formData.category] : []),
                languages: Array.isArray(formData.languages) ? formData.languages : (formData.language ? [formData.language] : []),
                thumbnailUrl: initialData?.thumbnailUrl || '',
                isMandatory: formData.isMandatory || false,
                isLiveAssessment: formData.isLiveAssessment || false,
                qualificationScore: formData.qualificationScore || 80,
                completionDuration: {
                    value: formData.completionTimeValue || 1,
                    unit: formData.completionTimeUnit || 'Days'
                },
                assignmentType: formData.assignmentType === 'By Department' ? 'DEPARTMENT' :
                    formData.assignmentType === 'To Individuals' ? 'INDIVIDUAL' :
                        formData.assignmentType === 'Don\'t assign to anyone' ? 'NONE' : 'ALL',
                departments: formData.assignmentType === 'By Department' ? formData.departments : [],
                assignedEmployees: formData.assignmentType === 'To Individuals' ? formData.employees : [],
                lessons: structuredLessons,
                status: status
            };

            formDataPayload.append('courseData', JSON.stringify(payload));

            // 4. Send the Unified Request
            saveMsg(); // Clear preparation message
            const actionMsg = message.loading(`${status === 'Published' ? 'Publishing' : 'Saving'} course and uploading media... This may take a moment for large files.`, 0);

            if (initialData && initialData._id) {
                await lmsService.updateCourse(initialData._id, formDataPayload);
                actionMsg();
                message.success('Course updated successfully');
            } else {
                await lmsService.createCourse(formDataPayload);
                actionMsg();
                message.success(`Course ${status === 'Draft' ? 'saved as draft' : 'published'}!`);
            }

            onSuccess?.();
            onClose();
            // Reset
            setCurrentStep(0);
            form.resetFields();
            setThumbnailFile(null);
            setThumbnailPreview('');
            setLessons([]);
            savedMaterialFilesRef.current.clear();
        } catch (error: any) {
            saveMsg();
            console.error('Final Submit Error:', error);
            const errData = error.response?.data;
            const errMsg = errData?.error?.message ?? errData?.message ?? error.message ?? 'Failed to save course. Please check all fields.';
            message.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return '';
        let videoId = '';
        if (url.includes('v=')) {
            videoId = url.split('v=')[1]?.split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1` : url;
    };

    const handleMaterialPreview = (name: number) => {
        const material = inlineLessonForm.getFieldValue(['materials', name]);
        if (!material) return;

        const rawUrl = material.url?.trim?.() || '';
        const rawFile = extractRawFile(material?.file) || pendingMaterialFilesRef.current.get(name)?.file;
        const hasUrl = !!rawUrl;
        const hasFile = !!(rawFile && (rawFile instanceof File || rawFile instanceof Blob));

        if (!hasUrl && !hasFile) {
            message.warning('No material to preview');
            return;
        }

        let previewUrl: string;
        let type: 'video' | 'pdf' | 'youtube' | 'iframe' = 'iframe';

        if (material.contentType === 'Video') {
            type = 'video';
            if (hasUrl) {
                previewUrl = getFileUrl(rawUrl) || rawUrl;
                if (previewBlobUrlRef.current) {
                    URL.revokeObjectURL(previewBlobUrlRef.current);
                    previewBlobUrlRef.current = null;
                }
            } else if (hasFile) {
                if (previewBlobUrlRef.current) URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = URL.createObjectURL(rawFile as Blob);
                previewUrl = previewBlobUrlRef.current;
            } else {
                message.warning('No material to preview');
                return;
            }
        } else if (material.contentType === 'PDF') {
            type = 'pdf';
            if (hasUrl) {
                previewUrl = getFileUrl(rawUrl) || rawUrl;
                if (previewBlobUrlRef.current) {
                    URL.revokeObjectURL(previewBlobUrlRef.current);
                    previewBlobUrlRef.current = null;
                }
            } else if (hasFile) {
                if (previewBlobUrlRef.current) URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = URL.createObjectURL(rawFile as Blob);
                previewUrl = previewBlobUrlRef.current;
            } else {
                message.warning('No material to preview');
                return;
            }
        } else if (material.contentType === 'YouTube') {
            type = 'youtube';
            previewUrl = getYoutubeEmbedUrl(rawUrl);
            if (previewBlobUrlRef.current) {
                URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = null;
            }
        } else {
            type = 'iframe';
            previewUrl = getFileUrl(rawUrl) || rawUrl;
            if (previewBlobUrlRef.current) {
                URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = null;
            }
        }

        setMaterialPreview({
            visible: true,
            type,
            url: previewUrl,
            title: material.title || 'Material Preview',
            ...(type === 'video' && material.subtitleUrl ? { subtitleUrl: getFileUrl(material.subtitleUrl) || material.subtitleUrl } : {})
        });
    };

    const renderMaterialPreviewModal = () => (
        <Modal
            title={materialPreview.title}
            open={materialPreview.visible}
            onCancel={() => {
                if (previewBlobUrlRef.current) {
                    URL.revokeObjectURL(previewBlobUrlRef.current);
                    previewBlobUrlRef.current = null;
                }
                setMaterialPreview(prev => ({ ...prev, visible: false }));
            }}
            footer={null}
            width={1000}
            centered
            bodyStyle={{ padding: 0, height: '70vh' }}
            destroyOnClose
        >
            <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-b-lg">
                {materialPreview.type === 'video' && (
                    <video
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                        src={materialPreview.url}
                    >
                        {materialPreview.subtitleUrl && <track kind="subtitles" src={materialPreview.subtitleUrl} default />}
                    </video>
                )}
                {materialPreview.type === 'pdf' && (
                    <iframe
                        src={`${materialPreview.url}#toolbar=0`}
                        className="w-full h-full border-none"
                        title="PDF Preview"
                    />
                )}
                {materialPreview.type === 'youtube' && (
                    <iframe
                        src={materialPreview.url}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube Preview"
                    />
                )}
                {materialPreview.type === 'iframe' && (
                    <iframe
                        src={materialPreview.url}
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        title="External Preview"
                    />
                )}
            </div>
        </Modal>
    );

    // --- Renderers ---

    const renderStep1Content = () => (
        <Row gutter={32}>
            {/* Left Column: Form Fields */}
            <Col span={15}>
                <Card bordered={false} className="shadow-sm mb-6">
                    <Form.Item name="title" label={<Text strong>Course Title</Text>} rules={[{ required: true, min: 5, message: 'Min 5 chars allowed' }]}>
                        <Input placeholder="e.g. Advanced Leadership Skills" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="categories"
                        label={<Text strong>Course Categories</Text>}
                        rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one category' }]}
                    >
                        <Select
                            mode="multiple"
                            showSearch
                            size="large"
                            placeholder="Type a category and press Enter to add (select multiple)"
                            searchValue={categorySearchValue}
                            onSearch={setCategorySearchValue}
                            onInputKeyDown={(e) => {
                                if (e.key === 'Enter' && categorySearchValue.trim().length >= 2 && !categories.some(c => c.value.toLowerCase() === categorySearchValue.trim().toLowerCase())) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCreateMetaOption('CATEGORY', categorySearchValue.trim());
                                }
                            }}
                            onDropdownVisibleChange={(open) => { if (!open) setCategorySearchValue(''); }}
                            loading={creatingCategory}
                            filterOption={(input, option) =>
                                (option?.value ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            optionLabelProp="value"
                            notFoundContent={creatingCategory ? 'Creating...' : (categorySearchValue.trim().length >= 2 ? 'Press Enter to add this category' : null)}
                        >
                            {categories.map(c => (
                                <Option key={c.value} value={c.value}>
                                    <div className="flex justify-between items-center w-full group">
                                        <span>{c.value}</span>
                                        {c.id && (
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                className="opacity-0 group-hover:opacity-100 p-0 h-auto"
                                                icon={<CloseOutlined style={{ fontSize: '12px' }} />}
                                                onClick={(e) => handleDeleteMetaOption(e, 'CATEGORY', c.id!, c.value)}
                                            />
                                        )}
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="languages"
                        label={<Text strong>Course Languages</Text>}
                        normalize={(v) => (Array.isArray(v) ? v : (v != null && v !== '' ? [v] : []))}
                        rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one language' }]}
                    >
                        <Select
                            mode="multiple"
                            showSearch
                            size="large"
                            placeholder="Select or type a language and add (multiple allowed)"
                            searchValue={languageSearchValue}
                            onSearch={setLanguageSearchValue}
                            onInputKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = languageSearchValue.trim();
                                    if (val.length >= 2 && !languages.some(l => l.value.toLowerCase() === val.toLowerCase())) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCreateMetaOption('LANGUAGE', val);
                                    }
                                }
                            }}
                            onDropdownVisibleChange={(open) => { if (!open) setLanguageSearchValue(''); }}
                            loading={creatingLanguage}
                            filterOption={(input, option) => {
                                const optVal = (option?.value ?? option?.label ?? option?.children ?? '').toString().toLowerCase();
                                return optVal.includes((input || '').toLowerCase());
                            }}
                            optionLabelProp="value"
                            notFoundContent={
                                creatingLanguage
                                    ? 'Creating...'
                                    : languageSearchValue.trim().length >= 2
                                        ? "Press Enter or click 'Add' below to add this language"
                                        : languages.length === 0
                                            ? 'Type a language above and press Enter to add'
                                            : 'No matching language'
                            }
                            dropdownRender={(menu) => (
                                <>
                                    {menu}
                                    {languageSearchValue.trim().length >= 2 &&
                                        !languages.some(l => l.value.toLowerCase() === languageSearchValue.trim().toLowerCase()) && (
                                        <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f0f0' }}>
                                            <Button
                                                type="link"
                                                size="small"
                                                block
                                                icon={<PlusOutlined />}
                                                onClick={() => {
                                                    const val = languageSearchValue.trim();
                                                    if (val.length >= 2) handleCreateMetaOption('LANGUAGE', val);
                                                }}
                                            >
                                                Add "{languageSearchValue.trim()}" as new language
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        >
                            {languages.map(l => (
                                <Option key={l.id ?? l.value} value={l.value} label={l.value}>
                                    <div className="flex justify-between items-center w-full group">
                                        <span>{l.value}</span>
                                        {l.id && (
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                className="opacity-0 group-hover:opacity-100 p-0 h-auto"
                                                icon={<CloseOutlined style={{ fontSize: '12px' }} />}
                                                onClick={(e) => handleDeleteMetaOption(e, 'LANGUAGE', l.id!, l.value)}
                                            />
                                        )}
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="description" label={<Text strong>Description</Text>} rules={[{ required: true, min: 20, message: 'Min 20 chars allowed' }]}>
                        <TextArea rows={5} showCount maxLength={1000} placeholder="Course objective and summary..." />
                    </Form.Item>

                    <Divider dashed />

                    <Form.Item name="assignmentType" label={<Text strong>Assign Course</Text>}>
                        <Select
                            size="large"
                            placeholder="Select who should be assigned (optional)"
                            onChange={(val) => {
                                if (val === 'By Department') form.setFieldsValue({ employees: [] });
                                else if (val === 'To Individuals') form.setFieldsValue({ departments: [] });
                                else form.setFieldsValue({ departments: [], employees: [] });
                            }}
                        >
                            <Option value="Don't assign to anyone">None</Option>
                            <Option value="By Department">By Department</Option>
                            <Option value="To Individuals">By Individual Employees</Option>
                            <Option value="All Employees">All Employees</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignmentType !== curr.assignmentType}>
                        {({ getFieldValue }) => {
                            const type = getFieldValue('assignmentType');
                            if (type === 'By Department') {
                                return (
                                    <Form.Item name="departments" label="Select Departments" rules={[{ required: true, message: 'Select at least one department' }]}>
                                        <Select mode="multiple" size="large" placeholder="Search departments..." loading={fetchingOrg} optionFilterProp="children">
                                            {departments.map(d => <Option key={d._id} value={d._id}>{d.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            if (type === 'To Individuals') {
                                return (
                                    <Form.Item name="employees" label="Select Employees" rules={[{ required: true, message: 'Select at least one employee' }]}>
                                        <Select mode="multiple" size="large" placeholder="Search employees..." loading={fetchingOrg} optionFilterProp="children">
                                            {employees.map(e => <Option key={e._id} value={e._id}>{e.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>
                </Card>
            </Col >

            {/* Right Column: Thumbnail */}
            < Col span={9} >
                <div className="">
                    <Text strong className="mb-2 block">Course Thumbnail</Text>
                    <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-6 group" style={{ aspectRatio: '16/9' }}>
                        {thumbnailPreview ? (
                            <>
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        type="text"
                                        icon={<EditOutlined style={{ color: 'white' }} />}
                                        className="text-white hover:text-green-400"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); thumbnailInputRef.current?.click(); }}
                                    >
                                        Change
                                    </Button>
                                    <Button
                                        type="text"
                                        icon={<EyeOutlined style={{ color: 'white' }} />}
                                        className="text-white hover:text-emerald-400"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewOpen(true); }}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeThumbnail(e); }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => thumbnailInputRef.current?.click()}>
                                <CloudUploadOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                <Text type="secondary">Upload Course Thumbnail</Text>
                                <Text type="secondary" style={{ fontSize: '10px' }}>16:9 - Max 2MB</Text>
                            </div>
                        )}
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleThumbnailSelect}
                        />
                    </div>

                    <Form.Item
                        name="isMandatory"
                        label={
                            <Space>
                                <Text strong>Course Requirement</Text>
                                <Tooltip title="Mandatory courses must be completed by all assigned employees.">
                                    <InfoCircleOutlined className="text-emerald-500" />
                                </Tooltip>
                            </Space>
                        }
                        valuePropName="checked"
                    >
                        <div className="flex items-center gap-3">
                            <Switch checkedChildren="YES" unCheckedChildren="NO" />
                            <Text type="secondary" className="text-sm">Is this a Mandatory Course?</Text>
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="isLiveAssessment"
                        label={
                            <Space>
                                <Text strong>Is this a Live Assessment?</Text>
                                <Tooltip title="If ON, assessment is conducted live. If OFF, it's Standardized Assessment.">
                                    <InfoCircleOutlined className="text-emerald-500" />
                                </Tooltip>
                            </Space>
                        }
                        valuePropName="checked"
                    >
                        <div className="flex items-center gap-3">
                            <Switch
                                checkedChildren="YES"
                                unCheckedChildren="NO"
                                onChange={(checked) => {
                                    form.setFieldValue('isLiveAssessment', checked);
                                    setAssessmentMode(checked);
                                }}
                            />
                            <Text type="secondary" className="text-sm">Live Assessment Mode</Text>
                        </div>
                    </Form.Item>

                    <Form.Item
                        name="qualificationScore"
                        label={<Text strong>Qualification Score (%)</Text>}
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <InputNumber
                            min={0}
                            max={100}
                            formatter={value => `${value}%`}
                            parser={value => (value ? value.replace('%', '') : '') as any}
                            style={{ width: '100%' }}
                            size="large"
                            placeholder="e.g. 80"
                        />
                    </Form.Item>

                    <Form.Item label={<Text strong>Completion Deadline</Text>} required>
                        <Space.Compact block>
                            <Form.Item name="completionTimeValue" noStyle rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber min={1} style={{ width: '40%' }} size="large" />
                            </Form.Item>
                            <Form.Item name="completionTimeUnit" noStyle rules={[{ required: true, message: 'Required' }]}>
                                <Select style={{ width: '60%' }} size="large">
                                    <Option value="Days">Days</Option>
                                    <Option value="Weeks">Weeks</Option>
                                    <Option value="Months">Months</Option>
                                </Select>
                            </Form.Item>
                        </Space.Compact>
                    </Form.Item>
                </div>
            </Col >
        </Row >
    );

    const renderStep2 = () => (
        <div className="py-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={4} style={{ margin: 0 }}>Course Curriculum</Title>
                    <Text type="secondary">Build your course structure. Add lessons inline below.</Text>
                </div>
            </div>

            {/* Add Lesson button - always visible when not in edit/add mode */}
            {!isAddingLesson && (
                <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={startAddLesson}
                    className="mb-6 h-12 text-gray-500 hover:text-green-600 hover:border-green-600"
                >
                    Add Lesson
                </Button>
            )}

            {/* Lesson list - expand in place to edit */}
            <div className="space-y-4">
                {lessons.map((lesson, index) => (
                    <Card
                        key={lesson.id}
                        size="small"
                        className={editingLessonId === lesson.id ? 'mb-6 border-emerald-100 shadow-md' : 'hover:shadow-md transition-shadow'}
                        title={editingLessonId === lesson.id ? (
                            <Space>
                                <EditOutlined className="text-emerald-500" />
                                <span>Edit Lesson</span>
                            </Space>
                        ) : (
                            <Space>
                                <Avatar size="small" style={{ backgroundColor: PRIMARY_COLOR }}>{index + 1}</Avatar>
                                <Text strong>{lesson.title}</Text>
                                <Badge count={lesson.materials.length} style={{ backgroundColor: '#52c41a' }} />
                            </Space>
                        )}
                        extra={
                            editingLessonId === lesson.id ? (
                                <Button type="text" icon={<CloseOutlined />} onClick={cancelLessonEdit} />
                            ) : (
                                <Space>
                                    <Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={() => moveLesson(index, 'up')} disabled={index === 0} />
                                    <Button size="small" type="text" icon={<ArrowDownOutlined />} onClick={() => moveLesson(index, 'down')} disabled={index === lessons.length - 1} />
                                    <Divider type="vertical" />
                                    <Button type="text" size="small" icon={<EditOutlined className="text-emerald-500" />} onClick={() => startEditLesson(lesson)} />
                                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteLesson(lesson.id)} />
                                </Space>
                            )
                        }
                    >
                        {editingLessonId === lesson.id ? (
                            <Form form={inlineLessonForm} layout="vertical">
                                <Form.Item
                            name="title"
                            label={<Text strong>Lesson Title</Text>}
                            extra="Lesson name for your course outline (optional — defaults to first material title)"
                            rules={[{ required: true, message: 'Title is required' }]}
                        >
                            <Input placeholder="e.g. Module 1: Introduction to Safety" size="large" />
                        </Form.Item>

                        <Text strong className="block mb-3">Lesson Materials</Text>
                        <Form.List name="materials">
                            {(fields, { add, remove }) => (
                                <div className="space-y-6">
                                    {fields.map(({ key, name, ...restField }) => {
                                        const type = inlineLessonForm.getFieldValue(['materials', name, 'contentType']);
                                        const hasFile = !!extractRawFile(inlineLessonForm.getFieldValue(['materials', name, 'file'])) || !!pendingMaterialFilesRef.current.get(name);
                                        const hasUrl = !!inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                        const hasContent = !!inlineLessonForm.getFieldValue(['materials', name, 'content'])?.trim?.();
                                        const hasInput = (type === 'Video' || type === 'PDF') ? hasFile : (type === 'YouTube' || type === 'External URL') ? hasUrl : (type === 'Text/Article') ? hasContent : false;
                                        const materialId = inlineLessonForm.getFieldValue(['materials', name, 'id']) || `temp-${name}`;
                                        const progress = uploadProgress[materialId] || 0;
                                        const isDragOver = dragOverMaterialIndex === name;

                                        return (
                                            <Card size="small" className="bg-gray-50/50" key={key}>
                                                {/* Step 1: Material type first */}
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'contentType']}
                                                    label={<Text strong>What type of material are you adding?</Text>}
                                                    rules={[{ required: true, message: 'Select a material type' }]}
                                                >
                                                    <Select
                                                        placeholder="Select material type..."
                                                        size="large"
                                                        onChange={(val) => {
                                                            const values = inlineLessonForm.getFieldsValue(true) as { materials?: any[] };
                                                            let current = values.materials;
                                                            if (!current || !Array.isArray(current)) return;
                                                            current = current.map((m: any, i: number) => {
                                                                if (i === name) {
                                                                    const next = { ...m, contentType: val, file: [] };
                                                                    // Only clear url when switching to a type that doesn't use file URL (YouTube/URL use different url meaning)
                                                                    if (val !== 'Video' && val !== 'PDF') next.url = '';
                                                                    return next;
                                                                }
                                                                const pending = pendingMaterialFilesRef.current.get(i);
                                                                if (pending && (!m.file || !extractRawFile(m.file))) {
                                                                    return { ...m, file: [{ originFileObj: pending.file, name: pending.fileName }] };
                                                                }
                                                                return m;
                                                            });
                                                            inlineLessonForm.setFieldsValue({ materials: current });
                                                            if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                inlineLessonForm.setFieldValue('title', '');
                                                            }
                                                        }}
                                                        options={MATERIAL_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                                                    />
                                                </Form.Item>

                                                {/* Step 2: Upload / URL / Text based on type */}
                                                {type && (
                                                    <Form.Item noStyle shouldUpdate>
                                                        {() => {
                                                            const t = inlineLessonForm.getFieldValue(['materials', name, 'contentType']);
                                                            const handleBeforeUpload = (file: File) => {
                                                                const isLtG = t === 'Video' ? (file.size / 1024 / 1024 / 1024 < VIDEO_SIZE_LIMIT_GB) : (file.size / 1024 / 1024 < PDF_SIZE_LIMIT_MB);
                                                                if (!isLtG) {
                                                                    message.error(`${t === 'Video' ? 'Video' : 'PDF'} must be smaller than ${t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}!`);
                                                                    return Upload.LIST_IGNORE;
                                                                }
                                                                const titleFromFile = cleanFileNameToTitle(file.name);
                                                                inlineLessonForm.setFieldValue(['materials', name, 'title'], titleFromFile);
                                                                if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                    inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                }
                                                                return false;
                                                            };

                                                            if (t === 'Video' || t === 'PDF') {
                                                                const material = inlineLessonForm.getFieldValue(['materials', name]) || {};
                                                                const fileList = inlineLessonForm.getFieldValue(['materials', name, 'file']);
                                                                const rawFile = extractRawFile(fileList) || pendingMaterialFilesRef.current.get(name)?.file;
                                                                const hasExistingUrl = !!material?.url?.trim?.();
                                                                const displayName = material?.title || material?.fileName || (t === 'Video' ? 'Video' : 'PDF');
                                                                const accept = t === 'Video' ? 'video/mp4,video/webm,video/quicktime' : '.pdf';
                                                                const maxSize = t === 'Video' ? VIDEO_SIZE_LIMIT_GB * 1024 * 1024 * 1024 : PDF_SIZE_LIMIT_MB * 1024 * 1024;
                                                                const subtitleUrl = material?.subtitleUrl;
                                                                const subtitleProgressKey = `subtitle-${materialId}`;
                                                                const subtitleProgress = uploadProgress[subtitleProgressKey] ?? 0;
                                                                const videoOrPdfField = (
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'file']}
                                                                        label={t === 'Video' ? 'Upload your video' : 'Upload your PDF'}
                                                                        extra={t === 'Video' ? `Drag and drop or click to browse. Max ${VIDEO_SIZE_LIMIT_GB}GB.` : `Drag and drop or click to browse. Max ${PDF_SIZE_LIMIT_MB}MB.`}
                                                                        valuePropName="fileList"
                                                                        getValueFromEvent={normFile}
                                                                        rules={[{
                                                                            validator(_, value) {
                                                                                const hasInForm = !!extractRawFile(value);
                                                                                const hasInRef = !!pendingMaterialFilesRef.current.get(name)?.file;
                                                                                const materials = inlineLessonForm.getFieldValue('materials');
                                                                                const m = materials?.[name];
                                                                                const hasUrl = !!m?.url?.trim?.();
                                                                                if (hasInForm || hasInRef || hasUrl) return Promise.resolve();
                                                                                return Promise.reject(new Error('Upload a file'));
                                                                            }
                                                                        }]}
                                                                    >
                                                                        <div
                                                                            className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
                                                                            style={{
                                                                                borderColor: isDragOver ? PRIMARY_COLOR : '#d9d9d9',
                                                                                background: isDragOver ? 'rgba(29, 155, 81, 0.06)' : undefined
                                                                            }}
                                                                            onDragOver={(e) => { e.preventDefault(); setDragOverMaterialIndex(name); }}
                                                                            onDragLeave={() => setDragOverMaterialIndex(null)}
                                                                            onDrop={(e) => {
                                                                                e.preventDefault();
                                                                                setDragOverMaterialIndex(null);
                                                                                const file = e.dataTransfer?.files?.[0];
                                                                                if (!file) return;
                                                                                if (t === 'Video' && !/\.(mp4|webm|mov)$/i.test(file.name)) {
                                                                                    message.error('Please upload an MP4, WEBM, or MOV file.');
                                                                                    return;
                                                                                }
                                                                                if (t === 'PDF' && !/\.pdf$/i.test(file.name)) {
                                                                                    message.error('Please upload a PDF file.');
                                                                                    return;
                                                                                }
                                                                                const sizeOk = t === 'Video' ? file.size <= maxSize : file.size <= maxSize;
                                                                                if (!sizeOk) {
                                                                                    message.error(`File must be smaller than ${t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}.`);
                                                                                    return;
                                                                                }
                                                                                const titleFromFile = cleanFileNameToTitle(file.name);
                                                                                pendingMaterialFilesRef.current.set(name, { file, fileName: file.name });
                                                                                inlineLessonForm.setFieldsValue({
                                                                                    materials: inlineLessonForm.getFieldValue('materials').map((m: any, i: number) =>
                                                                                        i === name ? { ...m, file: [{ originFileObj: file, name: file.name }], title: titleFromFile } : m
                                                                                    )
                                                                                });
                                                                                if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                    inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                                }
                                                                                if (isEditMode) {
                                                                                    uploadMaterialImmediately(name, file, t);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Upload
                                                                                maxCount={1}
                                                                                beforeUpload={handleBeforeUpload}
                                                                                accept={accept}
                                                                                showUploadList={false}
                                                                                onChange={(info) => {
                                                                                    const raw = (info.file as any)?.originFileObj ?? (info.fileList?.[0] as any)?.originFileObj;
                                                                                    if ((raw instanceof File || raw instanceof Blob) && info.fileList?.length) {
                                                                                        pendingMaterialFilesRef.current.set(name, { file: raw, fileName: raw instanceof File ? raw.name : 'file' });
                                                                                        const fileList = (info.fileList?.length ? info.fileList : info.file ? [{ originFileObj: info.file, name: (info.file as any).name }] : []) as any[];
                                                                                        inlineLessonForm.setFieldValue(['materials', name, 'file'], fileList);
                                                                                        if (raw instanceof File) {
                                                                                            const titleFromFile = cleanFileNameToTitle(raw.name);
                                                                                            inlineLessonForm.setFieldValue(['materials', name, 'title'], titleFromFile);
                                                                                            if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                                inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                                            }
                                                                                        }
                                                                                        const existingUrl = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                                        if (isEditMode && !existingUrl?.includes?.('cloudinary.com')) {
                                                                                            uploadMaterialImmediately(name, raw, t);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {rawFile ? (
                                                                                    <div className="flex flex-col items-center gap-2">
                                                                                        <CheckCircleOutlined style={{ color: PRIMARY_COLOR, fontSize: 32 }} />
                                                                                        <Text strong>{rawFile instanceof File ? rawFile.name : 'File selected'}</Text>
                                                                                        <Text type="secondary">{(rawFile instanceof File && rawFile.size) ? `${(rawFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</Text>
                                                                                        <Space>
                                                                                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMaterialPreview(name); }}>Preview</Button>
                                                                                            <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); inlineLessonForm.setFieldValue(['materials', name, 'file'], []); inlineLessonForm.setFieldValue(['materials', name, 'title'], ''); inlineLessonForm.setFieldValue(['materials', name, 'url'], ''); pendingMaterialFilesRef.current.delete(name); }}>Remove</Button>
                                                                                        </Space>
                                                                                    </div>
                                                                                ) : hasExistingUrl ? (
                                                                                    <div className="flex flex-col items-center gap-2">
                                                                                        <CheckCircleOutlined style={{ color: PRIMARY_COLOR, fontSize: 32 }} />
                                                                                        <Text strong>Uploaded: {displayName}</Text>
                                                                                        <Text type="secondary">Already saved — you can preview or replace</Text>
                                                                                        <Space>
                                                                                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMaterialPreview(name); }}>Preview</Button>
                                                                                            <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); inlineLessonForm.setFieldsValue({ materials: inlineLessonForm.getFieldValue('materials').map((m: any, i: number) => i === name ? { ...m, url: '', file: [], title: '', fileName: undefined } : m) }); }}>Remove</Button>
                                                                                        </Space>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-center gap-2">
                                                                                        <CloudUploadOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                                                                                        <Text>Drop your {t === 'Video' ? 'video' : 'PDF'} here or click to browse</Text>
                                                                                        <Text type="secondary">Max {t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}</Text>
                                                                                        {progress > 0 && progress < 100 && <Progress percent={progress} size="small" status="active" />}
                                                                                    </div>
                                                                                )}
                                                                            </Upload>
                                                                        </div>
                                                                    </Form.Item>
                                                                );
                                                                if (t === 'Video') {
                                                                    return (
                                                                        <Row gutter={16} align="stretch">
                                                                            <Col xs={24} md={14}>
                                                                                {videoOrPdfField}
                                                                            </Col>
                                                                            <Col xs={24} md={10}>
                                                                                <Form.Item
                                                                                    label="Subtitle (.vtt)"
                                                                                    extra="Optional. Upload a .vtt file to show captions with the video."
                                                                                >
                                                                                    <div className="border-2 border-dashed rounded-lg p-4 text-center transition-colors" style={{ borderColor: '#d9d9d9', minHeight: 120 }}>
                                                                                        {subtitleUrl ? (
                                                                                            <div className="flex flex-col items-center gap-2">
                                                                                                <CheckCircleOutlined style={{ color: PRIMARY_COLOR }} />
                                                                                                <Text strong className="text-sm">Subtitle uploaded</Text>
                                                                                                <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={() => { inlineLessonForm.setFieldsValue({ materials: inlineLessonForm.getFieldValue('materials').map((mm: any, i: number) => i === name ? { ...mm, subtitleUrl: '' } : mm) }); }}>Remove</Button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <Upload
                                                                                                accept=".vtt,text/vtt"
                                                                                                maxCount={1}
                                                                                                showUploadList={false}
                                                                                                beforeUpload={(file) => {
                                                                                                    if (!/\.vtt$/i.test(file.name)) {
                                                                                                        message.error('Please upload a .vtt file');
                                                                                                        return Upload.LIST_IGNORE;
                                                                                                    }
                                                                                                    uploadSubtitleImmediately(name, file);
                                                                                                    return false;
                                                                                                }}
                                                                                            >
                                                                                                <div className="flex flex-col items-center gap-1 py-2">
                                                                                                    <FileTextOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                                                                                                    <Text className="text-sm">.vtt subtitle (optional)</Text>
                                                                                                    <Text type="secondary" className="text-xs">Click or drop</Text>
                                                                                                    {subtitleProgress > 0 && subtitleProgress < 100 && <Progress percent={subtitleProgress} size="small" status="active" />}
                                                                                                </div>
                                                                                            </Upload>
                                                                                        )}
                                                                                    </div>
                                                                                </Form.Item>
                                                                            </Col>
                                                                        </Row>
                                                                    );
                                                                }
                                                                return videoOrPdfField;
                                                            }
                                                            if (t === 'YouTube') {
                                                                const urlVal = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'url']}
                                                                            label="Enter YouTube URL"
                                                                            rules={[{ required: true, message: 'Enter a YouTube URL' }]}
                                                                        >
                                                                            <Input
                                                                                prefix={<YoutubeOutlined />}
                                                                                placeholder="https://www.youtube.com/watch?v=..."
                                                                                onBlur={async () => {
                                                                                    const u = inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                                                                    if (!u || !/youtube\.com|youtu\.be/i.test(u)) return;
                                                                                    setFetchingMaterialTitle(name);
                                                                                    const title = await fetchMaterialTitleFromUrl(u);
                                                                                    setFetchingMaterialTitle(null);
                                                                                    if (title) {
                                                                                        inlineLessonForm.setFieldValue(['materials', name, 'title'], title);
                                                                                        if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                            inlineLessonForm.setFieldValue('title', title);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </Form.Item>
                                                                        {fetchingMaterialTitle === name && <Text type="secondary">Fetching video title...</Text>}
                                                                        {urlVal && (
                                                                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleMaterialPreview(name)}>Preview YouTube</Button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            if (t === 'External URL') {
                                                                const urlVal = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                return (
                                                                    <div className="space-y-2">
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'url']}
                                                                            label="Enter website URL"
                                                                            rules={[{ required: true, message: 'Enter a URL' }, { type: 'url', message: 'Enter a valid URL' }]}
                                                                        >
                                                                            <Input
                                                                                prefix={<LinkOutlined />}
                                                                                placeholder="https://..."
                                                                                onBlur={async () => {
                                                                                    const u = inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                                                                    if (!u || !/^https?:\/\//i.test(u)) return;
                                                                                    setFetchingMaterialTitle(name);
                                                                                    const title = await fetchMaterialTitleFromUrl(u);
                                                                                    setFetchingMaterialTitle(null);
                                                                                    if (title) {
                                                                                        inlineLessonForm.setFieldValue(['materials', name, 'title'], title);
                                                                                        if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                            inlineLessonForm.setFieldValue('title', title);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </Form.Item>
                                                                        {fetchingMaterialTitle === name && <Text type="secondary">Fetching page title...</Text>}
                                                                        {urlVal && (
                                                                            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleMaterialPreview(name)}>Preview Link</Button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    </Form.Item>
                                                )}

                                                {/* Material title: show as soon as type is selected; auto-filled from file name or URL, editable */}
                                                <Form.Item noStyle shouldUpdate={(prev, curr) => prev?.materials?.[name] !== curr?.materials?.[name]}>
                                                    {() => {
                                                        const currentType = inlineLessonForm.getFieldValue(['materials', name, 'contentType']);
                                                        if (!currentType) return null;
                                                        return (
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'title']}
                                                                label={<><Text strong>Material Title</Text> <Text type="secondary" style={{ fontWeight: 'normal' }}>(from file/URL, editable)</Text></>}
                                                                rules={[{ required: true, message: 'Material title is required' }]}
                                                            >
                                                                <Input placeholder="Add file/URL to auto-fill or type title" prefix={<EditOutlined style={{ color: '#bfbfbf' }} />} />
                                                            </Form.Item>
                                                        );
                                                    }}
                                                </Form.Item>

                                                <div className="flex justify-end">
                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} disabled={fields.length === 1}>
                                                        Remove material
                                                    </Button>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ id: Math.random().toString(36).substr(2, 9), contentType: '', file: [], url: '', title: '' })}
                                        block
                                        icon={<PlusOutlined />}
                                        className="h-12"
                                    >
                                        Add Another Material to this Lesson
                                    </Button>
                                </div>
                            )}
                        </Form.List>

                        {!assessmentMode && (
                            <>
                                <Divider dashed />
                                <div className="flex items-center justify-between mb-3">
                                    <Text strong>Assessment Questions</Text>
                                    <Tag color="orange">At least 1 question per lesson is mandatory</Tag>
                                </div>

                                <Form.List name="questions">
                                    {(fields, { add, remove }) => (
                                        <div className="space-y-4">
                                            {fields.map(({ key, name, ...restField }) => (
                                                <Card size="small" variant="outlined" className="border-gray-100 bg-blue-50/10" key={key}
                                                    title={<Text strong className="text-xs">Question {name + 1}</Text>}
                                                    extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ height: '20px' }} />}
                                                >
                                                    <Row gutter={16}>
                                                        <Col span={18}>
                                                            <Form.Item {...restField} name={[name, 'questionText']} label="Question Text" rules={[{ required: true }]}>
                                                                <TextArea placeholder="Enter the assessment question..." autoSize={{ minRows: 2 }} />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={6}>
                                                            <Form.Item {...restField} name={[name, 'type']} label="Type" rules={[{ required: true }]}>
                                                                <Select>
                                                                    <Option value="MCQ">MCQ</Option>
                                                                    <Option value="Multiple Correct">Multiple Correct</Option>
                                                                    <Option value="True / False">True / False</Option>
                                                                    <Option value="Short Answer">Short Answer</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>

                                                    <Form.Item noStyle shouldUpdate={(prev, curr) =>
                                                        prev.questions?.[name]?.type !== curr.questions?.[name]?.type ||
                                                        prev.questions?.[name]?.options !== curr.questions?.[name]?.options
                                                    }>
                                                        {({ getFieldValue }) => {
                                                            const qType = getFieldValue(['questions', name, 'type']);
                                                            if (qType === 'MCQ' || qType === 'Multiple Correct') {
                                                                return (
                                                                    <div className="bg-white p-3 rounded border border-gray-100 mb-4">
                                                                        <Form.List name={[name, 'options']}>
                                                                            {(optFields, { add: addOpt, remove: removeOpt }) => (
                                                                                <>
                                                                                    <Row gutter={[8, 8]}>
                                                                                        {optFields.map((optField, idx) => (
                                                                                            <Col span={12} key={optField.key}>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Form.Item {...optField} noStyle rules={[{ required: true }]}>
                                                                                                        <Input placeholder={`Option ${idx + 1}`} size="small" />
                                                                                                    </Form.Item>
                                                                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeOpt(idx)} disabled={optFields.length <= 2} size="small" />
                                                                                                </div>
                                                                                            </Col>
                                                                                        ))}
                                                                                    </Row>
                                                                                    <Button type="dashed" onClick={() => addOpt()} block icon={<PlusOutlined />} size="small" className="mt-2" disabled={optFields.length >= 6}>
                                                                                        Add Option
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </Form.List>

                                                                        <Divider className="my-3" />

                                                                        <Form.Item name={[name, 'correctAnswers']} label="Correct Answer(s)" rules={[{ required: true }]}>
                                                                            <Select mode={qType === 'Multiple Correct' ? 'multiple' : undefined} placeholder="Select correct answer(s)">
                                                                                {(getFieldValue(['questions', name, 'options']) || []).map((opt: string, idx: number) => (
                                                                                    <Option key={idx} value={idx.toString()}>{opt || `Option ${idx + 1}`}</Option>
                                                                                ))}
                                                                            </Select>
                                                                        </Form.Item>
                                                                    </div>
                                                                );
                                                            }
                                                            if (qType === 'True / False') {
                                                                return (
                                                                    <Form.Item name={[name, 'correctAnswers']} label="Correct Answer" rules={[{ required: true }]}>
                                                                        <Select>
                                                                            <Option value="True">True</Option>
                                                                            <Option value="False">False</Option>
                                                                        </Select>
                                                                    </Form.Item>
                                                                );
                                                            }
                                                            if (qType === 'Short Answer') {
                                                                return (
                                                                    <Form.Item name={[name, 'correctAnswers']} label="Acceptable Answer" rules={[{ required: true }]}>
                                                                        <Input placeholder="Enter the correct answer text..." />
                                                                    </Form.Item>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    </Form.Item>

                                                    <Form.Item {...restField} name={[name, 'marks']} label="Marks" rules={[{ required: true }]}>
                                                        <InputNumber min={1} size="small" />
                                                    </Form.Item>
                                                </Card>
                                            ))}
                                            <Button type="dashed" onClick={() => add({ id: Math.random().toString(36).substr(2, 9), type: 'MCQ', marks: 1, options: ['', ''], correctAnswers: [] })} block icon={<PlusOutlined />}>
                                                Add Question to this Lesson
                                            </Button>
                                        </div>
                                    )}
                                </Form.List>
                            </>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button onClick={cancelLessonEdit}>Cancel</Button>
                            <Button type="primary" onClick={saveInlineLesson} style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}>Save Lesson Group</Button>
                        </div>
                            </Form>
                        ) : (
                            <List
                                size="small"
                                dataSource={lesson.materials}
                                renderItem={m => (
                                    <List.Item key={m.id} className="py-1 px-4 border-b border-gray-50 last:border-b-0">
                                        <Space>
                                            {m.contentType === 'Video' && <PlayCircleOutlined className="text-emerald-500" />}
                                            {m.contentType === 'YouTube' && <YoutubeOutlined className="text-red-500" />}
                                            {m.contentType === 'PDF' && <FilePdfOutlined className="text-red-400" />}
                                            {m.contentType === 'External URL' && <GlobalOutlined className="text-green-500" />}
                                            <Text style={{ fontSize: '13px' }}>{m.title}</Text>
                                        </Space>
                                        <Text type="secondary" className="text-[10px] ml-auto">
                                            {m.fileName || (m.url?.length > 30 ? m.url.substring(0, 30) + '...' : m.url)}
                                        </Text>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                ))}

                {/* New lesson form - at bottom when adding */}
                {isAddingLesson && !editingLessonId && (
                    <Card
                        className="mb-6 border-emerald-100 shadow-md"
                        title={
                            <Space>
                                <PlusOutlined className="text-green-500" />
                                <span>Add New Lesson</span>
                            </Space>
                        }
                        extra={<Button type="text" icon={<CloseOutlined />} onClick={cancelLessonEdit} />}
                    >
                        <Form form={inlineLessonForm} layout="vertical">
                            <Form.Item
                                name="title"
                                label={<Text strong>Lesson Title</Text>}
                                extra="Lesson name for your course outline (optional — defaults to first material title)"
                                rules={[{ required: true, message: 'Title is required' }]}
                            >
                                <Input placeholder="e.g. Module 1: Introduction to Safety" size="large" />
                            </Form.Item>
                            <Text strong className="block mb-3">Lesson Materials</Text>
                            <Form.List name="materials">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-6">
                                        {fields.map(({ key, name, ...restField }) => {
                                            const type = inlineLessonForm.getFieldValue(['materials', name, 'contentType']);
                                            const hasFile = !!extractRawFile(inlineLessonForm.getFieldValue(['materials', name, 'file'])) || !!pendingMaterialFilesRef.current.get(name);
                                            const hasUrl = !!inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                            const hasInput = (type === 'Video' || type === 'PDF') ? hasFile : (type === 'YouTube' || type === 'External URL') ? hasUrl : false;
                                            const materialId = inlineLessonForm.getFieldValue(['materials', name, 'id']) || `temp-${name}`;
                                            const progress = uploadProgress[materialId] || 0;
                                            const isDragOver = dragOverMaterialIndex === name;
                                            return (
                                                <Card size="small" className="bg-gray-50/50" key={key}>
                                                    <Form.Item {...restField} name={[name, 'contentType']} label={<Text strong>What type of material are you adding?</Text>} rules={[{ required: true, message: 'Select a material type' }]}>
                                                        <Select
                                                            placeholder="Select material type..."
                                                            size="large"
                                                            onChange={(val) => {
                                                                const values = inlineLessonForm.getFieldsValue(true) as { materials?: any[] };
                                                                let current = values.materials;
                                                                if (!current || !Array.isArray(current)) return;
                                                                current = current.map((m: any, i: number) => {
                                                                    if (i === name) {
                                                                        const next = { ...m, contentType: val, file: [] };
                                                                        if (val !== 'Video' && val !== 'PDF') next.url = '';
                                                                        return next;
                                                                    }
                                                                    const pending = pendingMaterialFilesRef.current.get(i);
                                                                    if (pending && (!m.file || !extractRawFile(m.file))) {
                                                                        return { ...m, file: [{ originFileObj: pending.file, name: pending.fileName }] };
                                                                    }
                                                                    return m;
                                                                });
                                                                inlineLessonForm.setFieldsValue({ materials: current });
                                                                if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                    inlineLessonForm.setFieldValue('title', '');
                                                                }
                                                            }}
                                                            options={MATERIAL_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                                                        />
                                                    </Form.Item>
                                                    {type && (
                                                        <Form.Item noStyle shouldUpdate>
                                                            {() => {
                                                                const t = inlineLessonForm.getFieldValue(['materials', name, 'contentType']);
                                                                const material = inlineLessonForm.getFieldValue(['materials', name]) || {};
                                                                const fileList = inlineLessonForm.getFieldValue(['materials', name, 'file']);
                                                                const rawFile = extractRawFile(fileList) || pendingMaterialFilesRef.current.get(name)?.file;
                                                                const hasExistingUrl = !!material?.url?.trim?.();
                                                                const displayName = material?.title || material?.fileName || (t === 'Video' ? 'Video' : 'PDF');
                                                                const accept = t === 'Video' ? 'video/mp4,video/webm,video/quicktime' : '.pdf';
                                                                const maxSize = t === 'Video' ? VIDEO_SIZE_LIMIT_GB * 1024 * 1024 * 1024 : PDF_SIZE_LIMIT_MB * 1024 * 1024;
                                                                const handleBeforeUpload = (file: File) => {
                                                                    const isLtG = t === 'Video' ? (file.size / 1024 / 1024 / 1024 < VIDEO_SIZE_LIMIT_GB) : (file.size / 1024 / 1024 < PDF_SIZE_LIMIT_MB);
                                                                    if (!isLtG) {
                                                                        message.error(`${t === 'Video' ? 'Video' : 'PDF'} must be smaller than ${t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}!`);
                                                                        return Upload.LIST_IGNORE;
                                                                    }
                                                                    const titleFromFile = cleanFileNameToTitle(file.name);
                                                                    inlineLessonForm.setFieldValue(['materials', name, 'title'], titleFromFile);
                                                                    if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                        inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                    }
                                                                    return false;
                                                                };
                                                                if (t === 'Video' || t === 'PDF') {
                                                                    const material2 = inlineLessonForm.getFieldValue(['materials', name]) || {};
                                                                    const subtitleUrl2 = material2?.subtitleUrl;
                                                                    const subtitleProgressKey2 = `subtitle-${materialId}`;
                                                                    const subtitleProgress2 = uploadProgress[subtitleProgressKey2] ?? 0;
                                                                    const videoOrPdfField2 = (
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'file']}
                                                                            label={t === 'Video' ? 'Upload your video' : 'Upload your PDF'}
                                                                            extra={t === 'Video' ? `Drag and drop or click to browse. Max ${VIDEO_SIZE_LIMIT_GB}GB.` : `Drag and drop or click to browse. Max ${PDF_SIZE_LIMIT_MB}MB.`}
                                                                            valuePropName="fileList"
                                                                            getValueFromEvent={normFile}
                                                                            rules={[{
                                                                                validator(_, value) {
                                                                                    const hasInForm = !!extractRawFile(value);
                                                                                    const hasInRef = !!pendingMaterialFilesRef.current.get(name)?.file;
                                                                                    const materials = inlineLessonForm.getFieldValue('materials');
                                                                                    const m = materials?.[name];
                                                                                    const hasUrl = !!m?.url?.trim?.();
                                                                                    if (hasInForm || hasInRef || hasUrl) return Promise.resolve();
                                                                                    return Promise.reject(new Error('Upload a file'));
                                                                                }
                                                                            }]}
                                                                        >
                                                                            <div
                                                                                className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
                                                                                style={{ borderColor: isDragOver ? PRIMARY_COLOR : '#d9d9d9', background: isDragOver ? 'rgba(29, 155, 81, 0.06)' : undefined }}
                                                                                onDragOver={(e) => { e.preventDefault(); setDragOverMaterialIndex(name); }}
                                                                                onDragLeave={() => setDragOverMaterialIndex(null)}
                                                                                onDrop={(e) => {
                                                                                    e.preventDefault();
                                                                                    setDragOverMaterialIndex(null);
                                                                                    const file = e.dataTransfer?.files?.[0];
                                                                                    if (!file) return;
                                                                                    if (t === 'Video' && !/\.(mp4|webm|mov)$/i.test(file.name)) { message.error('Please upload an MP4, WEBM, or MOV file.'); return; }
                                                                                    if (t === 'PDF' && !/\.pdf$/i.test(file.name)) { message.error('Please upload a PDF file.'); return; }
                                                                                    const sizeOk = t === 'Video' ? file.size <= maxSize : file.size <= maxSize;
                                                                                    if (!sizeOk) { message.error(`File must be smaller than ${t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}.`); return; }
                                                                                    const titleFromFile = cleanFileNameToTitle(file.name);
                                                                                    pendingMaterialFilesRef.current.set(name, { file, fileName: file.name });
                                                                                    inlineLessonForm.setFieldsValue({
                                                                                        materials: inlineLessonForm.getFieldValue('materials').map((m: any, i: number) =>
                                                                                            i === name ? { ...m, file: [{ originFileObj: file, name: file.name }], title: titleFromFile } : m
                                                                                        )
                                                                                    });
                                                                                    if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                        inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                                    }
                                                                                    if (isEditMode) {
                                                                                        uploadMaterialImmediately(name, file, t);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Upload
                                                                                    maxCount={1}
                                                                                    beforeUpload={handleBeforeUpload}
                                                                                    accept={accept}
                                                                                    showUploadList={false}
                                                                                    onChange={(info) => {
                                                                                        const raw = (info.file as any)?.originFileObj ?? (info.fileList?.[0] as any)?.originFileObj;
                                                                                        if ((raw instanceof File || raw instanceof Blob) && info.fileList?.length) {
                                                                                            pendingMaterialFilesRef.current.set(name, { file: raw, fileName: raw instanceof File ? raw.name : 'file' });
                                                                                            const fileList = (info.fileList?.length ? info.fileList : info.file ? [{ originFileObj: info.file, name: (info.file as any).name }] : []) as any[];
                                                                                            inlineLessonForm.setFieldValue(['materials', name, 'file'], fileList);
                                                                                            if (raw instanceof File) {
                                                                                                const titleFromFile = cleanFileNameToTitle(raw.name);
                                                                                                inlineLessonForm.setFieldValue(['materials', name, 'title'], titleFromFile);
                                                                                                if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                                    inlineLessonForm.setFieldValue('title', titleFromFile);
                                                                                                }
                                                                                            }
                                                                                            const existingUrl = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                                            if (isEditMode && !existingUrl?.includes?.('cloudinary.com')) {
                                                                                                uploadMaterialImmediately(name, raw, t);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {rawFile ? (
                                                                                        <div className="flex flex-col items-center gap-2">
                                                                                            <CheckCircleOutlined style={{ color: PRIMARY_COLOR, fontSize: 32 }} />
                                                                                            <Text strong>{rawFile instanceof File ? rawFile.name : 'File selected'}</Text>
                                                                                            <Text type="secondary">{(rawFile instanceof File && rawFile.size) ? `${(rawFile.size / 1024 / 1024).toFixed(2)} MB` : ''}</Text>
                                                                                            <Space>
                                                                                                <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMaterialPreview(name); }}>Preview</Button>
                                                                                                <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); inlineLessonForm.setFieldValue(['materials', name, 'file'], []); inlineLessonForm.setFieldValue(['materials', name, 'title'], ''); inlineLessonForm.setFieldValue(['materials', name, 'url'], ''); pendingMaterialFilesRef.current.delete(name); }}>Remove</Button>
                                                                                            </Space>
                                                                                        </div>
                                                                                    ) : hasExistingUrl ? (
                                                                                        <div className="flex flex-col items-center gap-2">
                                                                                            <CheckCircleOutlined style={{ color: PRIMARY_COLOR, fontSize: 32 }} />
                                                                                            <Text strong>Uploaded: {displayName}</Text>
                                                                                            <Text type="secondary">Already saved — you can preview or replace</Text>
                                                                                            <Space>
                                                                                                <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMaterialPreview(name); }}>Preview</Button>
                                                                                                <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); inlineLessonForm.setFieldsValue({ materials: inlineLessonForm.getFieldValue('materials').map((m: any, i: number) => i === name ? { ...m, url: '', file: [], title: '', fileName: undefined } : m) }); }}>Remove</Button>
                                                                                            </Space>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex flex-col items-center gap-2">
                                                                                            <CloudUploadOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                                                                                            <Text>Drop your {t === 'Video' ? 'video' : 'PDF'} here or click to browse</Text>
                                                                                            <Text type="secondary">Max {t === 'Video' ? `${VIDEO_SIZE_LIMIT_GB}GB` : `${PDF_SIZE_LIMIT_MB}MB`}</Text>
                                                                                            {progress > 0 && progress < 100 && <Progress percent={progress} size="small" status="active" />}
                                                                                        </div>
                                                                                    )}
                                                                                </Upload>
                                                                            </div>
                                                                        </Form.Item>
                                                                    );
                                                                    if (t === 'Video') {
                                                                        return (
                                                                            <Row gutter={16} align="stretch">
                                                                                <Col xs={24} md={14}>{videoOrPdfField2}</Col>
                                                                                <Col xs={24} md={10}>
                                                                                    <Form.Item label="Subtitle (.vtt)" extra="Optional. Upload a .vtt file for captions.">
                                                                                        <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: '#d9d9d9', minHeight: 120 }}>
                                                                                            {subtitleUrl2 ? (
                                                                                                <div className="flex flex-col items-center gap-2">
                                                                                                    <CheckCircleOutlined style={{ color: PRIMARY_COLOR }} />
                                                                                                    <Text strong className="text-sm">Subtitle uploaded</Text>
                                                                                                    <Button type="link" danger size="small" icon={<CloseOutlined />} onClick={() => { inlineLessonForm.setFieldsValue({ materials: inlineLessonForm.getFieldValue('materials').map((mm: any, i: number) => i === name ? { ...mm, subtitleUrl: '' } : mm) }); }}>Remove</Button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <Upload accept=".vtt,text/vtt" maxCount={1} showUploadList={false} beforeUpload={(file) => { if (!/\.vtt$/i.test(file.name)) { message.error('Please upload a .vtt file'); return Upload.LIST_IGNORE; } uploadSubtitleImmediately(name, file); return false; }}>
                                                                                                    <div className="flex flex-col items-center gap-1 py-2">
                                                                                                        <FileTextOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                                                                                                        <Text className="text-sm">.vtt subtitle (optional)</Text>
                                                                                                        {subtitleProgress2 > 0 && subtitleProgress2 < 100 && <Progress percent={subtitleProgress2} size="small" status="active" />}
                                                                                                    </div>
                                                                                                </Upload>
                                                                                            )}
                                                                                        </div>
                                                                                    </Form.Item>
                                                                                </Col>
                                                                            </Row>
                                                                        );
                                                                    }
                                                                    return videoOrPdfField2;
                                                                }
                                                                if (t === 'YouTube') {
                                                                    const urlVal = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                    return (
                                                                        <div className="space-y-2">
                                                                            <Form.Item {...restField} name={[name, 'url']} label="Enter YouTube URL" rules={[{ required: true, message: 'Enter a YouTube URL' }]}>
                                                                                <Input
                                                                                    placeholder="https://www.youtube.com/watch?v=..."
                                                                                    addonBefore={<YoutubeOutlined />}
                                                                                    onBlur={async () => {
                                                                                        const u = inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                                                                        if (!u || !/youtube\.com|youtu\.be/i.test(u)) return;
                                                                                        setFetchingMaterialTitle(name);
                                                                                        const title = await fetchMaterialTitleFromUrl(u);
                                                                                        setFetchingMaterialTitle(null);
                                                                                        if (title) {
                                                                                            inlineLessonForm.setFieldValue(['materials', name, 'title'], title);
                                                                                            if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                                inlineLessonForm.setFieldValue('title', title);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </Form.Item>
                                                                            {fetchingMaterialTitle === name && <Text type="secondary">Fetching video title...</Text>}
                                                                            {urlVal && <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleMaterialPreview(name)}>Preview YouTube</Button>}
                                                                        </div>
                                                                    );
                                                                }
                                                                if (t === 'External URL') {
                                                                    const urlVal2 = inlineLessonForm.getFieldValue(['materials', name, 'url']);
                                                                    return (
                                                                        <div className="space-y-2">
                                                                            <Form.Item {...restField} name={[name, 'url']} label="Enter URL" rules={[{ required: true, message: 'Enter URL' }]}>
                                                                                <Input
                                                                                    placeholder="https://..."
                                                                                    addonBefore={<GlobalOutlined />}
                                                                                    onBlur={async () => {
                                                                                        const u = inlineLessonForm.getFieldValue(['materials', name, 'url'])?.trim?.();
                                                                                        if (!u || !/^https?:\/\//i.test(u)) return;
                                                                                        setFetchingMaterialTitle(name);
                                                                                        const title = await fetchMaterialTitleFromUrl(u);
                                                                                        setFetchingMaterialTitle(null);
                                                                                        if (title) {
                                                                                            inlineLessonForm.setFieldValue(['materials', name, 'title'], title);
                                                                                            if (name === 0 && !inlineLessonForm.getFieldValue('title')) {
                                                                                                inlineLessonForm.setFieldValue('title', title);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </Form.Item>
                                                                            {fetchingMaterialTitle === name && <Text type="secondary">Fetching page title...</Text>}
                                                                            {urlVal2 && <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleMaterialPreview(name)}>Preview Link</Button>}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        </Form.Item>
                                                    )}
                                                    {/* Material Title: show as soon as type is selected; auto-filled from filename, editable */}
                                                    {type && (
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'title']}
                                                            label={<><Text strong>Material Title</Text> <Text type="secondary" style={{ fontWeight: 'normal' }}>(from file name, editable)</Text></>}
                                                            rules={[{ required: true, message: 'Material title is required' }]}
                                                        >
                                                            <Input placeholder="Add file/URL to auto-fill or type title" prefix={<EditOutlined style={{ color: '#bfbfbf' }} />} />
                                                        </Form.Item>
                                                    )}
                                                    <div className="flex justify-end">
                                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} disabled={fields.length === 1}>Remove material</Button>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                        <Button type="dashed" onClick={() => add({ id: Math.random().toString(36).substr(2, 9), contentType: '', file: [], url: '', title: '' })} block icon={<PlusOutlined />} className="h-12">Add Another Material to this Lesson</Button>
                                    </div>
                                )}
                            </Form.List>
                            {!assessmentMode && (
                                <>
                                    <Divider dashed />
                                    <div className="flex items-center justify-between mb-3">
                                        <Text strong>Assessment Questions</Text>
                                        <Tag color="orange">At least 1 question per lesson is mandatory</Tag>
                                    </div>
                                    <Form.List name="questions">
                                        {(fields, { add, remove }) => (
                                            <div className="space-y-4">
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Card size="small" variant="outlined" className="border-gray-100 bg-blue-50/10" key={key} title={<Text strong className="text-xs">Question {name + 1}</Text>} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ height: '20px' }} />}>
                                                        <Row gutter={16}>
                                                            <Col span={18}>
                                                                <Form.Item {...restField} name={[name, 'questionText']} label="Question Text" rules={[{ required: true }]}>
                                                                    <TextArea placeholder="Enter the assessment question..." autoSize={{ minRows: 2 }} />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col span={6}>
                                                                <Form.Item {...restField} name={[name, 'type']} label="Type" rules={[{ required: true }]}>
                                                                    <Select>
                                                                        <Option value="MCQ">MCQ</Option>
                                                                        <Option value="Multiple Correct">Multiple Correct</Option>
                                                                        <Option value="True / False">True / False</Option>
                                                                        <Option value="Short Answer">Short Answer</Option>
                                                                    </Select>
                                                                </Form.Item>
                                                            </Col>
                                                        </Row>
                                                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.questions?.[name]?.type !== curr.questions?.[name]?.type || prev.questions?.[name]?.options !== curr.questions?.[name]?.options}>
                                                            {({ getFieldValue }) => {
                                                                const qType = getFieldValue(['questions', name, 'type']);
                                                                if (qType === 'MCQ' || qType === 'Multiple Correct') {
                                                                    return (
                                                                        <div className="bg-white p-3 rounded border border-gray-100 mb-4">
                                                                            <Form.List name={[name, 'options']}>
                                                                                {(optFields, { add: addOpt, remove: removeOpt }) => (
                                                                                    <>
                                                                                        <Row gutter={[8, 8]}>
                                                                                            {optFields.map((optField, idx) => (
                                                                                                <Col span={12} key={optField.key}>
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <Form.Item {...optField} noStyle rules={[{ required: true }]}>
                                                                                                            <Input placeholder={`Option ${idx + 1}`} size="small" />
                                                                                                        </Form.Item>
                                                                                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeOpt(idx)} disabled={optFields.length <= 2} size="small" />
                                                                                                    </div>
                                                                                                </Col>
                                                                                            ))}
                                                                                        </Row>
                                                                                        <Button type="dashed" onClick={() => addOpt()} block icon={<PlusOutlined />} size="small" className="mt-2" disabled={optFields.length >= 6}>Add Option</Button>
                                                                                    </>
                                                                                )}
                                                                            </Form.List>
                                                                            <Divider className="my-3" />
                                                                            <Form.Item name={[name, 'correctAnswers']} label="Correct Answer(s)" rules={[{ required: true }]}>
                                                                                <Select mode={qType === 'Multiple Correct' ? 'multiple' : undefined} placeholder="Select correct answer(s)">
                                                                                    {(getFieldValue(['questions', name, 'options']) || []).map((opt: string, idx: number) => (
                                                                                        <Option key={idx} value={idx.toString()}>{opt || `Option ${idx + 1}`}</Option>
                                                                                    ))}
                                                                                </Select>
                                                                            </Form.Item>
                                                                        </div>
                                                                    );
                                                                }
                                                                if (qType === 'True / False') {
                                                                    return (
                                                                        <Form.Item name={[name, 'correctAnswers']} label="Correct Answer" rules={[{ required: true }]}>
                                                                            <Select>
                                                                                <Option value="True">True</Option>
                                                                                <Option value="False">False</Option>
                                                                            </Select>
                                                                        </Form.Item>
                                                                    );
                                                                }
                                                                if (qType === 'Short Answer') {
                                                                    return (
                                                                        <Form.Item name={[name, 'correctAnswers']} label="Acceptable Answer" rules={[{ required: true }]}>
                                                                            <Input placeholder="Enter the correct answer text..." />
                                                                        </Form.Item>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        </Form.Item>
                                                        <Form.Item {...restField} name={[name, 'marks']} label="Marks" rules={[{ required: true }]}>
                                                            <InputNumber min={1} size="small" />
                                                        </Form.Item>
                                                    </Card>
                                                ))}
                                                <Button type="dashed" onClick={() => add({ id: Math.random().toString(36).substr(2, 9), type: 'MCQ', marks: 1, options: ['', ''], correctAnswers: [] })} block icon={<PlusOutlined />}>Add Question to this Lesson</Button>
                                            </div>
                                        )}
                                    </Form.List>
                                </>
                            )}
                            <div className="flex justify-end gap-3 mt-6">
                                <Button onClick={cancelLessonEdit}>Cancel</Button>
                                <Button type="primary" onClick={saveInlineLesson} style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}>Save Lesson Group</Button>
                            </div>
                        </Form>
                    </Card>
                )}

                {lessons.length === 0 && !isAddingLesson && (
                    <Empty description="No lessons added yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
            </div>
        </div >
    );

    const renderStep3 = () => (
        <div className="pt-4 pb-8">
            <div className="mb-6 bg-green-50 p-4 rounded-lg flex items-center gap-3 border border-green-100">
                <CheckCircleOutlined style={{ fontSize: '24px', color: PRIMARY_COLOR }} />
                <div>
                    <Title level={5} style={{ margin: 0, color: '#135200' }}>Ready to Publish?</Title>
                    <Text type="secondary" style={{ fontSize: '13px' }}>Review all details below before making the course live.</Text>
                </div>
            </div>

            <Row gutter={32}>
                <Col span={14}>
                    <Card title="Course Overview" size="small" bordered={false} className="shadow-sm h-full">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="py-2 text-gray-500 w-1/3">Title</td>
                                    <td className="py-2 font-medium">{form.getFieldValue('title')}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-500">Duration</td>
                                    <td className="py-2">{form.getFieldValue('completionTimeValue')} {form.getFieldValue('completionTimeUnit')}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-500">Mandatory</td>
                                    <td className="py-2">
                                        {form.getFieldValue('isMandatory') ?
                                            <Tag color="error">MANDATORY</Tag> :
                                            <Tag color="default">OPTIONAL</Tag>
                                        }
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-500">Assignment</td>
                                    <td className="py-2">
                                        <Tag>{form.getFieldValue('assignmentType') || "Don't assign to anyone"}</Tag>
                                        {form.getFieldValue('assignmentType') && form.getFieldValue('assignmentType') !== "Don't assign to anyone" && (
                                            <div className="mt-1 text-xs text-gray-400">
                                                {form.getFieldValue('assignmentType') === 'By Department'
                                                    ? `${form.getFieldValue('departments')?.length || 0} Departments`
                                                    : `${form.getFieldValue('employees')?.length || 0} Employees`
                                                }
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="mt-4">
                            <Text strong className="block mb-1">Curriculum Summary</Text>
                            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                                <List
                                    size="small"
                                    dataSource={lessons}
                                    renderItem={(item, idx) => (
                                        <List.Item>
                                            <div className="w-full">
                                                <div className="flex justify-between w-full">
                                                    <Space>
                                                        <Text strong>{idx + 1}.</Text>
                                                        <Text ellipsis style={{ maxWidth: 200 }}>{item.title}</Text>
                                                    </Space>
                                                    <Tag color="success">{item.materials.length} Materials</Tag>
                                                </div>
                                                <div className="pl-6 mt-1 flex flex-wrap gap-1">
                                                    {item.materials.map((m, midx) => (
                                                        <Tag key={midx} className="text-[10px] m-0" bordered={false}>
                                                            {m.contentType}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={10}>
                    <Space direction="vertical" className="w-full">
                        <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden border">
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Course" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">No content</div>
                            )}
                        </div>
                        <Card title="Content Breakdown" size="small" bordered={false} className="shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-2 bg-emerald-50 rounded">
                                    <VideoCameraOutlined className="text-emerald-500 text-lg mb-1" />
                                    <div className="text-xs text-gray-500">Videos</div>
                                    <div className="font-bold">
                                        {lessons.reduce((acc, l) => acc + l.materials.filter(m => m.contentType === 'Video').length, 0)}
                                    </div>
                                </div>
                                <div className="text-center p-2 bg-red-50 rounded">
                                    <YoutubeOutlined className="text-red-500 text-lg mb-1" />
                                    <div className="text-xs text-gray-500">YouTube</div>
                                    <div className="font-bold">
                                        {lessons.reduce((acc, l) => acc + l.materials.filter(m => m.contentType === 'YouTube').length, 0)}
                                    </div>
                                </div>
                                <div className="text-center p-2 bg-orange-50 rounded">
                                    <FilePdfOutlined className="text-orange-500 text-lg mb-1" />
                                    <div className="text-xs text-gray-500">PDFs</div>
                                    <div className="font-bold">
                                        {lessons.reduce((acc, l) => acc + l.materials.filter(m => m.contentType === 'PDF').length, 0)}
                                    </div>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                    <GlobalOutlined className="text-green-500 text-lg mb-1" />
                                    <div className="text-xs text-gray-500">Links</div>
                                    <div className="font-bold">
                                        {lessons.reduce((acc, l) => acc + l.materials.filter(m => m.contentType === 'External URL').length, 0)}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Space>
                </Col>
            </Row>
        </div>
    );

    // --- Main Modal Render ---
    return (
        <Modal
            title={<Title level={4} style={{ margin: 0 }}>{initialData ? 'Edit Course' : 'Create New Course'}</Title>}
            open={open}
            onCancel={onClose}
            width={1000}
            footer={
                <div className="flex justify-between items-center px-4">
                    <Button onClick={onClose}>Cancel</Button>
                    <Space>
                        {currentStep > 0 && <Button onClick={handleBack} icon={<ArrowLeftOutlined />}>Back</Button>}
                        {currentStep < 2 ? (
                            <Button type="primary" onClick={handleNext} style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}>
                                Next <ArrowRightOutlined />
                            </Button>
                        ) : (
                            <>
                                <Button loading={loading} onClick={() => onFinalSubmit('Draft')} icon={<SaveOutlined />}>
                                    Save as Draft
                                </Button>
                                <Button
                                    type="primary"
                                    loading={loading}
                                    onClick={() => onFinalSubmit('Published')}
                                    style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
                                    icon={<CheckCircleOutlined />}
                                >
                                    Publish Course
                                </Button>
                            </>
                        )}
                    </Space>
                </div>
            }
            bodyStyle={{ padding: '24px', height: '600px', overflowY: 'auto' }}
            centered
            destroyOnClose
            maskClosable={false}
        >
            <div className="mb-6 px-12">
                <Steps
                    current={currentStep}
                    items={[
                        { title: 'Details', icon: <FileTextOutlined /> },
                        { title: 'Curriculum', icon: <UserOutlined /> },
                        { title: 'Review', icon: <EyeOutlined /> }
                    ]}
                />
            </div>

            <div className="wizard-content min-h-[400px]">
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ categories: [], languages: [], isMandatory: false, completionTimeUnit: 'Weeks', isLiveAssessment: false, assignmentType: "Don't assign to anyone" }}
                    style={{ display: currentStep === 0 ? 'block' : 'none' }}
                >
                    {renderStep1Content()}
                </Form>
                {currentStep === 1 && renderStep2()}
                {currentStep === 2 && renderStep3()}
            </div>

            <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)} centered>
                <img alt="Thumbnail Preview" style={{ width: '100%' }} src={thumbnailPreview} />
            </Modal>
            {renderMaterialPreviewModal()}

            {/* Progress when uploading material files (edit: on lesson save; new course: on final submit) */}
            <Modal
                title="Uploading materials"
                open={materialSaveUploadProgress.visible}
                footer={null}
                closable={false}
                maskClosable={false}
                width={420}
                centered
            >
                <div className="py-2">
                    <div className="mb-4">
                        <Text type="secondary" className="block mb-2">
                            Uploading {materialSaveUploadProgress.totalFiles} material(s) to cloud storage...
                        </Text>
                        <Progress
                            percent={Math.round(
                                materialSaveUploadProgress.totalFiles > 0
                                    ? (Object.values(materialSaveUploadProgress.perFile).reduce((a, b) => a + b, 0) / materialSaveUploadProgress.totalFiles)
                                    : 0
                            )}
                            status="active"
                            strokeColor={PRIMARY_COLOR}
                        />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Object.entries(materialSaveUploadProgress.fileNames).map(([matIndexStr, fileName]) => {
                            const matIndex = Number(matIndexStr);
                            const percent = materialSaveUploadProgress.perFile[matIndex] ?? 0;
                            return (
                                <div key={matIndex} className="flex items-center gap-3">
                                    <Text ellipsis className="flex-1 text-sm" title={fileName}>
                                        {fileName}
                                    </Text>
                                    <Progress percent={percent} size="small" status="active" style={{ marginBottom: 0, width: 100 }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </Modal>
    );
};

export default CourseFormWizard;