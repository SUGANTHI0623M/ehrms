import React, { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import {
    Button, Input, Card, Badge, Avatar, Tabs, List,
    Tooltip, message, Typography, Layout, Space, Tag, Empty, Divider
} from "antd";
import {
    AudioOutlined, AudioMutedOutlined, VideoCameraOutlined, VideoCameraAddOutlined,
    PhoneOutlined, DesktopOutlined, MessageOutlined, TeamOutlined, SettingOutlined,
    UserOutlined, SendOutlined, ClockCircleOutlined
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { lmsService } from "@/services/lmsService";

const { Title, Text, Paragraph } = Typography;
const { Content, Sider } = Layout;

// URLs
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

interface Message {
    sender: string;
    text: string;
    time: string;
    isSystem?: boolean;
}

interface Participant {
    id: string;
    name: string;
    role: string;
    isMuted: boolean;
    isVideoOff: boolean;
}

const LiveRoom: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [role] = useState<string>('Employee');

    // Media States
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // UI States
    const [activeTab, setActiveTab] = useState<string>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [sessionDetails, setSessionDetails] = useState<any>(null);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        const init = async () => {
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                let session = null;
                try {
                    const resEmp = await lmsService.getMyLiveSessions();
                    session = resEmp.data.find((s: any) => s._id === sessionId);
                } catch (e) { /* ignore */ }

                if (session) {
                    setSessionDetails(session);
                } else {
                    message.warning("Session info not available locally.");
                }

            } catch (err) {
                console.error("Failed to init", err);
            }
        };
        init();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId || !token) return;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = currentStream;
                }
            })
            .catch((err) => {
                console.error("Media Error:", err);
                message.error("Camera/Mic access required for classroom participation.");
            });

        const socket = io(SOCKET_URL, {
            auth: { token },
            query: { sessionId }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-live-session', { sessionId });
        });

        socket.on('chat-message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        });

        socket.on('participant-update', (updatedParticipants: Participant[]) => {
            setParticipants(updatedParticipants);
        });

        return () => {
            socket.disconnect();
        };
    }, [sessionId, token]);

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
            socketRef.current?.emit('toggle-media', { sessionId, isMuted: !isMuted, isVideoOff });
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
            socketRef.current?.emit('toggle-media', { sessionId, isMuted, isVideoOff: !isVideoOff });
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(cameraStream);
            if (videoRef.current) videoRef.current.srcObject = cameraStream;
            setIsScreenSharing(false);
        } else {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setStream(displayStream);
                if (videoRef.current) videoRef.current.srcObject = displayStream;
                setIsScreenSharing(true);
                displayStream.getVideoTracks()[0].onended = () => {
                    setIsScreenSharing(false);
                };
            } catch (err) {
                console.error("Screen Share Error", err);
            }
        }
    };

    const sendMessage = () => {
        if (!inputMsg.trim() || !socketRef.current) return;
        const msgPayload = {
            sender: "Me",
            text: inputMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, msgPayload]);
        socketRef.current.emit('send-chat-message', { sessionId, message: inputMsg });
        setInputMsg("");
    };

    const leaveSession = () => {
        navigate('/lms/employee/live-sessions');
    };

    const tabItems = [
        {
            key: 'chat',
            label: 'Discussion',
            icon: <MessageOutlined />,
            children: (
                <div className="flex flex-col h-full bg-white">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] rounded-xl p-3 text-sm ${msg.sender === 'Me' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-800'}`}>
                                    {msg.sender !== 'Me' && <Text strong className="block text-[10px] uppercase mb-1 opacity-60">{msg.sender}</Text>}
                                    <p className="m-0 leading-relaxed">{msg.text}</p>
                                </div>
                                <Text type="secondary" className="text-[9px] mt-1">{msg.time}</Text>
                            </div>
                        ))}
                        {messages.length === 0 && (
                            <Empty className="mt-20" description="No chat messages yet." />
                        )}
                    </div>
                    <div className="p-4 border-t bg-gray-50">
                        <Space.Compact className="w-full">
                            <Input
                                placeholder="Say something..."
                                value={inputMsg}
                                onChange={(e) => setInputMsg(e.target.value)}
                                onPressEnter={sendMessage}
                                className="rounded-l-lg border-none h-10 shadow-sm"
                            />
                            <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} className="h-10 px-6 rounded-r-lg" />
                        </Space.Compact>
                    </div>
                </div>
            )
        },
        {
            key: 'participants',
            label: 'Attendees',
            icon: <TeamOutlined />,
            children: (
                <div className="h-full overflow-y-auto p-4 bg-white">
                    <List
                        itemLayout="horizontal"
                        dataSource={[{ id: 'me', name: 'You', role: role, isMuted, isVideoOff }, ...participants]}
                        renderItem={(item) => (
                            <List.Item className="border-none px-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <List.Item.Meta
                                    avatar={<Avatar size="small" style={{ backgroundColor: item.id === 'me' ? '#10b981' : '#f0f2f5', color: item.id === 'me' ? '#fff' : '#8c8c8c' }} icon={<UserOutlined />} />}
                                    title={<Text strong className="text-sm">{item.name}</Text>}
                                    description={<Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider">{item.role}</Text>}
                                />
                                <Space>
                                    {item.isMuted && <AudioMutedOutlined className="text-red-500 text-xs" />}
                                    {item.isVideoOff && <VideoCameraAddOutlined className="text-red-500 text-xs" />}
                                </Space>
                            </List.Item>
                        )}
                    />
                </div>
            )
        }
    ];

    return (
        <MainLayout>
            <Layout className="h-[calc(100vh-64px)] overflow-hidden bg-gray-950">
                {/* Main Classroom Area */}
                <Content className="relative flex flex-col">
                    {/* Header Info Layer */}
                    <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start pointer-events-none">
                        <div className="pointer-events-auto">
                            <Tag color="error" className="animate-pulse rounded-full px-3 mb-2 border-none font-bold uppercase tracking-wider text-[10px]">Live Session</Tag>
                            <Title level={4} className="!text-white !m-0 shadow-sm">{sessionDetails?.title || "Virtual Classroom"}</Title>
                            <Space className="text-white/60 text-xs mt-1">
                                <ClockCircleOutlined />
                                <span>Session duration: {sessionDetails?.duration || 0} min</span>
                                <Divider type="vertical" className="bg-white/20" />
                                <TeamOutlined />
                                <span>{participants.length + 1} participating</span>
                            </Space>
                        </div>
                    </div>

                    {/* Stage (Video) */}
                    <div className="flex-1 flex items-center justify-center p-6 pb-24">
                        <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/5 ring-1 ring-white/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''} ${isScreenSharing ? 'object-contain bg-black' : ''}`}
                            />

                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#141414]">
                                    <Avatar size={120} icon={<UserOutlined />} className="bg-gray-800 text-gray-500" />
                                </div>
                            )}

                            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                                <Text className="text-white text-xs font-medium">You</Text>
                                {isMuted && <AudioMutedOutlined className="text-red-500 text-xs" />}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Toolbar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-20">
                        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                            <Button
                                type={isMuted ? "default" : "primary"}
                                danger={isMuted}
                                shape="circle"
                                size="large"
                                onClick={toggleMute}
                                icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                                className="shadow-lg border-none h-12 w-12 flex items-center justify-center"
                            />
                        </Tooltip>

                        <Tooltip title={isVideoOff ? "Start Video" : "Stop Video"}>
                            <Button
                                type={isVideoOff ? "default" : "primary"}
                                danger={isVideoOff}
                                shape="circle"
                                size="large"
                                onClick={toggleVideo}
                                icon={isVideoOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />}
                                className="shadow-lg border-none h-12 w-12 flex items-center justify-center"
                            />
                        </Tooltip>

                        <Tooltip title="Share Screen">
                            <Button
                                type={isScreenSharing ? "primary" : "default"}
                                shape="circle"
                                size="large"
                                onClick={toggleScreenShare}
                                icon={<DesktopOutlined />}
                                className={`shadow-lg border-none h-12 w-12 flex items-center justify-center ${isScreenSharing ? 'bg-emerald-600' : 'bg-white/20 text-white'}`}
                            />
                        </Tooltip>

                        <Divider type="vertical" className="bg-white/10 h-8 mx-2" />

                        <Button
                            type="primary"
                            danger
                            shape="round"
                            size="large"
                            onClick={leaveSession}
                            icon={<PhoneOutlined />}
                            className="shadow-lg h-12 px-8 font-bold border-none"
                        >
                            Leave Room
                        </Button>
                    </div>
                </Content>

                {/* Sidebar (Utility: Chat/Participants) */}
                <Sider
                    width={350}
                    theme="light"
                    className="border-l border-gray-100 hidden lg:block"
                >
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        centered
                        className="live-tabs h-full"
                        items={tabItems}
                    />
                </Sider>
            </Layout>

            <style>{`
                .live-tabs .ant-tabs-nav {
                    padding: 8px 16px;
                    margin: 0 !important;
                    background: #fff;
                    border-bottom: 1px solid #f0f0f0;
                }
                .live-tabs .ant-tabs-content-holder {
                    height: calc(100% - 46px);
                }
                .live-tabs .ant-tabs-tabpane {
                    height: 100%;
                }
            `}</style>
        </MainLayout>
    );
};

export default LiveRoom;
