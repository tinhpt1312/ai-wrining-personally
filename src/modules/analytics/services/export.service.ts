import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ERROR_CODE } from 'src/constants';
import { throwAppError } from 'src/common/app.exception';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
// pdfmake 0.3 exports a singleton instance, not a constructor
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake') as {
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  createPdf: (docDefinition: TDocumentDefinitions) => {
    getBuffer: () => Promise<Buffer>;
  };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require('pdfmake/fonts/Roboto') as Record<
  string,
  Record<string, string>
>;
pdfmake.addFonts(pdfFonts);
import { Analytics, Writing } from 'src/entities';
import { WritingStatusEnum } from '../../writings/enum';
import { extractAiAnalytics } from '../../writing-suggestions/utils/analysis-suggestions.util';
import type { WritingAnalytics } from '../../../shared/ai/schemas/analysis-response.schema';
import type { FeedbackItem } from '../../../shared/ai/schemas/analysis-response.schema';

const CRITERIA_LABELS: Record<string, string> = {
  structure: 'Bố cục & Tổ chức',
  clarity: 'Rõ ràng & Diễn đạt',
  tone: 'Giọng điệu & Phong cách',
  coherence: 'Sự liên kết',
};

const CRITERIA_KEYS = ['structure', 'clarity', 'tone', 'coherence'] as const;

