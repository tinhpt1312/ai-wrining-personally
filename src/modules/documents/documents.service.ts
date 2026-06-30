import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.docx'];
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];

export interface ParsedDocument {
  title: string;
  content: string;
  fileName: string;
}

@Injectable()
export class DocumentsService {
  async parseDocx(file: Express.Multer.File): Promise<ParsedDocument> {
    if (!file) {
      throwAppError(ERROR_CODE.FILE_REQUIRED);
    }

    if (file.size > MAX_FILE_SIZE) {
      throwAppError(ERROR_CODE.FILE_TOO_LARGE);
    }

    const extension = this.getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      if (extension === '.doc') {
        throwAppError(ERROR_CODE.DOC_LEGACY_NOT_SUPPORTED);
      }
      throwAppError(ERROR_CODE.FILE_TYPE_DOCX_ONLY);
    }

    if (
      file.mimetype &&
      !ALLOWED_MIME_TYPES.includes(file.mimetype) &&
      file.mimetype !== 'application/zip'
    ) {
      throwAppError(ERROR_CODE.FILE_INVALID_MIME);
    }

    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const content = result.value.trim();

    if (!content || content.length < 10) {
      throwAppError(ERROR_CODE.FILE_EMPTY_OR_CORRUPT);
    }

    const title = this.extractTitle(file.originalname, content);

    return {
      title,
      content,
      fileName: file.originalname,
    };
  }

  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    if (dot === -1) return '';
    return filename.slice(dot).toLowerCase();
  }

  private extractTitle(filename: string, content: string): string {
    const baseName = filename.replace(/\.[^.]+$/, '').trim();
    if (baseName.length >= 3) {
      return baseName;
    }

    const firstLine = content.split('\n').find((line) => line.trim().length > 0);
    if (firstLine && firstLine.trim().length >= 3 && firstLine.trim().length <= 255) {
      return firstLine.trim();
    }

    return 'Bài viết từ file Word';
  }
}
