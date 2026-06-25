import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as mammoth from 'mammoth';

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
      throw new BadRequestException('Vui lòng chọn file để tải lên');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa là 5MB');
    }

    const extension = this.getExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      if (extension === '.doc') {
        throw new UnsupportedMediaTypeException(
          'File .doc (Word cũ) chưa được hỗ trợ. Vui lòng lưu file dưới định dạng .docx',
        );
      }
      throw new UnsupportedMediaTypeException(
        'Chỉ hỗ trợ file .docx. Vui lòng tải lên file Word (.docx)',
      );
    }

    if (
      file.mimetype &&
      !ALLOWED_MIME_TYPES.includes(file.mimetype) &&
      file.mimetype !== 'application/zip'
    ) {
      throw new UnsupportedMediaTypeException(
        'Định dạng file không hợp lệ. Vui lòng tải lên file .docx',
      );
    }

    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const content = result.value.trim();

    if (!content || content.length < 10) {
      throw new BadRequestException(
        'Không đọc được nội dung từ file. File có thể trống hoặc bị lỗi.',
      );
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
