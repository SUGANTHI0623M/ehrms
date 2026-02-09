
import React, { useState } from 'react';
import {
    BookOpen, Users, TrendingUp, Settings, Edit, Trash2, Download,
    Send, Eye, Lock, Globe, Target, Award, Clock, CheckCircle2,
    BarChart3, ChevronLeft, MoreVertical, Plus, FileText, Video,
    Youtube, Link as LinkIcon, HardDrive, Search, Filter, GripVertical,
    Mail, MessageSquare, Bell, Calendar, PlayCircle, X
} from 'lucide-react';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Mock Data
const courseData = {
    id: 'c-101',
    title: 'Advanced React Design Patterns',
    description: 'Master the art of building scalable, maintainable, and powerful React applications using advanced design patterns and performance optimization techniques.',
    status: 'Published',
    isMandatory: true,
    category: 'Development',
    lastUpdated: '2024-03-15',
    instructor: 'Sarah Jenkins',
    duration: '12h 30m',
    level: 'Advanced',
    rating: 4.8,
    enrollmentCount: 1250,
    completionRate: 68,
    avgScore: 85,
    materials: [
        { id: 'm-1', title: 'Introduction to Patterns', type: 'VIDEO', duration: '10:00' },
        { id: 'm-2', title: 'HOCs vs Hooks', type: 'PDF', duration: '15 min read' },
        { id: 'm-3', title: 'Component Composition', type: 'YOUTUBE', duration: '25:00' },
        { id: 'm-4', title: 'State Management Architecture', type: 'VIDEO', duration: '45:00' },
        { id: 'm-5', title: 'Performance Lab', type: 'URL', duration: '1h 00m' },
    ],
    departments: ['Engineering', 'Product'],
    learners: [
        { id: 'u-1', name: 'Alex Thompson', employeeId: 'EMP001', department: 'Engineering', progress: 100, score: 92, status: 'Completed', lastAccess: '2h ago' },
        { id: 'u-2', name: 'Maria Garcia', employeeId: 'EMP004', department: 'Engineering', progress: 75, score: 88, status: 'In Progress', lastAccess: '1d ago' },
        { id: 'u-3', name: 'James Wilson', employeeId: 'EMP009', department: 'Product', progress: 10, score: 0, status: 'In Progress', lastAccess: '5d ago' },
        { id: 'u-4', name: 'Linda Chen', employeeId: 'EMP012', department: 'Engineering', progress: 0, score: 0, status: 'Not Started', lastAccess: 'Never' },
    ]
};