interface ExportData {
  writingTitle: string;
  writingContent: string;
  writingType: string;
  analysisDate: Date;
  overallScore: number | null;
  feedback: WritingAnalytics;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Analytics)
    private readonly analysisRepository: Repository<Analytics>,
    @InjectRepository(Writing)
    private readonly writingRepository: Repository<Writing>,
  ) {}

  async exportDocx(
    analysisId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const data = await this.loadExportData(analysisId, userId);
    const doc = this.buildDocxDocument(data);
    const buffer = await Packer.toBuffer(doc);
    return {
      buffer,
      fileName: this.getExportFileName(
        data.writingTitle,
        'docx',
        data.analysisDate,
      ),
    };
  }

  async exportPdf(
    analysisId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const data = await this.loadExportData(analysisId, userId);
    const docDefinition = this.buildPdfDefinition(data);
    const buffer = await this.generatePdfBuffer(docDefinition);
    return {
      buffer,
      fileName: this.getExportFileName(
        data.writingTitle,
        'pdf',
        data.analysisDate,
      ),
    };
  }

  async exportWritingDocx(
    writingId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const writing = await this.loadWritingForExport(writingId, userId);
    const doc = this.buildWritingDocxDocument(writing);
    const buffer = await Packer.toBuffer(doc);
    return {
      buffer,
      fileName: this.getWritingFileName(writing.title, 'docx'),
    };
  }

  async exportWritingPdf(
    writingId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const writing = await this.loadWritingForExport(writingId, userId);
    const docDefinition = this.buildWritingPdfDefinition(writing);
    const buffer = await this.generatePdfBuffer(docDefinition);
    return {
      buffer,
      fileName: this.getWritingFileName(writing.title, 'pdf'),
    };
  }

  getWritingFileName(title: string, format: 'docx' | 'pdf'): string {
    const safe = title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .trim()
      .slice(0, 100);
    return `${safe || 'bai-viet'}.${format}`;
  }

  getExportFileName(
    title: string,
    format: 'docx' | 'pdf',
    date: Date,
  ): string {
    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50)
      .toLowerCase();
    const dateStr = date.toISOString().slice(0, 10);
    return `bao-cao-cham-bai-${slug || 'bai-viet'}-${dateStr}.${format}`;
  }

  private async loadExportData(
    analysisId: string,
    userId: string,
  ): Promise<ExportData> {
    const analysis = await this.analysisRepository.findOne({
      where: { id: analysisId, userId },
    });

    if (!analysis) {
      throwAppError(ERROR_CODE.ANALYTICS_NOT_FOUND);
    }

    const feedback = extractAiAnalytics(analysis.feedbackJson);
    if (!feedback) {
      throwAppError(ERROR_CODE.ANALYTICS_EXPORT_NO_DATA);
    }

    const writing = await this.writingRepository.findOne({
      where: { id: analysis.writingId, userId },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    return {
      writingTitle: writing.title,
      writingContent: writing.content,
      writingType: writing.type,
      analysisDate: analysis.createdAt,
      overallScore: this.calculateOverallScore(feedback),
      feedback,
    };
  }

  private async loadWritingForExport(
    writingId: string,
    userId: string,
  ): Promise<Writing> {
    const writing = await this.writingRepository.findOne({
      where: { id: writingId },
    });

    if (!writing) {
      throwAppError(ERROR_CODE.WRITING_NOT_FOUND);
    }

    if (
      writing.userId !== userId &&
      writing.status !== WritingStatusEnum.PUBLIC
    ) {
      throwAppError(ERROR_CODE.EXPORT_ACCESS_DENIED);
    }

    return writing;
  }

  private calculateOverallScore(feedback: WritingAnalytics): number | null {
    const scores = CRITERIA_KEYS.map((key) => feedback[key]?.score).filter(
      (s): s is number => typeof s === 'number',
    );
    if (scores.length === 0) return null;
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.round(avg * 10) / 10;
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
  }

  private buildDocxDocument(data: ExportData): Document {
    const children: Paragraph[] = [];

    children.push(
      new Paragraph({
        text: 'BÁO CÁO CHẤM BÀI AI',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: data.writingTitle, bold: true, size: 28 }),
        ],
        spacing: { after: 200 },
      }),
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Loại bài: ${data.writingType}`, italics: true }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Ngày chấm: ${this.formatDate(data.analysisDate)}`,
            italics: true,
          }),
        ],
      }),
    );

    if (data.overallScore != null) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Điểm tổng: ${data.overallScore}/10`,
              bold: true,
              size: 32,
            }),
          ],
          spacing: { before: 200, after: 200 },
        }),
      );
    }

    if (data.feedback.overallFeedback) {
      children.push(
        new Paragraph({
          text: 'Nhận xét chung',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun(data.feedback.overallFeedback)],
          spacing: { after: 200 },
        }),
      );
    }

    this.addDocxListSection(children, 'Điểm mạnh', data.feedback.strengths);
    this.addDocxListSection(
      children,
      'Cần cải thiện',
      data.feedback.areasForImprovement,
    );
    this.addDocxListSection(
      children,
      'Hành động đề xuất',
      data.feedback.actionItems,
    );

    children.push(
      new Paragraph({
        text: 'Chi tiết tiêu chí',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300 },
      }),
    );

    for (const key of CRITERIA_KEYS) {
      const criterion = data.feedback[key];
      if (!criterion) continue;
      this.addDocxCriterion(children, CRITERIA_LABELS[key], criterion);
    }

    children.push(
      new Paragraph({
        text: 'Nội dung bài viết',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300 },
      }),
    );
    for (const line of data.writingContent.split('\n')) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }

    if (data.feedback.sampleWriting) {
      children.push(
        new Paragraph({
          text: 'Bài viết mẫu',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300 },
        }),
      );
      for (const line of data.feedback.sampleWriting.split('\n')) {
        children.push(new Paragraph({ children: [new TextRun(line)] }));
      }
    }

    return new Document({
      sections: [{ children }],
    });
  }

  private buildWritingDocxDocument(writing: Writing): Document {
    const children: Paragraph[] = [
      new Paragraph({
        text: writing.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
    ];

    for (const line of writing.content.split('\n')) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }

    return new Document({
      title: writing.title,
      sections: [{ children }],
    });
  }

  private buildWritingPdfDefinition(writing: Writing): TDocumentDefinitions {
    return {
      content: [
        {
          text: writing.title,
          style: 'title',
          alignment: 'center',
          margin: [0, 0, 0, 24],
        },
        { text: writing.content },
      ],
      defaultStyle: { font: 'Roboto', fontSize: 12, lineHeight: 1.5 },
      styles: {
        title: { fontSize: 20, bold: true },
      },
    };
  }

  private addDocxListSection(
    children: Paragraph[],
    title: string,
    items?: string[],
  ): void {
    if (!items?.length) return;
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200 },
      }),
    );
    for (const item of items) {
      children.push(
        new Paragraph({
          children: [new TextRun(`• ${item}`)],
          spacing: { after: 80 },
        }),
      );
    }
  }

  private addDocxCriterion(
    children: Paragraph[],
    label: string,
    criterion: FeedbackItem,
  ): void {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${label} — `, bold: true }),
          new TextRun({ text: `${criterion.score}/10`, bold: true }),
        ],
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [new TextRun(criterion.feedback)],
        spacing: { after: 100 },
      }),
    );
    for (const suggestion of criterion.suggestions ?? []) {
      children.push(
        new Paragraph({
          children: [new TextRun(`  → ${suggestion}`)],
          spacing: { after: 60 },
        }),
      );
    }
  }

  private buildPdfDefinition(data: ExportData): TDocumentDefinitions {
    const content: Content[] = [
      { text: 'BÁO CÁO CHẤM BÀI AI', style: 'title', alignment: 'center' },
      { text: data.writingTitle, style: 'subtitle', margin: [0, 10, 0, 4] },
      {
        text: `Loại bài: ${data.writingType}`,
        style: 'meta',
        margin: [0, 0, 0, 2],
      },
      {
        text: `Ngày chấm: ${this.formatDate(data.analysisDate)}`,
        style: 'meta',
        margin: [0, 0, 0, 10],
      },
    ];

    if (data.overallScore != null) {
      content.push({
        text: `Điểm tổng: ${data.overallScore}/10`,
        style: 'score',
        margin: [0, 0, 0, 16],
      });
    }

    if (data.feedback.overallFeedback) {
      content.push(
        { text: 'Nhận xét chung', style: 'sectionHeader' },
        { text: data.feedback.overallFeedback, margin: [0, 0, 0, 12] },
      );
    }

    this.addPdfListSection(content, 'Điểm mạnh', data.feedback.strengths);
    this.addPdfListSection(
      content,
      'Cần cải thiện',
      data.feedback.areasForImprovement,
    );
    this.addPdfListSection(
      content,
      'Hành động đề xuất',
      data.feedback.actionItems,
    );

    content.push({ text: 'Chi tiết tiêu chí', style: 'sectionHeader' });

    for (const key of CRITERIA_KEYS) {
      const criterion = data.feedback[key];
      if (!criterion) continue;
      content.push(
        {
          text: `${CRITERIA_LABELS[key]} — ${criterion.score}/10`,
          style: 'criterionTitle',
        },
        { text: criterion.feedback, margin: [0, 0, 0, 4] },
      );
      if (criterion.suggestions?.length) {
        content.push({
          ul: criterion.suggestions,
          margin: [0, 0, 0, 8],
        });
      }
    }

    content.push(
      { text: 'Nội dung bài viết', style: 'sectionHeader', pageBreak: 'before' },
      { text: data.writingContent, margin: [0, 0, 0, 12] },
    );

    if (data.feedback.sampleWriting) {
      content.push(
        { text: 'Bài viết mẫu', style: 'sectionHeader' },
        { text: data.feedback.sampleWriting },
      );
    }

    return {
      content,
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      styles: {
        title: { fontSize: 18, bold: true },
        subtitle: { fontSize: 14, bold: true },
        meta: { fontSize: 10, color: '#666666', italics: true },
        score: { fontSize: 16, bold: true },
        sectionHeader: {
          fontSize: 13,
          bold: true,
          margin: [0, 12, 0, 6],
        },
        criterionTitle: { fontSize: 11, bold: true, margin: [0, 8, 0, 4] },
      },
    };
  }

  private addPdfListSection(
    content: Content[],
    title: string,
    items?: string[],
  ): void {
    if (!items?.length) return;
    content.push(
      { text: title, style: 'sectionHeader' },
      { ul: items, margin: [0, 0, 0, 8] },
    );
  }

  private generatePdfBuffer(
    docDefinition: TDocumentDefinitions,
  ): Promise<Buffer> {
    return pdfmake.createPdf(docDefinition).getBuffer();
  }
}
