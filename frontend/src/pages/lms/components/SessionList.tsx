import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Video, User } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
    _id: string;
    title: string;
    dateTime: string;
    duration: number;
    trainerName: string;
    sessionType: 'Online' | 'In-branch';
    platform?: string;
    location?: string;
    status: string;
    meetingLink?: string;
}

interface SessionListProps {
    sessions: Session[];
    onJoin?: (sessionId: string) => void;
    isAdmin?: boolean;
}

const SessionList: React.FC<SessionListProps> = ({ sessions, onJoin, isAdmin }) => {
    if (!sessions?.length) {
        return (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Upcoming Sessions</h3>
                <p className="text-gray-500 mt-1">Check back later for new training schedules.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
                <Card key={session._id} className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Badge variant="secondary" className={session.sessionType === 'Online' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}>
                                {session.sessionType}
                            </Badge>
                            <Badge variant="outline">{session.status}</Badge>
                        </div>
                        <CardTitle className="mt-2 text-lg">{session.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {format(new Date(session.dateTime), 'PPP')}
                        </div>
                        <div className="flex items-center text-gray-600">
                            <Clock className="w-4 h-4 mr-2" />
                            {format(new Date(session.dateTime), 'p')} ({session.duration} min)
                        </div>
                        <div className="flex items-center text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            Trainer: {session.trainerName}
                        </div>
                        {session.sessionType === 'Online' ? (
                            <div className="flex items-center text-emerald-600">
                                <Video className="w-4 h-4 mr-2" />
                                {session.platform}
                            </div>
                        ) : (
                            <div className="flex items-center text-orange-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                {session.location}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {session.status === 'Live' || session.status === 'Scheduled' ? (
                            <Button
                                className="w-full"
                                disabled={session.status === 'Scheduled' && !isAdmin}
                                onClick={() => onJoin && onJoin(session._id)}
                            >
                                {session.status === 'Live' ? 'Join Now' : 'Registered'}
                            </Button>
                        ) : (
                            <Button variant="secondary" className="w-full" disabled>Completed</Button>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};

export default SessionList;
