import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import {
  useGetInterviewTemplatesQuery,
  useDeleteInterviewTemplateMutation,
} from "@/store/api/interviewTemplateApi";
import { toast } from "sonner";
import InterviewTemplateForm from "./InterviewTemplateForm";
import { Pagination } from "@/components/ui/Pagination";

const InterviewTemplateManagement = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10

  const { data, isLoading, refetch } = useGetInterviewTemplatesQuery({
    page,
    limit: pageSize,
  });
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteInterviewTemplateMutation();

  const templates = data?.data?.templates || [];
  const pagination = data?.data?.pagination;

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteTemplate(deleteId).unwrap();
      toast.success("Interview flow deleted successfully");
      refetch();
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to delete interview flow");
    }
  };

  const handleEdit = (id: string) => {
    setSelectedTemplate(id);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Interview Flow Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage job-based interview flows with multiple rounds and questions
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Flow
          </Button>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Flows</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No interview flows found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first interview flow to get started.
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Flow
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>

                      <TableHead>Job Opening</TableHead>
                      <TableHead>Job Status</TableHead>
                      <TableHead>Total Rounds</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template._id} className="hover:bg-accent/50">

                        <TableCell>
                          {typeof template.jobOpeningId === 'object' && template.jobOpeningId
                            ? template.jobOpeningId.title
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {typeof template.jobOpeningId === 'object' && template.jobOpeningId ? (
                            <Badge
                              variant={
                                (template.jobOpeningId as any).status === 'ACTIVE' ? 'default' :
                                (template.jobOpeningId as any).status === 'INACTIVE' ? 'secondary' :
                                (template.jobOpeningId as any).status === 'CLOSED' ? 'destructive' :
                                (template.jobOpeningId as any).status === 'DRAFT' ? 'outline' :
                                'secondary'
                              }
                            >
                              {(template.jobOpeningId as any).status || 'N/A'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.rounds?.filter((r: any) => r.enabled).length || 0}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={template.isActive ? "default" : "secondary"}
                          >
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {typeof template.createdBy === 'object' && template.createdBy ? (
                            (template.createdBy as any).name || 'N/A'
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template._id)}
                              title="Edit template"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template._id)}
                              title="Delete interview flow"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {data?.data && (
              <div className="mt-6 pt-4 border-t">
                <Pagination
                  page={pagination?.page || page}
                  pageSize={pageSize}
                  total={pagination?.total || templates.length}
                  pages={pagination?.pages || Math.ceil((pagination?.total || templates.length) / pageSize)}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  showPageSizeSelector={true}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? "Edit Interview Flow" : "Create Interview Flow"}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate
                  ? "Update the interview flow details"
                  : "Create a new job-based interview flow with multiple rounds and questions"}
              </DialogDescription>
            </DialogHeader>
            <InterviewTemplateForm
              templateId={selectedTemplate}
              onSuccess={() => {
                setIsFormOpen(false);
                setSelectedTemplate(null);
                refetch();
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the interview flow.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default InterviewTemplateManagement;

