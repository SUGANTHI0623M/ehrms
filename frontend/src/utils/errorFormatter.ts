/**
 * Utility function to format backend validation errors into user-friendly messages
 */

interface FieldMapping {
  [key: string]: string;
}

// Map backend field names to user-friendly labels
const fieldLabelMap: FieldMapping = {
  maritalStatus: 'Marital status',
  gender: 'Gender',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  designation: 'Designation',
  department: 'Department',
  employeeId: 'Employee ID',
  dob: 'Date of birth',
  bloodGroup: 'Blood group',
  address: 'Address',
  bankDetails: 'Bank details',
  uan: 'UAN',
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  pfNumber: 'PF Number',
  esiNumber: 'ESI Number',
  branchId: 'Branch',
  shiftName: 'Shift',
  attendanceTemplateId: 'Attendance template',
  leaveTemplateId: 'Leave template',
  holidayTemplateId: 'Holiday template',
};

/**
 * Converts camelCase or snake_case field names to user-friendly labels
 */
const getFieldLabel = (fieldName: string): string => {
  // Check if we have a direct mapping
  if (fieldLabelMap[fieldName]) {
    return fieldLabelMap[fieldName];
  }

  // Convert camelCase to Title Case
  const formatted = fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();

  return formatted;
};

/**
 * Parses backend validation error messages and converts them to user-friendly format
 * 
 * @param errorMessage - The error message from backend (e.g., "Validation failed: maritalStatus: \"\" is not a valid enum value for path 'maritalStatus'., gender: \"\" is not a valid enum value for path 'gender'.")
 * @returns Array of user-friendly error messages
 */
export const parseValidationErrors = (errorMessage: string): string[] => {
  if (!errorMessage) return [];

  const errors: string[] = [];

  // Check if it's a validation error
  if (errorMessage.includes('Validation failed:')) {
    // Extract the validation errors part
    const validationPart = errorMessage.replace('Validation failed:', '').trim();

    // Split by comma and period to get individual field errors
    const fieldErrors = validationPart.split(/[,\.]/).filter(err => err.trim());

    fieldErrors.forEach((error) => {
      const trimmed = error.trim();
      if (!trimmed) return;

      // Pattern: "fieldName: \"value\" is not a valid enum value for path 'fieldName'"
      // Or: "fieldName: \"value\" is required"
      // Or: "fieldName: Path `fieldName` is required"
      
      // Extract field name (before the colon)
      const fieldMatch = trimmed.match(/^([^:]+):/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1].trim();
        const fieldLabel = getFieldLabel(fieldName);

        // Check error type
        if (trimmed.includes('is not a valid enum value')) {
          // Empty string enum error
          errors.push(`${fieldLabel} is required`);
        } else if (trimmed.includes('is required') || trimmed.includes('Path') && trimmed.includes('is required')) {
          errors.push(`${fieldLabel} is required`);
        } else if (trimmed.includes('must be')) {
          // Extract the requirement
          const requirementMatch = trimmed.match(/must be (.+)$/);
          if (requirementMatch) {
            errors.push(`${fieldLabel} ${requirementMatch[1]}`);
          } else {
            errors.push(`${fieldLabel} is invalid`);
          }
        } else {
          // Generic error
          errors.push(`${fieldLabel} is invalid`);
        }
      } else {
        // If we can't parse, use the error as-is but clean it up
        const cleaned = trimmed
          .replace(/^[^:]+:\s*/, '') // Remove field name prefix
          .replace(/for path '[^']+'/, '') // Remove "for path 'fieldName'"
          .replace(/"/g, '') // Remove quotes
          .trim();
        
        if (cleaned) {
          errors.push(cleaned);
        }
      }
    });
  } else {
    // Not a validation error, return as-is
    errors.push(errorMessage);
  }

  // Remove duplicates
  return Array.from(new Set(errors));
};

/**
 * Formats error message for display
 * 
 * @param error - Error object from API
 * @returns User-friendly error message string
 */
export const formatErrorMessage = (error: any): string => {
  if (!error) return 'An error occurred';

  // Check for RTK Query error format
  const errorMessage = error?.data?.error?.message || error?.message || error?.error?.message || 'An error occurred';

  // Parse validation errors
  const parsedErrors = parseValidationErrors(errorMessage);

  if (parsedErrors.length === 0) {
    return errorMessage;
  }

  // Return formatted errors
  if (parsedErrors.length === 1) {
    return parsedErrors[0];
  }

  // Multiple errors - join them
  return parsedErrors.join(', ');
};
