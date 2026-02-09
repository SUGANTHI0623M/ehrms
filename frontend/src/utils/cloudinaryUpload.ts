/**
 * Cloudinary Upload Helper
 * 
 * This utility provides a consistent way to upload files to Cloudinary
 * through the backend API. All uploads are stored as URLs.
 */

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export interface UploadResult {
  success: boolean;
  url?: string;
  name?: string;
  error?: string;
}

// Determine API URL based on hostname (same logic as apiSlice.ts)
const getApiUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check if hostname is local (localhost, 127.0.0.1, or any local IP)
    const isLocal = hostname === 'localhost' || 
                   hostname === '127.0.0.1' || 
                   hostname === '0.0.0.0' ||
                   hostname.startsWith('192.168.') ||
                   hostname.startsWith('10.') ||
                   hostname.startsWith('172.16.') ||
                   hostname === '[::1]';
    
    if (isLocal) {
      // Use localhost for local development
      return 'http://localhost:8000/api';
    }
  }
  
  // For production/non-local environments, use VITE_API_URL from environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback: if no VITE_API_URL is set and not local, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api';
  }
  
  // Default fallback for SSR or other cases
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();

/**
 * Upload a file to Cloudinary via backend API
 * @param file - The file to upload
 * @param endpoint - The backend endpoint to use for upload
 * @param fieldName - The form field name for the file (default: 'file')
 * @param options - Upload options
 * @returns Promise with upload result containing URL
 */
export async function uploadToCloudinary(
  file: File,
  endpoint: string,
  fieldName: string = 'file',
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    // Validate file type if specified
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      if (!options.allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`,
        };
      }
    }

    // Validate file size if specified
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    // Create FormData
    const formData = new FormData();
    formData.append(fieldName, file);

    // Get authentication token for non-public endpoints
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token && !endpoint.includes('/public/')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Upload to backend
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error?.message || data.message || 'Upload failed',
      };
    }

    // Extract URL from response
    // Different endpoints may return URL in different structures
    let url: string | undefined;
    let fileName: string | undefined = file.name;

    if (data.data?.resume?.url) {
      // Resume upload response
      url = data.data.resume.url;
      fileName = data.data.resume.name || file.name;
    } else if (data.data?.profilePicture) {
      // Profile picture upload response
      url = data.data.profilePicture;
    } else if (data.data?.documentUrl) {
      // Document upload response
      url = data.data.documentUrl;
    } else if (data.data?.url) {
      // Generic URL response
      url = data.data.url;
    } else if (typeof data.data === 'string') {
      // Direct URL string
      url = data.data;
    } else if (data.url) {
      // Top-level URL
      url = data.url;
    }

    if (!url) {
      return {
        success: false,
        error: 'No URL returned from upload',
      };
    }

    return {
      success: true,
      url,
      name: fileName,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file',
    };
  }
}

/**
 * Upload a resume file
 * @param file - The resume file to upload
 * @param isPublic - Whether this is a public upload (no auth required)
 * @param isAdmin - Whether this is an admin/HR uploading for manual candidate creation
 */
export async function uploadResume(
  file: File,
  isPublic: boolean = false,
  isAdmin: boolean = false
): Promise<UploadResult> {
  let endpoint: string;
  
  if (isPublic) {
    // Public upload (no authentication)
    endpoint = '/candidate-form/public/upload-resume';
  } else if (isAdmin) {
    // Admin/HR upload for manual candidate creation - using separate admin endpoint
    endpoint = '/admin/candidate/upload-resume';
  } else {
    // Candidate's own resume upload (requires Candidate role)
    endpoint = '/candidate/resume';
  }
  
  const fieldName = 'resume';

  return uploadToCloudinary(file, endpoint, fieldName, {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    resourceType: 'raw',
  });
}

/**
 * Upload a profile picture
 */
export async function uploadProfilePicture(
  file: File
): Promise<UploadResult> {
  return uploadToCloudinary(file, '/candidate/profile-picture', 'profilePicture', {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxSize: 2 * 1024 * 1024, // 2MB
    resourceType: 'image',
  });
}

/**
 * Upload a document (generic)
 */
export async function uploadDocument(
  file: File,
  endpoint: string,
  fieldName: string = 'file',
  options: UploadOptions = {}
): Promise<UploadResult> {
  const defaultOptions: UploadOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB default
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    ...options,
  };

  return uploadToCloudinary(file, endpoint, fieldName, defaultOptions);
}

/**
 * Upload background verification document
 */
export async function uploadBackgroundVerificationDocument(
  file: File,
  candidateId: string,
  category: string
): Promise<UploadResult> {
  return uploadToCloudinary(
    file,
    `/background-verification/candidate/${candidateId}/upload`,
    'document',
    {
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
      maxSize: 10 * 1024 * 1024, // 10MB
    }
  );
}

/**
 * Upload onboarding document
 */
export async function uploadOnboardingDocument(
  file: File,
  onboardingId: string,
  documentId: string
): Promise<UploadResult> {
  return uploadToCloudinary(
    file,
    `/onboarding/${onboardingId}/documents/${documentId}/upload`,
    'file',
    {
      allowedTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxSize: 10 * 1024 * 1024, // 10MB
    }
  );
}

/**
 * Upload candidate document
 */
export async function uploadCandidateDocument(
  file: File,
  candidateId: string,
  documentType: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);

  try {
    const response = await fetch(
      `${API_URL}/candidates/${candidateId}/documents/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error?.message || data.message || 'Upload failed',
      };
    }

    return {
      success: true,
      url: data.data?.documentUrl || data.data?.url,
      name: file.name,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload document',
    };
  }
}

