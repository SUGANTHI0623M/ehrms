import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";

interface DebouncedSearchInputProps {
  placeholder?: string;
  queryParam?: string; // Query parameter name (default: "search")
  debounceMs?: number; // Debounce delay in milliseconds (default: 500)
  onSearchChange?: (value: string) => void; // Optional callback when search changes
  className?: string;
  value?: string; // Optional controlled value
  defaultValue?: string; // Optional default value
}

export const DebouncedSearchInput = ({
  placeholder = "Search...",
  queryParam = "search",
  debounceMs = 500,
  onSearchChange,
  className = "",
  value: controlledValue,
  defaultValue = "",
}: DebouncedSearchInputProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialValue = controlledValue ?? searchParams.get(queryParam) ?? defaultValue;
  const [localValue, setLocalValue] = useState(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  const isInitialMount = useRef(true);
  const lastDebouncedValue = useRef(localValue);

  // Keep callback ref updated
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  // Sync with controlled value if provided
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== localValue) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Initialize from URL query params on mount only
  useEffect(() => {
    if (isInitialMount.current) {
      const urlValue = searchParams.get(queryParam) ?? "";
      if (urlValue && controlledValue === undefined) {
        setLocalValue(urlValue);
      }
      isInitialMount.current = false;
    }
  }, [queryParam, controlledValue]);

  // Debounced search update - only depends on localValue
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      const trimmedValue = localValue.trim();
      
      // Only update if value actually changed
      if (trimmedValue !== lastDebouncedValue.current) {
        lastDebouncedValue.current = trimmedValue;

        // Update URL query params - get fresh searchParams inside timeout
        setSearchParams((prevParams) => {
          const newParams = new URLSearchParams(prevParams);
          if (trimmedValue) {
            newParams.set(queryParam, trimmedValue);
          } else {
            newParams.delete(queryParam);
          }
          return newParams;
        }, { replace: true });

        // Call optional callback
        if (onSearchChangeRef.current) {
          onSearchChangeRef.current(trimmedValue);
        }
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localValue, queryParam, debounceMs, setSearchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleClear = useCallback(() => {
    setLocalValue("");
    lastDebouncedValue.current = "";
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete(queryParam);
      return newParams;
    }, { replace: true });
    if (onSearchChangeRef.current) {
      onSearchChangeRef.current("");
    }
  }, [queryParam, setSearchParams]);

  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder={placeholder}
        className={`pl-10 ${localValue ? "pr-10" : ""}`}
        value={localValue}
        onChange={handleChange}
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
};

