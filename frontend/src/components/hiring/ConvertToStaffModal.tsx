
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useConvertCandidateToEmployeeMutation } from "@/store/api/hiringApi";
import { useAppSelector } from "@/store/hooks";
import {
    LayoutDashboard,
    FilePlus,
    Briefcase,
    History,
    Users,
    FileText,
    UserCheck,
    CalendarCheck,
    Layers,
    CheckSquare,
    Bell,
    Settings,
    Shield,
    Award,
    Eye,
    EyeOff
} from "lucide-react";

interface ConvertToStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidate: any;
    refetch: () => void;
}

const ConvertToStaffModal = ({
    isOpen,
    onClose,
    candidate,
    refetch
}: ConvertToStaffModalProps) => {
    const currentUser = useAppSelector((state) => state.auth.user);
    const [convertToEmployee, { isLoading }] = useConvertCandidateToEmployeeMutation();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        designation: "",
        department: "",
        joiningDate: "",
        role: "Employee",
        password: "", // Optional initial password
        confirmPassword: ""
    });

    const [permissions, setPermissions] = useState<string[]>([]);
    const [showPasswords, setShowPasswords] = useState({
        password: false,
        confirmPassword: false
    });

    // Check valid permission to edit permissions
    const canEditPermissions = currentUser?.permissions?.includes('assign_custom_permissions') ||
        currentUser?.role === 'Admin' ||
        currentUser?.role === 'Super Admin';

    useEffect(() => {
        if (candidate) {
            setFormData(prev => ({
                ...prev,
                firstName: candidate.firstName || "",
                lastName: candidate.lastName || "",
                email: candidate.email || "",
                phone: candidate.phone || "",
                designation: candidate.position || "", // Default to position applied for
                // job?.department logic would need passing job object or similar, assuming candidate object has it populated or we use strings
                department: (candidate.jobId as any)?.department || "",
                joiningDate: (() => {
                    try {
                        return candidate.offer?.joiningDate ? new Date(candidate.offer.joiningDate).toISOString().split('T')[0] : "";
                    } catch (e) {
                        return "";
                    }
                })(),
            }));
        }
    }, [candidate]);

    // Role change does NOT auto-fill permissions anymore
    // Permissions are manually selected only

    const handlePermissionToggle = (perm: string) => {
        if (!canEditPermissions) return;

        setPermissions(prev => {
            if (prev.includes(perm)) {
                return prev.filter(p => p !== perm);
            } else {
                return [...prev, perm];
            }
        });
    };

    const handleModuleSelectAll = (modulePerms: string[], isSelected: boolean) => {
        if (!canEditPermissions) return;

        setPermissions(prev => {
            if (isSelected) {
                // Add all that are not present
                const newPerms = [...prev];
                modulePerms.forEach(p => {
                    if (!newPerms.includes(p)) newPerms.push(p);
                });
                return newPerms;
            } else {
                // Remove all
                return prev.filter(p => !modulePerms.includes(p));
            }
        });
    };

    const handleGlobalSelectAll = () => {
        if (!canEditPermissions) return;
        const allPerms = hrmsModules.flatMap(m => m.permissions);
        setPermissions(allPerms);
    };

    const handleGlobalClearAll = () => {
        if (!canEditPermissions) return;
        setPermissions([]);
    };

    const handleSubmit = async () => {
        if (!formData.designation || !formData.department) {
            toast.error("Please fill all required fields");
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            await convertToEmployee({
                candidateId: candidate._id,
                data: {
                    designation: formData.designation,
                    department: formData.department,
                    staffType: "Full Time", // Default or add field
                    role: formData.role,
                    permissions: permissions, // Pass explicitly
                    password: formData.password || undefined // Pass password if set
                },
            }).unwrap();

            toast.success("Staff created successfully");
            refetch();
            onClose();
        } catch (error: any) {
            toast.error(error?.data?.error?.message || "Failed to create staff");
        }
    };

    // Define HRMS Modules and their permissions for UI rendering
    const hrmsModules = [
        {
            name: "Dashboard",
            key: "dashboard",
            icon: LayoutDashboard,
            permissions: ["dashboard_view"]
        },
        {
            name: "Interview Module (Top Level)",
            key: "interview_module",
            icon: Layers,
            permissions: ["interview_view"]
        },
        {
            name: "Job Openings",
            key: "job_openings",
            icon: Briefcase,
            permissions: [
                "job_openings_view",
                "job_openings_add",
                "job_openings_edit"
            ]
        },
        {
            name: "Candidates",
            key: "candidates",
            icon: Users,
            permissions: [
                "candidates_view",
                "candidates_add",
                "candidate_action_start_interview",
                "candidate_action_view_profile",
                "candidate_action_convert_to_staff",
                "candidate_action_view_offer"
            ]
        },
        {
            name: "Interview Appointments",
            key: "interview_appointments",
            icon: CalendarCheck,
            permissions: [
                "interview_appointments_view",
                "interview_appointments_schedule",
                "interview_appointments_edit"
            ]
        },
        {
            name: "Interview Process",
            key: "interview_process",
            icon: Layers,
            permissions: ["interview_process_view"]
        },
        {
            name: "Offer Letter",
            key: "offer_letter",
            icon: FileText,
            permissions: [
                "offer_letter_view",
                "offer_letter_add_dummy",
                "offer_letter_template",
                "offer_letter_generate"
            ]
        },
        {
            name: "Document Collection",
            key: "document_collection",
            icon: FilePlus,
            permissions: ["document_collection_view"]
        },
        {
            name: "Background Verification",
            key: "background_verification",
            icon: Shield,
            permissions: ["background_verification_view"]
        },
        {
            name: "Refer a Candidate",
            key: "refer_candidate",
            icon: UserCheck,
            permissions: ["refer_candidate_view"]
        },
        {
            name: "Staff",
            key: "staff",
            icon: Users,
            permissions: ["staff_view"]
        },
        {
            name: "Performance",
            key: "performance",
            icon: Award,
            permissions: ["performance_view"]
        },
        {
            name: "Payroll",
            key: "payroll",
            icon: CheckSquare,
            permissions: ["payroll_view"]
        },
        {
            name: "LMS",
            key: "lms",
            icon: History,
            permissions: ["lms_view"]
        },
        {
            name: "Asset Management",
            key: "asset_management",
            icon: Briefcase,
            permissions: ["asset_management_view"]
        },
        {
            name: "Company Policy",
            key: "company_policy",
            icon: FileText,
            permissions: ["company_policy_view"]
        },
        {
            name: "Integrations",
            key: "integrations",
            icon: Layers,
            permissions: ["integrations_view"]
        },
        {
            name: "Settings",
            key: "settings",
            icon: Settings,
            permissions: ["settings_view"]
        }
    ];

    // Specific role mappings for UI display (matching the simple strings used in backend map vs granular ones)
    // Since we used simple strings in backend (e.g. employee_view_payroll), we should map those here or update backend to use granular.
    // The user request mentions: "Each permission must have an individual checkbox... View, Create, Edit..."
    // This implies the system needs to support granular permissions like `dashboard_view`, `dashboard_create`.
    // My backend change earlier supports specific strings. The "Role Default" strings I used (e.g. `employee_view_payroll`) are somewhat granular but aggregated.
    // To support the full matrix requested by user, I should probably switch to standard granular syntax like `module_action`.

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Convert to Staff</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">

                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Personal Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input value={formData.firstName} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input value={formData.lastName} disabled />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={formData.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={formData.phone} disabled />
                            </div>
                        </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Professional Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Designation *</Label>
                                <Input
                                    value={formData.designation}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Department *</Label>
                                <Input
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role *</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Employee">Employee</SelectItem>
                                        <SelectItem value="EmployeeAdmin">Employee Admin</SelectItem>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Security</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.password ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Set initial password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                                    >
                                        {showPasswords.password ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPasswords.confirmPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        placeholder="Confirm password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                                    >
                                        {showPasswords.confirmPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Permissions */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-lg">Access Permissions</h3>
                            {canEditPermissions && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGlobalSelectAll}
                                        className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                    >
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGlobalClearAll}
                                        className="h-8 text-xs text-muted-foreground hover:bg-muted"
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Accordion type="multiple" className="w-full space-y-2">
                            {hrmsModules.map((module) => (
                                <AccordionItem key={module.key} value={module.key} className="border rounded-lg px-2">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                                <module.icon className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium">{module.name}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 pt-2 pb-4 px-2">
                                            {/* Module Select All Row */}
                                            <div
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${module.permissions.every(p => permissions.includes(p))
                                                    ? "bg-primary/5 border-primary/20"
                                                    : "bg-muted/30 border-transparent hover:bg-muted/50"
                                                    }`}
                                                onClick={() => {
                                                    if (canEditPermissions) {
                                                        const allSelected = module.permissions.every(p => permissions.includes(p));
                                                        handleModuleSelectAll(module.permissions, !allSelected);
                                                    }
                                                }}
                                            >
                                                <Checkbox
                                                    id={`select-all-${module.key}`}
                                                    checked={module.permissions.every(p => permissions.includes(p))}
                                                    onCheckedChange={(checked) => handleModuleSelectAll(module.permissions, checked as boolean)}
                                                    disabled={!canEditPermissions}
                                                />
                                                <Label
                                                    htmlFor={`select-all-${module.key}`}
                                                    className="font-semibold cursor-pointer"
                                                >
                                                    Select All
                                                </Label>
                                            </div>

                                            {/* Granular Permissions Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {module.permissions.map(perm => {
                                                    const action = perm.split('_').pop();
                                                    const label = action ? action.charAt(0).toUpperCase() + action.slice(1) : perm;
                                                    const isSelected = permissions.includes(perm) || permissions.includes('full_hrms_access');

                                                    return (
                                                        <div
                                                            key={perm}
                                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                                                ? "bg-primary/5 border-primary/20 shadow-sm"
                                                                : "bg-background border-border/50 hover:bg-muted/20"
                                                                }`}
                                                            onClick={() => handlePermissionToggle(perm)}
                                                        >
                                                            <Checkbox
                                                                id={perm}
                                                                checked={isSelected}
                                                                onCheckedChange={() => handlePermissionToggle(perm)}
                                                                disabled={!canEditPermissions || permissions.includes('full_hrms_access')}
                                                            />
                                                            <div className="flex flex-col">
                                                                <Label
                                                                    htmlFor={perm}
                                                                    className={`font-medium cursor-pointer ${isSelected ? "text-primary" : "text-foreground"}`}
                                                                >
                                                                    {label}
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Staff"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConvertToStaffModal;
