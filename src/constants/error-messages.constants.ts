import { ERROR_CODE, type ErrorCode } from './error-codes.constants';

/** English-only API error messages keyed by ERROR_CODE. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODE.VALIDATION_FAILED]: 'Validation failed',

  [ERROR_CODE.USERNAME_EXISTS]: 'Username already exists',
  [ERROR_CODE.EMAIL_ALREADY_USED]: 'Email is already in use',
  [ERROR_CODE.EMAIL_REQUIRED]: 'Email is required',
  [ERROR_CODE.EMAIL_INVALID]: 'Email is invalid',
  [ERROR_CODE.PASSWORD_REQUIRED]: 'Password is required',
  [ERROR_CODE.PASSWORD_TOO_SHORT]: 'Password must be at least 6 characters',
  [ERROR_CODE.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ERROR_CODE.ACCOUNT_DEACTIVATED]: 'Account has been deactivated',
  [ERROR_CODE.TOKEN_INVALID]: 'Invalid or expired token',
  [ERROR_CODE.ACCESS_DENIED]: 'Access denied',
  [ERROR_CODE.FORBIDDEN_OPERATION]: 'You do not have permission to perform this action',

  [ERROR_CODE.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODE.CANNOT_CHANGE_PASSWORD]: 'Unable to change password',
  [ERROR_CODE.CURRENT_PASSWORD_WRONG]: 'Current password is incorrect',

  [ERROR_CODE.USER_ID_REQUIRED]: 'User ID is required',
  [ERROR_CODE.WRITING_ID_REQUIRED]: 'Writing ID is required',
  [ERROR_CODE.ANALYTICS_ID_REQUIRED]: 'Analytics ID is required',
  [ERROR_CODE.WRITING_IDS_REQUIRED]: 'Writing IDs are required',

  [ERROR_CODE.WRITING_NOT_FOUND]: 'Writing not found',
  [ERROR_CODE.WRITING_ACCESS_DENIED]: 'You do not have permission to view this writing',
  [ERROR_CODE.WRITING_TYPE_NOT_SUPPORTED]:
    'Only SOCIAL_ESSAY and CATHOLIC_ESSAY writing types are currently supported',
  [ERROR_CODE.OUTLINE_GENERATION_FAILED]: 'Failed to generate outline. Please try again later',
  [ERROR_CODE.PROMPT_GENERATION_FAILED]: 'Failed to generate writing prompts. Please try again later',

  [ERROR_CODE.ANALYTICS_NOT_FOUND]: 'Analysis result not found',
  [ERROR_CODE.ANALYTICS_ACCESS_DENIED]: 'You do not have permission to access this analysis',
  [ERROR_CODE.ANALYTICS_EXPORT_NO_DATA]:
    'Analysis result has no exportable data. Please run AI analysis again',
  [ERROR_CODE.TOKEN_LIMIT_EXCEEDED]: 'Daily token limit exceeded',
  [ERROR_CODE.AI_ANALYSIS_FAILED]: 'AI analysis generation failed',
  [ERROR_CODE.AI_INVALID_RESPONSE]: 'AI analysis generation failed due to invalid AI response',

  [ERROR_CODE.REVISION_NOT_FOUND]: 'Revision not found',

  [ERROR_CODE.SUGGESTION_NOT_FOUND]: 'Suggestion not found',
  [ERROR_CODE.ANALYSIS_NOT_FOUND]: 'Analysis not found',
  [ERROR_CODE.NO_SUGGESTIONS_IN_REPORT]: 'No suggestions found in analysis report',

  [ERROR_CODE.WRITING_NOT_PUBLIC]: 'Writing is not set to public status',
  [ERROR_CODE.RELATED_WRITING_NOT_FOUND]: 'Related writing not found',

  [ERROR_CODE.FILE_REQUIRED]: 'Please select a file to upload',
  [ERROR_CODE.FILE_TOO_LARGE]: 'File is too large. Maximum size is 5MB',
  [ERROR_CODE.DOC_LEGACY_NOT_SUPPORTED]:
    'Legacy .doc files are not supported. Please save as .docx',
  [ERROR_CODE.FILE_TYPE_DOCX_ONLY]: 'Only .docx files are supported',
  [ERROR_CODE.FILE_INVALID_MIME]: 'Invalid file format. Please upload a .docx file',
  [ERROR_CODE.FILE_EMPTY_OR_CORRUPT]:
    'Could not read file content. The file may be empty or corrupted',

  [ERROR_CODE.BOOK_NOT_FOUND]: 'Book not found',
  [ERROR_CODE.BOOK_RECOMMENDATION_FAILED]:
    'Failed to generate book recommendations. Please try again later',
  [ERROR_CODE.BOOK_CATALOG_EMPTY]: 'No books available in the catalog',

  [ERROR_CODE.CHAPTER_NOT_FOUND]: 'Chapter not found',
  [ERROR_CODE.BOOK_NO_CHAPTERS]: 'This book has no readable chapters yet',
  [ERROR_CODE.BOOK_INGEST_FAILED]: 'Failed to import book content. Please try again',
  [ERROR_CODE.UNSUPPORTED_BOOK_FORMAT]:
    'Unsupported book file format. Use .docx, .epub, or .pdf',
  [ERROR_CODE.BOOK_FILE_TOO_LARGE]: 'Book file is too large. Maximum size is 15MB',
  [ERROR_CODE.BOOK_ACCESS_DENIED]: 'You do not have permission to access this book',
  [ERROR_CODE.BOOK_NOT_PENDING]: 'This book is not awaiting approval',
  [ERROR_CODE.BOOK_ALREADY_REVIEWED]: 'This book has already been reviewed',

  [ERROR_CODE.CANNOT_MODIFY_OWN_ADMIN_ACCOUNT]:
    'You cannot change your own role or deactivate your own account',
  [ERROR_CODE.LAST_ADMIN_REQUIRED]:
    'At least one active admin account must remain in the system',

  [ERROR_CODE.EXPORT_ACCESS_DENIED]: 'You do not have permission to export this writing',

  [ERROR_CODE.AI_SUGGESTION_GENERATION_FAILED]: 'Failed to generate writing suggestions',
  [ERROR_CODE.GEMINI_EMPTY_RESPONSE]: 'Gemini returned an empty response',
  [ERROR_CODE.GEMINI_RATE_LIMITED]:
    'Gemini free tier rate limit reached. Please wait a few minutes or try again tomorrow',
  [ERROR_CODE.GEMINI_MODEL_NOT_FOUND]:
    'Gemini model not found. Check GEMINI_MODEL in .env',
  [ERROR_CODE.GEMINI_API_KEY_INVALID]:
    'Invalid Gemini API key. Check GEMINI_API_KEY in .env',
  [ERROR_CODE.GEMINI_SERVICE_UNAVAILABLE]: 'Gemini API is temporarily unavailable',
  [ERROR_CODE.TOKEN_LIMIT_CHECK_FAILED]: 'Failed to check token limit',
};
