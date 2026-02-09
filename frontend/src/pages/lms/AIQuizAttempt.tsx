import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from "@/components/MainLayout";
import {
    Button, Card, Typography, Radio, Space,
    Progress, Spin, Tag, Divider, message,
    Alert, Layout, Avatar, Row, Col, Empty
} from 'antd';
import {
    RobotOutlined, CheckCircleOutlined, TrophyOutlined,
    HomeOutlined, ArrowLeftOutlined, ArrowRightOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { useGetAIQuizByIdQuery, useSubmitAIQuizMutation } from "@/store/api/lmsApi";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const AIQuizAttempt: React.FC = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const { data: quizData, isLoading } = useGetAIQuizByIdQuery(quizId || '', { skip: !quizId });
    const [submitQuiz, { isLoading: isSubmitting }] = useSubmitAIQuizMutation();

    const quiz = quizData?.data;
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        if (quiz?.status === 'Submitted') {
            setIsFinished(true);
            setResults({
                score: quiz.score,
                totalQuestions: quiz.questions.length,
                responses: quiz.responses
            });
        }
    }, [quiz]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-vh-100 bg-[#f8f9fa]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    if (!quiz) {
        return (
            <MainLayout>
                <div className="p-8 text-center bg-white min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
                    <Empty description="Interactive practice not found." />
                    <Button type="primary" onClick={() => navigate('/lms/employee/dashboard')} className="mt-4">
                        Back to Library
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    // Safety check: if no questions or invalid index, show error
    if (!quiz.questions || quiz.questions.length === 0 || !currentQuestion) {
        return (
            <MainLayout>
                <div className="p-8 text-center bg-white min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
                    <Empty description="No questions available for this quiz." />
                    <Button type="primary" onClick={() => navigate('/lms/employee/dashboard')} className="mt-4">
                        Back to Dashboard
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const handleAnswerChange = (value: string) => {
        setAnswers({ ...answers, [currentQuestionIndex]: value });
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        try {
            const formattedResponses = Object.entries(answers).map(([index, answer]) => ({
                questionIndex: parseInt(index),
                answer
            }));
            if (formattedResponses.length < quiz.questions.length) {
                message.warning('Please answer all questions before submitting.');
                return;
            }
            const completionTime = Math.round((Date.now() - startTime) / 1000);
            const result = await submitQuiz({
                quizId: quizId!,
                responses: formattedResponses,
                completionTime
            }).unwrap();
            setResults(result.data);
            setIsFinished(true);
            message.success('Practice complete!');
        } catch (err: any) {
            message.error(err.data?.message || 'Failed to submit feedback');
        }
    };

    if (isFinished && results) {
        const percentage = Math.round((results.score / results.totalQuestions) * 100);
        return (
            <MainLayout>
                <div className="p-6 md:p-8 bg-[#f8f9fa] min-h-[calc(100vh-64px)]">
                    <div className="max-w-4xl mx-auto">
                        <Card bordered={false} className="text-center shadow-sm rounded-xl overflow-hidden p-8 mb-8">
                            <Avatar size={64} icon={<TrophyOutlined />} className="bg-yellow-50 text-yellow-600 mb-4" />
                            <Title level={4} className="!m-0 mb-1">Knowledge Review Complete</Title>
                            <Text type="secondary" className="block mb-8">Focused practice for {quiz.lessonTitles.join(', ')}</Text>

                            <Row gutter={[24, 24]} justify="center" className="mb-8">
                                <Col xs={12} sm={8}>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <Text type="secondary" className="uppercase text-[9px] font-bold block mb-1">Proficiency</Text>
                                        <Title level={2} style={{ margin: 0, color: percentage >= 70 ? '#52c41a' : '#faad14' }}>{percentage}%</Title>
                                    </div>
                                </Col>
                                <Col xs={12} sm={8}>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <Text type="secondary" className="uppercase text-[9px] font-bold block mb-1">Score</Text>
                                        <Title level={2} style={{ margin: 0 }}>{results.score}<Text type="secondary" className="text-sm">/{results.totalQuestions}</Text></Title>
                                    </div>
                                </Col>
                            </Row>

                            <Space size="middle">
                                <Button type="primary" onClick={() => navigate(`/lms/employee/course/${quiz.courseId}`)}>Back to Course</Button>
                                <Button onClick={() => navigate('/lms/employee/dashboard')}>Dashboard</Button>
                            </Space>
                        </Card>

                        <div className="space-y-4">
                            {quiz.questions.map((q: any, idx: number) => {
                                const userResponse = results.responses.find((r: any) => r.questionIndex === idx);
                                const isCorrect = userResponse?.isCorrect;
                                return (
                                    <Card key={idx} bordered={false} className="shadow-sm rounded-xl overflow-hidden p-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Tag color={isCorrect ? 'success' : 'error'} className="m-0 border-none px-2 text-[10px]">{isCorrect ? 'Correct' : 'Incorrect'}</Tag>
                                            <Text type="secondary" className="text-[10px] font-bold">QUESTION {idx + 1}</Text>
                                        </div>
                                        <Title level={5} className="!m-0 mb-4">{q.question}</Title>
                                        <div className="space-y-2 mb-4">
                                            <div className={`p-3 rounded-lg text-xs ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700 font-medium'}`}>
                                                <Text type="secondary" className="block text-[8px] uppercase font-bold mb-0.5">Your Response</Text>
                                                {userResponse?.answer}
                                            </div>
                                            {!isCorrect && (
                                                <div className="p-3 rounded-lg text-xs bg-green-50 text-green-700">
                                                    <Text type="secondary" className="block text-[8px] uppercase font-bold mb-0.5">Correct Answer</Text>
                                                    {userResponse?.resolvedCorrectAnswer ?? q.correctAnswer}
                                                </div>
                                            )}
                                        </div>
                                        <Alert message={<Text className="text-[11px] font-bold">AI Tutor Rationale</Text>} description={<Text className="text-[11px] opacity-80 italic">{q.explanation}</Text>} type="info" className="rounded-lg bg-blue-50/50 border-none" />
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 md:p-8 bg-[#f8f9fa] min-h-[calc(100vh-64px)] overflow-x-hidden">
                <div className="max-w-4xl mx-auto">
                    {/* Header (Admin Style) */}
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                        <div className="flex items-center gap-3">
                            <Avatar size={40} icon={<RobotOutlined />} className="bg-indigo-600 shadow-sm" />
                            <div>
                                <Title level={4} style={{ margin: 0 }}>AI Practice Lab</Title>
                                <Text type="secondary" className="text-sm">Personalized skill validation for current learning modules</Text>
                            </div>
                        </div>
                        <div className="bg-white px-4 py-1.5 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                            <Text type="secondary" className="text-[10px] uppercase font-bold">Progress</Text>
                            <Progress percent={Math.round(progress)} size={[100, 8]} strokeColor="#1890ff" />
                        </div>
                    </div>

                    <Card bordered={false} className="shadow-sm rounded-xl overflow-hidden mb-6" bodyStyle={{ padding: '32px' }}>
                        <div className="mb-8">
                            <Tag color="purple" className="mb-2 border-none px-2 rounded-full text-[10px]">{currentQuestion.type}</Tag>
                            <Title level={5} className="!m-0 leading-relaxed">{currentQuestion.question}</Title>
                        </div>

                        <div className="mb-10">
                            {currentQuestion.type === 'MCQ' ? (
                                <div className="space-y-3">
                                    {currentQuestion.options?.map((opt: string, idx: number) => {
                                        const isSelected = answers[currentQuestionIndex] === opt;
                                        return (
                                            <div key={idx} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-primary bg-green-50' : 'border-gray-50 bg-[#fafafa]'}`} onClick={() => handleAnswerChange(opt)}>
                                                <Space size="middle"><Radio checked={isSelected} /><Text className={`text-sm ${isSelected ? 'text-green-700 font-medium' : 'text-gray-700'}`}>{opt}</Text></Space>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : currentQuestion.type === 'True/False' ? (
                                <Row gutter={16}>
                                    <Col span={12}><Button block size="large" className={`h-20 rounded-xl text-lg font-bold border-2 ${answers[currentQuestionIndex] === 'True' ? 'border-primary bg-green-50 text-green-700' : 'border-gray-100'}`} onClick={() => handleAnswerChange('True')}>True</Button></Col>
                                    <Col span={12}><Button block size="large" className={`h-20 rounded-xl text-lg font-bold border-2 ${answers[currentQuestionIndex] === 'False' ? 'border-primary bg-green-50 text-green-700' : 'border-gray-100'}`} onClick={() => handleAnswerChange('False')}>False</Button></Col>
                                </Row>
                            ) : null}
                        </div>

                        <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                            <Button type="text" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)} icon={<ArrowLeftOutlined />}>Previous</Button>
                            <Button type="primary" onClick={handleNext} loading={isSubmitting} disabled={!answers[currentQuestionIndex]} icon={currentQuestionIndex === quiz.questions.length - 1 ? <CheckCircleOutlined /> : <ArrowRightOutlined />} iconPosition="end">
                                {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Session' : 'Continue'}
                            </Button>
                        </div>
                    </Card>

                    <Alert icon={<RobotOutlined className="text-indigo-400" />} message={<Text strong className="text-[10px]">Note</Text>} description={<Text className="text-[10px] opacity-70">Focus on understanding each concept. This practice helps reinforce your knowledge hub progress.</Text>} type="info" showIcon className="bg-white border-gray-100 rounded-xl shadow-sm" />
                </div>
            </div>
        </MainLayout>
    );
};

export default AIQuizAttempt;
