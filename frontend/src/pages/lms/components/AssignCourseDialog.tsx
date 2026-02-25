import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { lmsService } from '@/services/lmsService';
import { useAllDepartmentsForDropdown } from '@/hooks/useAllDepartmentsForDropdown';
import { message } from 'antd';
import { Loader2 } from 'lucide-react';

interface AssignCourseDialogProps {
    courseId: string | null;
    open: boolean;
    onClose: () => void;
}

const AssignCourseDialog: React.FC<AssignCourseDialogProps> = ({ courseId, open, onClose }) => {
    const [assignType, setAssignType] = useState<'Individual' | 'Role' | 'Department'>('Department');
    const [targetId, setTargetId] = useState('');
    const [mandatory, setMandatory] = useState(false);
    const [dueDate, setDueDate] = useState('');

    const { departments: departmentOptions, isLoading: departmentsLoading } = useAllDepartmentsForDropdown(open);

    const assignMutation = useMutation({
        mutationFn: (data: any) => lmsService.assignCourse(courseId!, data),
        onSuccess: () => {
            message.success('Course assigned successfully');
            onClose();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.error?.message || 'Failed to assign course');
        }
    });

    const handleAssign = () => {
        if (!courseId) return;
        const isDeptByName = assignType === 'Department' && targetId.startsWith('name:');
        const payload: any = {
            assignedTo: assignType,
            mandatory,
            dueDate: dueDate ? new Date(dueDate) : undefined
        };
        if (assignType === 'Department') {
            if (isDeptByName) {
                payload.departmentNames = [targetId.replace(/^name:/, '')];
                payload.targetIds = [];
            } else {
                payload.targetIds = [targetId];
            }
        } else {
            payload.targetIds = [targetId];
        }
        assignMutation.mutate(payload);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Course</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                        <Select
                            value={assignType}
                            onValueChange={(val: any) => {
                                setAssignType(val);
                                setTargetId('');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Department">Department</SelectItem>
                                <SelectItem value="Role">Role</SelectItem>
                                <SelectItem value="Individual">Individual (Employee ID)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{assignType === 'Department' ? 'Select Department' : 'Target Name / ID'}</Label>
                        {assignType === 'Department' ? (
                            <Select
                                value={targetId || undefined}
                                onValueChange={setTargetId}
                                disabled={departmentsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose department..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[min(400px,70vh)] overflow-y-auto">
                                    {departmentOptions.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <>
                                <Input
                                    placeholder={assignType === 'Individual' ? "Enter Employee ID" : `Enter ${assignType} Name`}
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">For demo, enter exact ID or Name found in DB.</p>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="mandatory" checked={mandatory} onCheckedChange={setMandatory} />
                        <Label htmlFor="mandatory">Mandatory Course</Label>
                    </div>

                    <div className="space-y-2">
                        <Label>Due Date (Optional)</Label>
                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={assignMutation.isPending || !targetId}>
                        {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AssignCourseDialog;
