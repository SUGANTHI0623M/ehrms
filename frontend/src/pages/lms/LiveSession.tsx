import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, FileText, Users, Clock, Calendar, MessageSquare } from "lucide-react";

const LiveSession = () => {
    const [messages, setMessages] = useState<{ text: string; user: string }[]>([]);
    const [chatInput, setChatInput] = useState("");

    const handleSend = () => {
        if (!chatInput.trim()) return;
        setMessages([...messages, { text: chatInput, user: "You" }]);
        setChatInput("");
    };

    return (
        <MainLayout>
            <main className="p-6 space-y-6">
                {/* HEADER */}
                <div className="flex flex-col gap-2 mb-4">
                    <h2 className="text-3xl font-bold tracking-tight">Live Session</h2>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* LEFT – LIVE PLAYER + DETAILS */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* LIVE PLAYER */}
                        <div className="rounded-lg overflow-hidden bg-black aspect-video">
                            {/* Embed links (Zoom/YouTube/RTMP) */}
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0"
                                allow="autoplay"
                            />
                        </div>

                        {/* SESSION DETAILS */}
                        <Card className="p-6 space-y-3">
                            <h3 className="text-xl font-bold">Organic Skincare – Live Workshop</h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                    <Users size={16} /> Trainer: <strong>Dr. Maya</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar size={16} /> 10th Dec 2025
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={16} /> 6:00 PM – 7:30 PM (IST)
                                </span>
                                <Badge className="bg-red-500">LIVE</Badge>
                            </div>
                            <Button size="lg" className="mt-3 gradient-primary w-full sm:w-auto">
                                Join Live Session
                            </Button>
                        </Card>

                        {/* RESOURCES + NOTES in same row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Resources */}
                            <Card className="p-6 space-y-4">
                                <h3 className="font-semibold text-lg">Resources</h3>
                                <div className="space-y-2">
                                    {["Skincare_formula.pdf", "Ingredients_list.pdf", "Worksheet.pdf"].map((pdf) => (
                                        <div key={pdf} className="flex items-center justify-between border rounded p-3">
                                            <div className="flex items-center gap-2">
                                                <FileText size={18} />
                                                {pdf}
                                            </div>
                                            <Button size="sm" variant="outline">Download</Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* My Notes */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-lg mb-2">My Notes</h3>
                                <Textarea placeholder="Write your notes here..." className="h-40" />
                                <Button className="mt-3 gradient-primary">Save Notes</Button>
                            </Card>
                        </div>
                    </div>

                    {/* RIGHT – LIVE CHAT */}
                    <Card className="p-0 overflow-hidden flex flex-col h-[790px]">
                        <div className="p-4 flex items-center gap-2 font-semibold border-b">
                            <MessageSquare size={18} /> Live Chat
                        </div>

                        {/* CHAT BOX */}
                        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-muted/30">
                            {messages.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm mt-20">
                                    Be the first to send a message…
                                </p>
                            )}

                            {messages.map((m, i) => (
                                <div key={i} className={`p-3 rounded-lg w-fit max-w-[85%] ${m.user === "You" ? "ml-auto bg-primary text-primary-foreground" : "bg-white border"}`}>
                                    <p className="text-xs opacity-70">{m.user}</p>
                                    <p className="text-sm">{m.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* INPUT */}
                        <div className="border-t p-4 flex gap-2">
                            <Input
                                placeholder="Type your message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            />
                            <Button onClick={handleSend}>
                                <Send size={18} />
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        </MainLayout>
    );
};

export default LiveSession;
