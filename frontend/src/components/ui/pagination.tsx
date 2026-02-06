import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

export const Pagination = ({
  page,
  pageSize,
  total,
  pages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
}: PaginationProps) => {
  // Always show pagination if there's data or if page size selector is enabled
  if (total === 0 && !showPageSizeSelector) {
    return null;
  }

  const startItem = total > 0 ? ((page - 1) * pageSize) + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  // Calculate page numbers to show
  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisible = 5;

    if (pages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show pages around current page
      if (page <= 3) {
        // Show first 5 pages
        for (let i = 1; i <= maxVisible; i++) {
          pageNumbers.push(i);
        }
      } else if (page >= pages - 2) {
        // Show last 5 pages
        for (let i = pages - maxVisible + 1; i <= pages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Show pages around current page
        for (let i = page - 2; i <= page + 2; i++) {
          pageNumbers.push(i);
        }
      }
    }

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
      {/* Left side: Results count and page size selector */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Results count - Always show */}
        <div className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>
              Showing <span className="font-medium text-foreground">{startItem}</span> to{" "}
              <span className="font-medium text-foreground">{endItem}</span> of{" "}
              <span className="font-medium text-foreground">{total}</span> results
            </>
          ) : (
            <span>No results found</span>
          )}
        </div>
        {/* Page size selector - Always show when enabled */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                const newSize = parseInt(value, 10);
                onPageSizeChange(newSize);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        )}
      </div>
      {/* Right side: Navigation buttons - Always show, disabled when appropriate */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1 || pages === 0}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1 || pages === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>

        {/* Page Numbers - Only show if there are pages */}
        {pages > 0 && (
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum) => (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="sm"
                className="min-w-[40px]"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={page === pages || pages === 0}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === pages || pages === 0}
          onClick={() => onPageChange(pages)}
          title="Last page"
        >
          Last
        </Button>
      </div>
    </div>
  );
};
