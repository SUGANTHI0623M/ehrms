import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from "@/components/MainLayout";
import {
    Button, Typography, Layout, Row, Col, Card,
    List, Spin, Empty, Avatar, Space, Tag, Divider
} from "antd";
import {
    ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined,
    CheckCircleOutlined, ClockCircleOutlined, BookOutlined,
    SafetyCertificateOutlined, RocketOutlined, TranslationOutlined,
    GlobalOutlined, TrophyOutlined, TeamOutlined, RiseOutlined
} from "@ant-design/icons";
import { useGetCourseByIdQuery } from "@/store/api/lmsApi";
import { getFileUrl } from '@/utils/url';


const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

const CoursePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: courseData, isLoading } = useGetCourseByIdQuery(id || '');

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-vh-100">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    const course = courseData?.data?.course;

    if (!course) return (
        <MainLayout>
            <div className="p-8 text-center bg-white min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
                <Empty description="Course not found" />
                <Button type="primary" className="mt-4 rounded-lg px-6" onClick={() => navigate('/lms/employee/dashboard')}>
                    Back to Library
                </Button>
            </div>
        </MainLayout>
    );



    return (
        <MainLayout>
            <div className="bg-white min-h-screen overflow-x-hidden pb-20">
                {/* 1. HERO SECTION */}
                <div className="relative bg-gray-900 pt-16 pb-24 text-white overflow-hidden">
                    {/* Background Pattern/Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 to-black/90 z-10" />
                    {course.thumbnailUrl && (
                        <img
                            src={getFileUrl(course.thumbnailUrl)}
                            className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
                            alt=""
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/1200x800/f3f4f6/9ca3af?text=No+Preview';
                            }}
                        />
                    )}

                    <div className="max-w-7xl mx-auto px-6 relative z-20">
                        <Button
                            type="text"
                            className="mb-6 pl-0 text-white/60 hover:text-emerald-400 flex items-center gap-2 font-medium text-xs transition-colors uppercase tracking-widest"
                            onClick={() => navigate(-1)}
                            icon={<ArrowLeftOutlined style={{ fontSize: '10px' }} />}
                        >
                            Back to Library
                        </Button>

                        <Row gutter={[48, 48]} align="middle">
                            <Col xs={24} lg={15}>
                                <div className="space-y-6">
                                    <Space wrap>
                                        <Tag color="green" className="rounded-full px-4 py-0.5 border-none font-bold uppercase text-[10px] tracking-wider bg-emerald-500 text-white">
                                            {course.category || 'Professional Skills'}
                                        </Tag>
                                        <span className="text-white/60 text-xs flex items-center gap-2">
                                            <TranslationOutlined /> {course.language || 'English'}
                                        </span>
                                    </Space>

                                    <Title level={1} className="!text-white !m-0 !text-4xl md:!text-5xl font-extrabold leading-tight">
                                        {course.title}
                                    </Title>

                                    <Paragraph className="text-white/70 text-lg max-w-2xl leading-relaxed">
                                        {course.description ? course.description.substring(0, 200) + '...' : "Master these core concepts with our expert-led curriculum designed for rapid skill acquisition and professional development."}
                                    </Paragraph>

                                    <div className="flex flex-wrap items-center gap-8 text-sm">
                                        <div className="flex items-center gap-2">
                                            <TrophyOutlined className="text-emerald-400 text-lg" />
                                            <div>
                                                <div className="text-white font-bold">Certification</div>
                                                <div className="text-white/40 text-xs uppercase tracking-tighter">Upon Completion</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ClockCircleOutlined className="text-blue-400 text-lg" />
                                            <div>
                                                <div className="text-white font-bold">{course.completionDuration?.value} {course.completionDuration?.unit}</div>
                                                <div className="text-white/40 text-xs uppercase tracking-tighter">Total Duration</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <TeamOutlined className="text-purple-400 text-lg" />
                                            <div>
                                                <div className="text-white font-bold">{course.assignedEmployees?.length || 0} Learners</div>
                                                <div className="text-white/40 text-xs uppercase tracking-tighter">Active Enrollment</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>

                {/* 2. PAGE CONTENT GRID */}
                <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-30">
                    <Row gutter={[32, 32]}>
                        <Col xs={24} lg={16}>
                            <div className="space-y-8">
                                {/* About Section */}
                                <Card
                                    bordered={false}
                                    className="shadow-xl rounded-2xl overflow-hidden border-t-4 border-t-emerald-500"
                                    bodyStyle={{ padding: '32px' }}
                                >
                                    <Title level={4} className="!mb-6 font-bold flex items-center gap-3">
                                        <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                                        About the Course
                                    </Title>
                                    <Paragraph className="text-gray-600 text-base leading-relaxed">
                                        {course.description || "Detailed course description goes here. This module covers essential skills needed for professional excellence in this field."}
                                    </Paragraph>

                                    <Divider className="my-8" />

                                    <Title level={5} className="!mb-6 font-bold uppercase text-xs tracking-widest text-gray-400">
                                        What you will learn
                                    </Title>
                                    <Row gutter={[16, 16]}>
                                        {[
                                            "Practical industry concepts and workflows",
                                            "Case studies and real-world examples",
                                            "Critical thinking and problem solving",
                                            "Tools and methodologies for professional growth",
                                            "Validation through assessments",
                                            "Industry standard best practices"
                                        ].map((item, i) => (
                                            <Col xs={24} sm={12} key={i}>
                                                <Space align="start" className="w-full">
                                                    <CheckCircleOutlined className="text-emerald-500 mt-1" />
                                                    <Text className="text-gray-600 text-sm">{item}</Text>
                                                </Space>
                                            </Col>
                                        ))}
                                    </Row>
                                </Card>

                                {/* Curriculum Section */}
                                <Card
                                    bordered={false}
                                    className="shadow-sm rounded-2xl overflow-hidden"
                                    title={
                                        <div className="flex items-center justify-between w-full py-2">
                                            <Title level={4} className="!m-0 font-bold flex items-center gap-3">
                                                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                                                Course Content
                                            </Title>
                                            <Tag className="rounded-full border-none px-3 bg-gray-100 font-bold text-gray-500 uppercase text-[10px]">
                                                {(course.materials?.length || 0) + (course.contents?.length || 0)} Modules
                                            </Tag>
                                        </div>
                                    }
                                    bodyStyle={{ padding: '0 32px 32px 32px' }}
                                >
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={[...(course.materials || []), ...(course.contents || [])]}
                                        renderItem={(item: any, idx: number) => (
                                            <List.Item className="px-0 border-b border-gray-100 last:border-none py-5 hover:bg-gray-50/50 transition-colors group cursor-default">
                                                <List.Item.Meta
                                                    avatar={
                                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                            {item.type === 'VIDEO' || item.type === 'YOUTUBE' ? <PlayCircleOutlined /> : <FileTextOutlined />}
                                                        </div>
                                                    }
                                                    title={<Text strong className="text-base group-hover:text-emerald-600 transition-colors">Module {idx + 1}: {item.title}</Text>}
                                                    description={
                                                        <Space split={<Divider type="vertical" className="bg-gray-100" />} className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Tag color={item.type === 'VIDEO' ? 'blue' : 'orange'} className="m-0 border-none px-2 rounded-sm text-[8px]">{item.type}</Tag>
                                                            </span>
                                                            <span>Approx. 15-30 Mins</span>
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                        locale={{ emptyText: <Empty description="The curriculum is being updated" /> }}
                                    />
                                </Card>
                            </div>
                        </Col>

                        <Col xs={24} lg={8}>
                            <Card
                                bordered={false}
                                className="shadow-2xl rounded-2xl overflow-hidden sticky top-8"
                                cover={
                                    <div className="aspect-video bg-gray-900 relative group cursor-pointer overflow-hidden">
                                        {course.thumbnailUrl ? (
                                            <img
                                                src={getFileUrl(course.thumbnailUrl)}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt={course.title}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900">
                                                <PlayCircleOutlined className="text-white/40 text-7xl" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl">
                                                <PlayCircleOutlined />
                                            </div>
                                        </div>
                                    </div>
                                }
                                bodyStyle={{ padding: '32px' }}
                            >
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Button
                                            type="primary"
                                            block
                                            size="large"
                                            className="h-14 text-base font-extrabold shadow-lg rounded-xl bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 transform active:scale-95 transition-all"
                                            icon={<RocketOutlined className="mr-2" />}
                                            onClick={() => navigate(`/lms/employee/course/${course._id}`)}
                                        >
                                            Enrol & Start Learning
                                        </Button>
                                        <Text className="text-[10px] text-gray-400 text-center block uppercase tracking-tighter">Full lifetime access granted</Text>
                                    </div>

                                    <div className="space-y-5">
                                        <Text strong className="text-[10px] uppercase font-bold tracking-widest text-gray-800 block">Course Highlights</Text>

                                        {[
                                            { icon: <ClockCircleOutlined className="text-blue-500" />, text: `${course.completionDuration?.value} ${course.completionDuration?.unit} total content` },
                                            { icon: <BookOutlined className="text-emerald-500" />, text: `${(course.materials?.length || 0) + (course.contents?.length || 0)} Interactive modules` },
                                            { icon: <SafetyCertificateOutlined className="text-amber-500" />, text: "Professional verification certificate" },
                                            { icon: <RocketOutlined className="text-purple-500" />, text: "Self-paced learning journey" },
                                            { icon: <GlobalOutlined className="text-indigo-500" />, text: "Available on any device" }
                                        ].map((highlight, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm border border-gray-100">
                                                    {highlight.icon}
                                                </div>
                                                <Text className="text-sm font-medium text-gray-600">{highlight.text}</Text>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-emerald-50 p-4 rounded-xl text-center">
                                        <Text className="text-emerald-700 text-xs font-medium">Have questions? Contact your mentor for personalized guidance.</Text>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </div>
        </MainLayout>
    );
};

export default CoursePage;
