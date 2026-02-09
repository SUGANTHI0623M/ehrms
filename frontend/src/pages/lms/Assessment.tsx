import React, { useState, useEffect, useMemo } from "react";
import {
    Card, Button, Radio, Checkbox, Input, Progress, Typography,
    Alert, Tag, Spin, Row, Col, Empty, message, Layout, Space, Avatar, Badge
} from "antd";
import {
    ClockCircleOutlined, RightOutlined, LeftOutlined,
    CheckCircleOutlined, CloseCircleOutlined, TrophyOutlined,
    FormOutlined, InfoCircleOutlined
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { useGetCourseByIdQuery, useSubmitCourseAssessmentMutation } from "@/store/api/lmsApi";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const Assessment: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const { data: courseData, isLoading } = useGetCourseByIdQuery(courseId || '', { skip: !courseId });
    const [submitAssessment, { isLoading: isSubmitting }] = useSubmitCourseAssessmentMutation();

    const course = courseData?.data?.course;
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
    const [timeRemaining, setTimeRemaining] = useState(1800);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any>(null);

    const flatQuestions = useMemo(() => {
        if (!course?.assessmentQuestions) return [];
        return course.assessmentQuestions.flatMap((group: any) =>
            group.questions.map((q: any) => ({
                ...q,
                lessonTitle: group.lessonTitle
            }))
        );
    }, [course]);

    useEffect(() => {
        if (isFinished || flatQuestions.length === 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isFinished, flatQuestions.length]);

    const handleAnswerSelect = (questionId: string, answer: string, isMultiple = false) => {
        if (isMultiple) {
            const current = selectedAnswers[questionId] || [];
            if (current.includes(answer)) {
                setSelectedAnswers((prev) => ({ ...prev, [questionId]: current.filter((a) => a !== answer) }));
            } else {
                setSelectedAnswers((prev) => ({ ...prev, [questionId]: [...current, answer] }));
            }
        } else {
            setSelectedAnswers((prev) => ({ ...prev, [questionId]: [answer] }));
        }
    };

    const handleShortAnswerChange = (questionId: string, value: string) => {
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: [value] }));
    };

    const handleNext = () => {
        if (currentQuestionIdx < flatQuestions.length - 1) {
            setCurrentQuestionIdx(currentQuestionIdx + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!courseId) return;

        try {
            const answers = Object.entries(selectedAnswers).map(([questionId, ans]) => ({
                questionId,
                answers: ans
            }));

            const res = await submitAssessment({ courseId, answers }).unwrap();
            setResults(res.data);
            setIsFinished(true);
            message.success(`Assessment Submitted. Score: ${res.data.score}%`);
        } catch (error: any) {
            message.error(error.data?.message || "Submission Failed");
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-vh-100 bg-[#f8f9fa]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    if (!course || flatQuestions.length === 0) {
        return (
            <MainLayout>
                <div className="p-8 text-center bg-white min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
                    <Empty description="No assessment questions found for this course." />
                    <Button type="primary" onClick={() => navigate(-1)} className="mt-4 px-8">
                        Back to Course
                    </Button>
                </div>
            </MainLayout>
        );
    }

    if (isFinished && results) {
        const passed = results.passed;
        const questionResults: Array<{ questionId: string; correctAnswer: string | string[]; userAnswer: string | string[]; isCorrect: boolean; marksAwarded: number; marksTotal: number }> = results.questionResults || [];
        const formatAnswer = (a: string | string[]) => (Array.isArray(a) ? a.join(', ') : String(a ?? ''));

        return (
            <MainLayout>
                <div className="p-6 md:p-8 bg-[#f8f9fa] min-h-[calc(100vh-64px)]">
                    <div className="max-w-3xl mx-auto">
                        <Card bordered={false} className="text-center shadow-sm rounded-xl overflow-hidden p-8 mb-6">
                            <Avatar
                                size={64}
                                icon={passed ? <TrophyOutlined /> : <CloseCircleOutlined />}
                                className={passed ? 'bg-green-50 text-green-600 mb-6' : 'bg-red-50 text-red-600 mb-6'}
                            />
                            <Title level={4} className="!m-0 mb-1">{passed ? 'Assessment Completed' : 'Assessment Failed'}</Title>
                            <Text type="secondary" className="block mb-8">Performance report for {course.title}</Text>

                            <Row gutter={24} justify="center" className="mb-8">
                                <Col span={10}>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <Text type="secondary" className="uppercase text-[9px] font-bold block mb-1">Your Score</Text>
                                        <Title level={2} style={{ margin: 0, color: passed ? '#52c41a' : '#ff4d4f' }}>{results.score}%</Title>
                                    </div>
                                </Col>
                                <Col span={10}>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <Text type="secondary" className="uppercase text-[9px] font-bold block mb-1">Passing Mark</Text>
                                        <Title level={2} style={{ margin: 0 }}>{course.qualificationScore || 80}%</Title>
                                    </div>
                                </Col>
                            </Row>

                            <Space size="middle">
                                <Button type="primary" onClick={() => navigate(`/lms/employee/course/${courseId}`)}>
                                    Go to Course
                                </Button>
                                <Button onClick={() => navigate('/lms/employee/dashboard')}>
                                    Dashboard
                                </Button>
                            </Space>
                        </Card>

                        {questionResults.length > 0 && (
                            <Card title={<Text strong>Answer breakdown</Text>} bordered={false} className="shadow-sm rounded-xl">
                                <div className="space-y-4">
                                    {questionResults.map((r, idx) => {
                                        const q = flatQuestions.find((qu: any) => qu.id === r.questionId);
                                        return (
                                            <div key={r.questionId} className={`p-4 rounded-lg border ${r.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <Text strong className="text-sm">Q{idx + 1}. {q?.questionText ?? 'Question'}</Text>
                                                    <Tag color={r.isCorrect ? 'success' : 'error'}>{r.marksAwarded}/{r.marksTotal} marks</Tag>
                                                </div>
                                                <div className="text-left space-y-1 text-sm">
                                                    <div><Text type="secondary">Your answer: </Text><Text>{formatAnswer(r.userAnswer) || '—'}</Text></div>
                                                    {!r.isCorrect && <div><Text type="secondary">Correct answer: </Text><Text className="text-green-600">{formatAnswer(r.correctAnswer)}</Text></div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </MainLayout>
        );
    }

    const question = flatQuestions[currentQuestionIdx];
    const progress = Math.round(((currentQuestionIdx + 1) / flatQuestions.length) * 100);
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const currentQuestionAnswers = selectedAnswers[question.id] || [];

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 md:p-8 bg-[#f8f9fa] min-h-[calc(100vh-64px)] overflow-x-hidden">
                <div className="max-w-6xl mx-auto">
                    {/* Header (Admin Style) */}
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                        <div>
                            <Title level={4} style={{ margin: 0 }}>Final Assessment</Title>
                            <Text type="secondary" className="text-sm">Certification exam for {course.title}</Text>
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg shadow-sm border border-gray-100 bg-white ${timeRemaining < 300 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                            <ClockCircleOutlined />
                            <Text strong className="font-mono">{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}</Text>
                        </div>
                    </div>

                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={17}>
                            <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden mb-4">
                                <div className="p-2">
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="flex flex-col">
                                            <Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider">Progress</Text>
                                            <Text strong className="text-xs">Question {currentQuestionIdx + 1} of {flatQuestions.length}</Text>
                                        </div>
                                        <Tag className="m-0 text-[10px] border-none bg-emerald-50 text-emerald-600">{question.lessonTitle}</Tag>
                                    </div>
                                    <Progress percent={progress} showInfo={false} strokeColor="#10b981" className="m-0 mb-8" strokeWidth={4} />

                                    <div className="py-2">
                                        <Title level={5} className="mb-6 leading-relaxed">{question.questionText}</Title>
                                        <div className="space-y-3">
                                            {question.type === 'Short Answer' ? (
                                                <Input.TextArea rows={4} placeholder="Type your answer..." value={currentQuestionAnswers[0] || ''} onChange={(e) => handleShortAnswerChange(question.id, e.target.value)} className="rounded-lg p-3 text-sm" />
                                            ) : question.type === 'Multiple Correct' ? (
                                                <div className="space-y-2">
                                                    {(question.options || []).map((option: string, idx: number) => {
                                                        const isSelected = currentQuestionAnswers.includes(option);
                                                        return (
                                                            <div key={idx} className={`p-4 min-h-[48px] rounded-lg border cursor-pointer transition-all touch-manipulation flex items-center ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`} onClick={() => handleAnswerSelect(question.id, option, true)}>
                                                                <Space size="middle">
                                                                    <Checkbox checked={isSelected} />
                                                                    <Text className={`text-sm sm:text-base ${isSelected ? 'text-emerald-600 font-medium' : 'text-gray-600'}`}>{option}</Text>
                                                                </Space>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <Radio.Group
                                                    value={currentQuestionAnswers[0]}
                                                    onChange={(e) => handleAnswerSelect(question.id, e.target.value, false)}
                                                    className="w-full"
                                                >
                                                    <div className="space-y-2">
                                                        {((question.type === 'True / False' ? (question.options?.length ? question.options : ['True', 'False']) : question.options) || []).map((option: string, idx: number) => (
                                                            <div key={idx} className={`p-4 min-h-[48px] rounded-lg border cursor-pointer transition-all touch-manipulation flex items-center ${currentQuestionAnswers[0] === option ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`} onClick={() => handleAnswerSelect(question.id, option, false)}>
                                                                <Space size="middle">
                                                                    <Radio value={option} />
                                                                    <Text className={`text-sm sm:text-base ${currentQuestionAnswers[0] === option ? 'text-emerald-600 font-medium' : 'text-gray-600'}`}>{option}</Text>
                                                                </Space>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Radio.Group>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between gap-3 mt-10 pt-6 border-t border-gray-50 flex-wrap">
                                        <Button size="large" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx(prev => prev - 1)} icon={<LeftOutlined />} className="min-h-[44px] touch-target">Previous</Button>
                                        <Button type="primary" size="large" disabled={(currentQuestionAnswers.length === 0 && question.type !== 'Short Answer') || isSubmitting} onClick={handleNext} loading={isSubmitting} icon={currentQuestionIdx === flatQuestions.length - 1 ? <CheckCircleOutlined /> : <RightOutlined />} iconPosition="end" className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 min-h-[44px] touch-target">
                                            {currentQuestionIdx === flatQuestions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} lg={7}>
                            <Card title={<Text strong className="text-xs">Exam Navigator</Text>} bordered={false} className="shadow-sm rounded-xl mb-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {flatQuestions.map((_: any, idx: number) => {
                                        const isCurrent = currentQuestionIdx === idx;
                                        const isAnswered = selectedAnswers[flatQuestions[idx].id]?.length > 0;
                                        return (
                                            <Button key={idx} type={isCurrent ? 'primary' : 'default'} size="small" className={`h-8 p-0 text-xs font-bold border-none ${isCurrent ? 'bg-emerald-600' : ''} ${!isCurrent && isAnswered ? 'bg-emerald-50 text-emerald-600' : ''}`} onClick={() => setCurrentQuestionIdx(idx)} block>{idx + 1}</Button>
                                        )
                                    })}
                                </div>
                            </Card>
                            <Alert message={<Text strong className="text-[11px]">Honor Code</Text>} description={<ul className="pl-4 list-disc text-[10px] m-0 space-y-1 mt-1 opacity-80"><li>No refreshing during test.</li><li>Passing mark: {course.qualificationScore || 80}%.</li></ul>} type="info" showIcon className="rounded-xl" />
                        </Col>
                    </Row>
                </div>
            </div>
        </MainLayout>
    );
};

export default Assessment;
