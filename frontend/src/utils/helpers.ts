/**
 * Extract ID from an entity that can be either a string or an object with _id
 * This is a common pattern when dealing with populated Mongoose documents
 */
export const extractId = (entity: any): string | null => {
  if (!entity) return null;
  
  // If it's already a string, return it
  if (typeof entity === 'string') {
    return entity;
  }
  
  // If it's an object with _id, extract it
  if (typeof entity === 'object' && entity !== null) {
    if (entity._id) {
      return typeof entity._id === 'string' ? entity._id : String(entity._id);
    }
    // If the object itself is an ObjectId-like structure
    if ('toString' in entity && typeof entity.toString === 'function') {
      return entity.toString();
    }
  }
  
  return null;
};

/**
 * Validate if a value is a valid MongoDB ObjectId string
 */
export const isValidObjectId = (id: any): boolean => {
  if (!id) return false;
  const idString = typeof id === 'string' ? id : String(id);
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(idString);
};

/**
 * Safely extract candidate ID from interview object
 */
export const getCandidateIdFromInterview = (interview: any): string | null => {
  if (!interview) return null;
  
  const candidateId = interview.candidateId;
  const extracted = extractId(candidateId);
  
  if (!extracted || !isValidObjectId(extracted)) {
    console.warn('Invalid candidateId in interview:', interview._id, candidateId);
    return null;
  }
  
  return extracted;
};

/**
 * Safely extract interviewer ID from interview object
 */
export const getInterviewerIdFromInterview = (interview: any): string | null => {
  if (!interview) return null;
  
  const interviewerId = interview.interviewerId;
  return extractId(interviewerId);
};

