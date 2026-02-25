
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, Copy, ChevronDown, ChevronUp, Info, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useCreateTemplateMutation, useGetTemplateByIdQuery, useUpdateTemplateMutation } from "@/store/api/offerTemplateApi";

const OfferLetterTemplateForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState("Offer Letter");
    const [status, setStatus] = useState("Draft");
    const [content, setContent] = useState("");
    const [showVariables, setShowVariables] = useState(true);

    const { data: templateData, isLoading: isLoadingTemplate } = useGetTemplateByIdQuery(id!, {
        skip: !isEdit
    });

    const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
    const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();

    useEffect(() => {
        if (templateData?.data?.template) {
            const t = templateData.data.template;
            setName(t.name);
            setDescription(t.description || "");
            setType(t.type);
            setStatus(t.status);
            setContent(t.content);
        }
    }, [templateData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !content) {
            toast.error("Name and Content are required");
            return;
        }

        try {
            const payload = {
                name,
                description,
                type,
                status,
                content
            } as any;

            if (isEdit) {
                await updateTemplate({ id: id!, data: payload }).unwrap();
                toast.success("Template updated successfully");
            } else {
                await createTemplate(payload).unwrap();
                toast.success("Template created successfully");
            }
            navigate("/offer-letter/templates");
        } catch (error: any) {
            toast.error(error?.data?.error?.message || "Failed to save template");
        }
    };

    // Available variables with descriptions
    const availableVariables = [
        {
            category: "Candidate Information",
            variables: [
                { name: "candidateName", description: "Full name of the candidate", example: "John Doe" },
                { name: "candidateEmail", description: "Candidate's email address", example: "john.doe@example.com" },
                { name: "candidatePhone", description: "Candidate's phone number", example: "+1234567890" },
            ]
        },
        {
            category: "Job Information",
            variables: [
                { name: "jobTitle", description: "Title of the job position", example: "Software Engineer" },
                { name: "department", description: "Department name", example: "Engineering" },
                { name: "employmentType", description: "Type of employment", example: "Full-time" },
                { name: "salary", description: "Salary information", example: "INR 500000 Annual" },
            ]
        },
        {
            category: "Salary Structure - Monthly",
            variables: [
                { name: "basicSalary", description: "Basic Salary (Monthly)", example: "₹50,000.00" },
                { name: "dearnessAllowance", description: "Dearness Allowance (Monthly)", example: "₹25,000.00" },
                { name: "houseRentAllowance", description: "House Rent Allowance (Monthly)", example: "₹10,000.00" },
                { name: "specialAllowance", description: "Special Allowance (Monthly)", example: "₹5,000.00" },
                { name: "grossFixedSalary", description: "Gross Fixed Salary (Monthly)", example: "₹90,000.00" },
                { name: "grossSalary", description: "Gross Salary (Monthly)", example: "₹95,000.00" },
                { name: "netMonthlySalary", description: "Net Salary (Monthly - Take Home)", example: "₹85,000.00" },
            ]
        },
        {
            category: "Salary Structure - Yearly",
            variables: [
                { name: "annualGrossSalary", description: "Annual Gross Salary", example: "₹11,40,000.00" },
                { name: "annualIncentive", description: "Annual Incentive", example: "₹57,000.00" },
                { name: "annualGratuity", description: "Annual Gratuity", example: "₹28,860.00" },
                { name: "annualStatutoryBonus", description: "Annual Statutory Bonus", example: "₹49,980.00" },
                { name: "annualNetSalary", description: "Annual Net Salary (Take Home)", example: "₹10,20,000.00" },
                { name: "totalCTC", description: "Total CTC (Cost to Company)", example: "₹12,75,840.00" },
            ]
        },
        {
            category: "Offer Details",
            variables: [
                { name: "joiningDate", description: "Expected joining date", example: "01/15/2024" },
                { name: "expiryDate", description: "Offer expiry date", example: "02/15/2024" },
                { name: "offerLink", description: "Link to view/accept offer", example: "https://..." },
            ]
        },
        {
            category: "Company Information",
            variables: [
                { name: "companyName", description: "Company name", example: "ABC Corporation" },
                { name: "companyLogo", description: "Company logo (displays as image)", example: "[Image]" },
                { name: "companyAddress", description: "Company address", example: "123 Main St, City, State" },
            ]
        },
        {
            category: "Branch Information",
            variables: [
                { name: "branchName", description: "Branch name (if applicable)", example: "Mumbai Branch" },
                { name: "branchLogo", description: "Branch logo (displays as image, if available)", example: "[Image]" },
            ]
        },
    ];

    const insertVariable = (variableName: string) => {
        const variable = `{${variableName}}`;
        const textarea = document.getElementById("content") as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const textBefore = content.substring(0, start);
            const textAfter = content.substring(end);
            const newContent = textBefore + variable + textAfter;
            setContent(newContent);
            
            // Set cursor position after inserted variable
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
            
            toast.success(`Inserted {${variableName}}`);
        }
    };

    const insertSalaryStructureTable = () => {
        const salaryTableTemplate = `
<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
  <thead>
    <tr style="border-bottom: 2px solid #333;">
      <th style="text-align: left; padding: 12px; font-weight: bold; background-color: #f5f5f5;">Component</th>
      <th style="text-align: right; padding: 12px; font-weight: bold; background-color: #f5f5f5;">Per Month</th>
      <th style="text-align: right; padding: 12px; font-weight: bold; background-color: #f5f5f5;">Per Year</th>
    </tr>
  </thead>
  <tbody>
    <!-- (A) Fixed Components -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">(A) Fixed Components</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Basic</td>
      <td style="padding: 10px; text-align: right;">{basicSalary}</td>
      <td style="padding: 10px; text-align: right;">{basicSalaryYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">DA (Dearness Allowance)</td>
      <td style="padding: 10px; text-align: right;">{dearnessAllowance}</td>
      <td style="padding: 10px; text-align: right;">{dearnessAllowanceYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">HRA (House Rent Allowance)</td>
      <td style="padding: 10px; text-align: right;">{houseRentAllowance}</td>
      <td style="padding: 10px; text-align: right;">{houseRentAllowanceYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Special Allowances</td>
      <td style="padding: 10px; text-align: right;">{specialAllowance}</td>
      <td style="padding: 10px; text-align: right;">{specialAllowanceYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">ESI (Employer)</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{employerESIYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">PF (Employer)</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{employerPFYearly}</td>
    </tr>
    <tr style="border-bottom: 2px solid #666; background-color: #e3f2fd; font-weight: bold;">
      <td style="padding: 10px;">Gross Salary</td>
      <td style="padding: 10px; text-align: right;">{grossSalary}</td>
      <td style="padding: 10px; text-align: right;">{annualGrossSalary}</td>
    </tr>

    <!-- (B) Variables (Performance based) -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">(B) Variables (Performance based)</td>
    </tr>
    <tr style="border-bottom: 2px solid #666;">
      <td style="padding: 10px;">*Incentive</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{annualIncentive}</td>
    </tr>

    <!-- (C) Benefits (Yearly) -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">(C) Benefits (Yearly)</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Medical Insurance</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{medicalInsuranceAmount}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Gratuity</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{annualGratuity}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Statutory Bonus</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{annualStatutoryBonus}</td>
    </tr>
    <tr style="border-bottom: 2px solid #666; background-color: #e3f2fd; font-weight: bold;">
      <td style="padding: 10px;">Total Benefits (C)</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{totalAnnualBenefits}</td>
    </tr>

    <!-- (D) Allowances -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">(D) Allowances</td>
    </tr>
    <tr style="border-bottom: 2px solid #666;">
      <td style="padding: 10px;">Mobile Allowances</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{annualMobileAllowance}</td>
    </tr>

    <!-- Employee Deductions -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">Employee Deductions</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Employee contribution to PF</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{employeePFYearly}</td>
    </tr>
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">Employee contribution to ESI</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{employeeESIYearly}</td>
    </tr>
    <tr style="border-bottom: 2px solid #666; background-color: #ffebee; font-weight: bold;">
      <td style="padding: 10px;">Total Deductions</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{totalDeductionsYearly}</td>
    </tr>

    <!-- Net Salary -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">Net Salary</td>
    </tr>
    <tr style="border-bottom: 2px solid #666; background-color: #e8f5e9; font-weight: bold;">
      <td style="padding: 10px;">Net Salary per month</td>
      <td style="padding: 10px; text-align: right;">{netMonthlySalary}</td>
      <td style="padding: 10px; text-align: right;">{annualNetSalary}</td>
    </tr>

    <!-- Total CTC -->
    <tr style="background-color: #f9f9f9;">
      <td colspan="3" style="padding: 8px; font-weight: bold; font-size: 16px;">Total CTC (A+B+C+D)</td>
    </tr>
    <tr style="border-bottom: 2px solid #666; background-color: #bbdefb; font-weight: bold; font-size: 18px;">
      <td style="padding: 10px;">Total CTC (A+B+C+D)</td>
      <td style="padding: 10px; text-align: right;">-</td>
      <td style="padding: 10px; text-align: right;">{totalCTC}</td>
    </tr>
  </tbody>
</table>
`;
        const textarea = document.getElementById("content") as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const textBefore = content.substring(0, start);
            const textAfter = content.substring(end);
            const newContent = textBefore + salaryTableTemplate + textAfter;
            setContent(newContent);
            
            // Set cursor position after inserted table
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + salaryTableTemplate.length, start + salaryTableTemplate.length);
            }, 0);
            
            toast.success("Salary Structure Table template inserted");
        }
    };

    if (isEdit && isLoadingTemplate) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <main className="p-4">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/offer-letter/templates")}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{isEdit ? "Edit Template" : "Create Template"}</h1>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Template Name *</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Standard Offer"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Offer Letter">Offer Letter</SelectItem>
                                                <SelectItem value="Contract">Contract</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of when to use this template"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Draft">Draft</SelectItem>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="content">Content *</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={insertSalaryStructureTable}
                                                className="text-xs"
                                            >
                                                <Table2 className="h-3 w-3 mr-1" />
                                                Insert Salary Table
                                            </Button>
                                            <Collapsible open={showVariables} onOpenChange={setShowVariables}>
                                            <CollapsibleTrigger asChild>
                                                <Button type="button" variant="ghost" size="sm" className="text-xs">
                                                    {showVariables ? (
                                                        <>
                                                            <ChevronUp className="h-4 w-4 mr-1" />
                                                            Hide Variables
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-4 w-4 mr-1" />
                                                            Show Variables
                                                        </>
                                                    )}
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <Card className="mt-2 border-2">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Info className="h-4 w-4" />
                                                            Available Variables
                                                        </CardTitle>
                                                        <p className="text-xs text-muted-foreground">
                                                            Click on any variable to insert it into your template
                                                        </p>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
                                                        {availableVariables.map((category, catIndex) => (
                                                            <div key={catIndex} className="space-y-2">
                                                                <h4 className="text-sm font-semibold text-foreground">{category.category}</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {category.variables.map((variable, varIndex) => (
                                                                        <div
                                                                            key={varIndex}
                                                                            className="flex items-start gap-2 p-2 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                                                                            onClick={() => insertVariable(variable.name)}
                                                                        >
                                                                            <Badge variant="outline" className="font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground">
                                                                                {`{${variable.name}}`}
                                                                            </Badge>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs font-medium text-foreground">{variable.description}</p>
                                                                                <p className="text-xs text-muted-foreground mt-0.5">Example: {variable.example}</p>
                                                                            </div>
                                                                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </CardContent>
                                                </Card>
                                            </CollapsibleContent>
                                        </Collapsible>
                                        </div>
                                    </div>
                                    <Textarea
                                        id="content"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="min-h-[300px] font-mono"
                                        placeholder="Dear {candidateName},&#10;&#10;We are pleased to offer you the position of {jobTitle} in our {department} department..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Note: Write your offer letter content using plain text with variable placeholders. Click on variables above to insert them, or type them manually using {"{variableName}"} format.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-4 pt-4">
                                    <Button type="button" variant="outline" onClick={() => navigate("/offer-letter/templates")}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isCreating || isUpdating}>
                                        {isCreating || isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isEdit ? "Update Template" : "Create Template"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </div>
            </main>
        </MainLayout>
    );
};

export default OfferLetterTemplateForm;
