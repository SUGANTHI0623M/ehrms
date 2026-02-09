import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Search, FileText, MoreVertical, Edit, Trash, Eye, Loader2, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils/constants";
import { toast } from "sonner";
import { useGetTemplatesQuery, useDeleteTemplateMutation, OfferTemplate } from "@/store/api/offerTemplateApi";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

const OfferLetterTemplateList = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<OfferTemplate | null>(null);
    const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

    const { data, isLoading, isError } = useGetTemplatesQuery();
    const [deleteTemplate, { isLoading: isDeleting }] = useDeleteTemplateMutation();

    const templates = data?.data?.templates || [];

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Extract variables from template content when preview opens
    useEffect(() => {
        if (previewTemplate) {
            const regex = /{{([\s\S]+?)}}/g;
            const matches = Array.from(previewTemplate.content.matchAll(regex));
            const uniqueKeys = Array.from(new Set(matches.map(m => m[1].trim())));

            const initialValues: Record<string, string> = {};
            uniqueKeys.forEach(key => {
                initialValues[key] = `[${key}]`;
            });
            setPreviewValues(initialValues);
        } else {
            setPreviewValues({});
        }
    }, [previewTemplate]);

    const handleCreateTemplate = () => {
        navigate("/offer-letter/templates/create");
    };

    const handleEditTemplate = (id: string) => {
        navigate(`/offer-letter/templates/edit/${id}`);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handlePreviewTemplate = (template: OfferTemplate) => {
        setPreviewTemplate(template);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteTemplate(deleteId).unwrap();
            toast.success("Template deleted successfully");
            setDeleteId(null);
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const getRenderedContent = () => {
        if (!previewTemplate) return '';
        let content = previewTemplate.content;

        return content.replace(/{{([\s\S]+?)}}/g, (match, key) => {
            const trimmedKey = key.trim();
            return previewValues[trimmedKey] || match;
        });
    };

    return (
        <MainLayout>
            <main className="p-4">
                <div className="mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => navigate("/offer-letter")}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">Offer Letter Templates</h1>
                                <p className="text-muted-foreground">Manage your offer letter and contract templates</p>
                            </div>
                        </div>
                        <Button onClick={handleCreateTemplate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Template
                        </Button>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder="Search templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`pl-10 max-w-md ${searchQuery ? "pr-10" : ""}`}
                                />
                                {searchQuery && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                                        onClick={() => setSearchQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Templates List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>All Templates</CardTitle>
                            <CardDescription>View and manage your available document templates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : isError ? (
                                <div className="text-center py-8 text-destructive">
                                    Failed to load templates
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No templates found. Create one to get started.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Template Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Last Modified</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>View</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTemplates.map((template) => (
                                            <TableRow key={template._id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                        {template.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{template.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{template.type}</Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(template.updatedAt)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={template.status === "Active" ? "default" : "secondary"}>
                                                        {template.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePreviewTemplate(template)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEditTemplate(template._id)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(template._id)}>
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the template.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                <DialogContent className="max-w-[90vw] md:max-w-7xl h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {previewTemplate?.name}
                            <Badge variant="outline" className="ml-2 font-normal">Preview Mode</Badge>
                        </DialogTitle>
                        <DialogDescription>
                            {previewTemplate?.description || "Preview and test variable substitution for this template."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                        {/* Sidebar: Variables */}
                        <div className="w-full lg:w-80 border-r bg-muted/20 flex flex-col">
                            <div className="p-4 border-b bg-muted/40 font-medium text-sm flex items-center justify-between">
                                <span>Template Variables</span>
                                <Badge variant="secondary" className="text-xs">{Object.keys(previewValues).length} found</Badge>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {Object.keys(previewValues).length === 0 ? (
                                        <div className="text-sm text-muted-foreground text-center py-4">
                                            No variables found (e.g. {'{{name}}'}).
                                        </div>
                                    ) : (
                                        Object.keys(previewValues).map(key => (
                                            <div key={key} className="space-y-2">
                                                <Label
                                                    htmlFor={`var-${key}`}
                                                    className="text-xs font-medium uppercase text-muted-foreground"
                                                >
                                                    {key}
                                                </Label>
                                                <Input
                                                    id={`var-${key}`}
                                                    value={previewValues[key]}
                                                    onChange={(e) => setPreviewValues(prev => ({ ...prev, [key]: e.target.value }))}
                                                    placeholder={`Value for ${key}`}
                                                    className="bg-white"
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Main Preview Area */}

                        <div className="flex-1 bg-gray-100/50 relative overflow-hidden flex flex-col">
                            <div className="absolute inset-0 overflow-auto p-4 md:p-8 flex justify-center">
                                <div
                                    className="bg-white shadow-lg border text-black offer-template-preview"
                                    style={{
                                        width: '210mm',
                                        minHeight: '297mm',
                                        height: 'fit-content',
                                        padding: '20mm',
                                        transformOrigin: 'top center',
                                    }}
                                >
                                    <div
                                        className="prose max-w-none text-sm md:text-base leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: getRenderedContent() }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
};

export default OfferLetterTemplateList;