const CourseDetailModern = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200';
            case 'In Progress': return 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200';
            case 'Not Started': return 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'VIDEO': return <Video className="h-4 w-4 text-blue-500" />;
            case 'YOUTUBE': return <Youtube className="h-4 w-4 text-red-500" />;
            case 'PDF': return <FileText className="h-4 w-4 text-orange-500" />;
            case 'URL': return <LinkIcon className="h-4 w-4 text-green-500" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
            {/* 1. Header Section */}
            <header className="sticky top-0 z-30 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold tracking-tight text-gray-900">{courseData.title}</h1>
                                    <Badge variant={courseData.status === 'Published' ? 'default' : 'secondary'} className="bg-green-600 hover:bg-green-700">
                                        {courseData.status}
                                    </Badge>
                                    {courseData.isMandatory && (
                                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                            Mandatory
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    Last updated {courseData.lastUpdated} • {courseData.category}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </Button>
                            <Button size="sm">
                                <Edit className="mr-2 h-4 w-4" /> Edit Content
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Export Report</DropdownMenuItem>
                                    <DropdownMenuItem><Target className="mr-2 h-4 w-4" /> Assign Users</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete Course</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 space-y-8">
                {/* 2. Quick Stats Dashboard */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Enrolled</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{courseData.enrollmentCount}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-green-600 font-medium">+12%</span> from last month
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Completion Rate</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{courseData.completionRate}%</div>
                            <Progress value={courseData.completionRate} className="h-1.5 mt-2 bg-green-100" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avg. Score</CardTitle>
                            <Award className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{courseData.avgScore}</div>
                            <p className="text-xs text-muted-foreground mt-1">Top 5% of all courses</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Avg. Time</CardTitle>
                            <Clock className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">4h 15m</div>
                            <p className="text-xs text-muted-foreground mt-1">Expected: {courseData.duration}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Tabbed Interface */}
                <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-white border rounded-lg p-1 h-12 shadow-sm">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-gray-100 px-6">Overview</TabsTrigger>
                            <TabsTrigger value="curriculum" className="data-[state=active]:bg-gray-100 px-6">Curriculum</TabsTrigger>
                            <TabsTrigger value="learners" className="data-[state=active]:bg-gray-100 px-6">Learners</TabsTrigger>
                            <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-100 px-6">Analytics</TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-gray-100 px-6">Settings</TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            {activeTab === 'learners' && (
                                <div className="flex items-center gap-2">
                                    <Input placeholder="Search learners..." className="w-64 bg-white" />
                                    <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
                                    <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
                                </div>
                            )}
                            {activeTab === 'curriculum' && (
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="h-4 w-4 mr-2" /> Add Material
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* TAB 1: OVERVIEW */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-7">
                            <div className="md:col-span-5 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>About this Course</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-gray-600 leading-relaxed">{courseData.description}</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <div className="text-sm text-gray-500 mb-1">Duration</div>
                                                <div className="font-semibold">{courseData.duration}</div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <div className="text-sm text-gray-500 mb-1">Level</div>
                                                <div className="font-semibold">{courseData.level}</div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <div className="text-sm text-gray-500 mb-1">Instructor</div>
                                                <div className="font-semibold">{courseData.instructor}</div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <div className="text-sm text-gray-500 mb-1">Materials</div>
                                                <div className="font-semibold">{courseData.materials.length} Items</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Completion Distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Completed</span>
                                                    <span className="font-medium text-green-600">68%</span>
                                                </div>
                                                <Progress value={68} className="h-2 bg-green-100 [&>div]:bg-green-600" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>In Progress</span>
                                                    <span className="font-medium text-blue-600">24%</span>
                                                </div>
                                                <Progress value={24} className="h-2 bg-blue-100 [&>div]:bg-blue-600" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Not Started</span>
                                                    <span className="font-medium text-gray-600">8%</span>
                                                </div>
                                                <Progress value={8} className="h-2 bg-gray-100 [&>div]:bg-gray-400" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <div className="aspect-video bg-gray-100 relative rounded-t-lg overflow-hidden group cursor-pointer">
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition">
                                            <PlayCircle className="h-12 w-12 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 drop-shadow-md" />
                                        </div>
                                        <img src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80" alt="Course" className="w-full h-full object-cover" />
                                    </div>
                                    <CardContent className="p-4">
                                        <Button className="w-full mb-3" variant="default">View as Learner</Button>
                                        <Button className="w-full" variant="outline">Copy Enroll Link</Button>

                                        <Separator className="my-4" />

                                        <h4 className="font-medium mb-3 text-sm">Assigned To</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {courseData.departments.map(d => (
                                                <Badge key={d} variant="secondary" className="font-normal">{d}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* TAB 2: CURRICULUM */}
                    <TabsContent value="curriculum" className="space-y-6">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Material Title</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {courseData.materials.map((material, index) => (
                                            <TableRow key={material.id} className="group">
                                                <TableCell>
                                                    <GripVertical className="h-4 w-4 text-gray-300 cursor-move group-hover:text-gray-500" />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="p-2 bg-gray-50 rounded-md w-fit">
                                                        {getTypeIcon(material.type)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {material.title}
                                                    {index === 0 && <Badge variant="outline" className="ml-2 bg-green-50 text-green-600 border-green-200 text-xs">Free Preview</Badge>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{material.duration}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreVertical className="h-4 w-4 text-gray-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                                                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> Preview</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-4 border-t border-gray-100 flex justify-center">
                                    <Button variant="outline" className="border-dashed w-full text-gray-500 hover:text-blue-600 hover:border-blue-300">
                                        <Plus className="h-4 w-4 mr-2" /> Add Lesson
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: LEARNERS */}
                    <TabsContent value="learners" className="space-y-6">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Progress</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Last Access</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {courseData.learners.map(learner => (
                                            <TableRow key={learner.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">{learner.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">{learner.name}</div>
                                                            <div className="text-xs text-muted-foreground">{learner.employeeId}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-normal">{learner.department}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`font-medium ${getStatusColor(learner.status)}`}>
                                                        {learner.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="w-[150px]">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={learner.progress} className="h-2 bg-gray-100" />
                                                        <span className="text-xs w-8">{learner.progress}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {learner.score > 0 ? <span className="font-semibold">{learner.score}%</span> : <span className="text-gray-400">-</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{learner.lastAccess}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" title="Send Reminder">
                                                        <Bell className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-4 border-t flex justify-between items-center text-sm text-gray-500">
                                    <div>Showing 4 of 125 learners</div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled>Previous</Button>
                                        <Button variant="outline" size="sm">Next</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 4: SETTINGS */}
                    <TabsContent value="settings" className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Course Details</CardTitle>
                                        <CardDescription>Update general information</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Course Title</Label>
                                            <Input defaultValue={courseData.title} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Description</Label>
                                            <Input defaultValue={courseData.description} />
                                        </div>
                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                            <div className="space-y-0.5">
                                                <Label>Mandatory Course</Label>
                                                <p className="text-xs text-muted-foreground">Employees must complete this course</p>
                                            </div>
                                            <Switch defaultChecked={courseData.isMandatory} />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t px-6 py-4">
                                        <Button>Save Changes</Button>
                                    </CardFooter>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Assessment Configuration</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="grid gap-2 flex-1">
                                                <Label>Passing Score (%)</Label>
                                                <Input type="number" defaultValue={80} />
                                            </div>
                                            <div className="grid gap-2 flex-1">
                                                <Label>Max Attempts</Label>
                                                <Input type="number" defaultValue={3} />
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="cert" defaultChecked />
                                            <Label htmlFor="cert">Generate Certificate upon completion</Label>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    );
};

export default CourseDetailModern;
