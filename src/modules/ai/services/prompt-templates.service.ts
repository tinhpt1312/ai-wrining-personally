import { Injectable } from '@nestjs/common';
import { WritingType } from '../types/ai.types';
import { Writing } from 'src/entities';

@Injectable()
export class PromptTemplatesService {
  private getResponseFormatBlock(): string {
    return `
      **Định dạng Phản hồi:**
      Trả về CHỈ một đối tượng JSON hợp lệ (không dùng markdown), toàn bộ nội dung bằng tiếng Việt:
      {
        "structure": {
          "score": <số 1-10>,
          "feedback": "<phản hồi cụ thể>",
          "suggestions": ["<đề xuất 1>", "<đề xuất 2>"]
        },
        "clarity": {
          "score": <số 1-10>,
          "feedback": "<phản hồi cụ thể>",
          "suggestions": ["<đề xuất 1>", "<đề xuất 2>"]
        },
        "tone": {
          "score": <số 1-10>,
          "feedback": "<phản hồi cụ thể>",
          "suggestions": ["<đề xuất 1>", "<đề xuất 2>"]
        },
        "coherence": {
          "score": <số 1-10>,
          "feedback": "<phản hồi cụ thể>",
          "suggestions": ["<đề xuất 1>", "<đề xuất 2>"]
        },
        "overallFeedback": "<tóm tắt toàn diện 2-3 câu>",
        "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>", "<điểm mạnh 3>"],
        "areasForImprovement": ["<lĩnh vực 1>", "<lĩnh vực 2>", "<lĩnh vực 3>"],
        "actionItems": ["<hành động 1>", "<hành động 2>", "<hành động 3>"],
        "sampleWriting": "<bài viết mẫu hoàn chỉnh>"
      }

      **Yêu cầu trường sampleWriting (bài viết mẫu):**
      - Viết một bài hoàn chỉnh cùng thể loại và chủ đề với bài gốc
      - Áp dụng các gợi ý cải thiện từ phản hồi phía trên
      - Giữ ý chính của tác giả nhưng trình bày rõ ràng, mạch lạc hơn
      - Không sao chép nguyên văn bài gốc
      - Độ dài tương đương hoặc dài hơn bài gốc để người đọc hình dung được bản viết tốt
    `;
  }

  /**
   * Get specialized prompt based on writing type
   */
  getPrompt(writing: Writing, type: WritingType): string {
    switch (type) {
      case WritingType.CATHOLIC_ESSAY:
        return this.getCatholicEssayPrompt(writing);
      case WritingType.SOCIAL_ESSAY:
        return this.getSocialEssayPrompt(writing);
      case WritingType.SHORT_STORY:
        return this.getShortStoryPrompt(writing);
      default:
        return this.getDefaultPrompt(writing);
    }
  }

  /**
   * Prompt for Catholic essays
   * Focus on: clarity, coherence, theological understanding, personal reflection
   */
  private getCatholicEssayPrompt(writing: Writing): string {
    return `
      Phân tích bài luận công giáo tiếng Việt này và cung cấp phản hồi chi tiết theo định dạng JSON được chỉ định.

      **Bài Luận Công Giáo:**
      Tiêu đề: ${writing.title}
      Nội dung:
      ${writing.content}

      **Nhiệm vụ Phân tích:**
      Đánh giá bài luận công giáo này trên các khía cạnh:

      1. **Cấu trúc & Tổ chức**: Ý tưởng được sắp xếp tốt như thế nào? Chúng có luồng logic không?
      2. **Rõ ràng & Cách diễn đạt**: Tác giả diễn đạt cảm xúc và ý tưởng rõ ràng như thế nào?
      3. **Giọng điệu & Phong cách**: Giọng điệu cảm xúc như thế nào? Nó có vẻ chân thật không?
      4. **Sự liên kết**: Các câu kết nối tốt như thế nào? Tường thuật có dễ theo dõi không?

      **Tiêu chí Đánh giá:**
      - Điểm từng khía cạnh từ 1-10
      - Cung cấp phản hồi cụ thể, có thể hành động được
      - Làm nổi bật những điểm mạnh (những gì làm tốt)
      - Đề xuất 2-3 cải tiến cụ thể
      - Đối với viết cá nhân, cân nhắc tính xác thực cảm xúc và chất lượng tự suy ngẫm

      ${this.getResponseFormatBlock()}

      Hãy khuyến khích nhưng trung thực. Tập trung vào sự phát triển và tiến bộ.
    `;
  }

  /**
   * Prompt for social/academic essays
   * Focus on: argument structure, persuasiveness, evidence, clarity, vocabulary
   */
  private getSocialEssayPrompt(writing: Writing): string {
    return `
      Phân tích bài luận xã hội tiếng Việt này và cung cấp phản hồi chi tiết theo định dạng JSON được chỉ định.

      **Bài Luận:**
      Tiêu đề: ${writing.title}
      Nội dung:
      ${writing.content}

      **Nhiệm vụ Phân tích:**
      Đánh giá bài luận này trên các khía cạnh:

      1. **Cấu trúc & Tổ chức**: Có phần mở đầu, thân bài và kết luận rõ ràng không?论điểm có luồng logic không?
      2. **Rõ ràng & Cách diễn đạt**: Bài viết rõ ràng như thế nào? Từ vựng có phù hợp và đa dạng không?
      3. **Giọng điệu & Phong cách**: Giọng điệu có phù hợp với chủ đề không? Nó có thích hợp cho đối tượng mục tiêu không?
      4. **Sự liên kết**: Các đoạn văn kết nối tốt như thế nào? Các chuyển tiếp mượt mà không?

      **Tiêu chí Đánh giá:**
      - Điểm từng khía cạnh từ 1-10
      - Đối với viết học thuật/xã hội, đánh giá sức mạnh của lập luận và trình bày bằng chứng
      - Kiểm tra luồng logic và khả năng thuyết phục
      - Đánh giá từ vựng và sự tinh vi của ngôn ngữ

      ${this.getResponseFormatBlock()}

      Tập trung vào chất lượng lập luận và hiệu quả giao tiếp.
    `;
  }

  /**
   * Prompt for reflection pieces
   * Focus on: introspection, depth, self-awareness, insights, growth
   */
  private getShortStoryPrompt(writing: Writing): string {
    return `
      Phân tích truyện ngắn tiếng Việt này và cung cấp phản hồi chi tiết theo định dạng JSON được chỉ định.

      **Truyện Ngắn:**
      Tiêu đề: ${writing.title}
      Nội dung:
      ${writing.content}

      **Nhiệm vụ Phân tích:**
      Đánh giá truyện ngắn này trên các khía cạnh:

      1. **Cấu trúc & Tổ chức**: Truyện có phần đầu, giữa và kết thúc rõ ràng không? Nó được sắp xếp tốt không?
      2. **Rõ ràng & Cách diễn đạt**: Tác giả truyền tải câu chuyện và nhân vật rõ ràng như thế nào?
      3. **Giọng điệu & Phong cách**: Giọng điệu có phù hợp với tâm trạng và chủ đề của truyện không? Nó có nhất quán và hấp dẫn không?
      4. **Sự liên kết**: Các ý tưởng kết nối logic không? Sự suy ngẫm có dễ theo dõi không?

      **Tiêu chí Đánh giá:**
      - Điểm từng khía cạnh từ 1-10
      - Tìm kiếm độ sâu của sự nội tưởng và tự nhận thức
      - Đánh giá chất lượng của những hiểu biết sâu sắc và học tập
      - Xem xét tác giả kết nối quan sát với hiểu biết sâu hơn như thế nào

      ${this.getResponseFormatBlock()}

      Nhấn mạnh độ sâu của hiểu biết sâu sắc và sự phát triển cá nhân. Hãy hỗ trợ hành trình suy ngẫm.
    `;
  }

  /**
   * Default prompt for unknown types
   */
  private getDefaultPrompt(writing: Writing): string {
    return `
      Phân tích bài viết tiếng Việt này và cung cấp phản hồi chi tiết theo định dạng JSON được chỉ định.

      **Bài Viết:**
      Tiêu đề: ${writing.title}
      Loại: ${writing.type}
      Nội dung:
      ${writing.content}

      **Nhiệm vụ Phân tích:**
      Cung cấp phản hồi viết toàn diện đánh giá:
      1. Cấu trúc & Tổ chức
      2. Rõ ràng & Cách diễn đạt
      3. Giọng điệu & Phong cách
      4. Sự liên kết Chung

      ${this.getResponseFormatBlock()}

      Cung cấp phản hồi xây dựng, khuyến khích tập trung vào cải tiến.
    `;
  }

  /**
   * Get all supported writing types
   */
  getSupportedTypes(): WritingType[] {
    return [WritingType.SOCIAL_ESSAY, WritingType.CATHOLIC_ESSAY];
  }

  /**
   * Outline prompt for pre-writing structure
   */
  getOutlinePrompt(
    title: string,
    type: string,
    topic?: string,
  ): string {
    const topicBlock = topic?.trim()
      ? `\n**Gợi ý / mô tả đề:**\n${topic.trim()}\n`
      : '';

    const structureHint = this.getOutlineStructureHint(type);

    return `
      Tạo dàn ý viết văn tiếng Việt cho học sinh/sinh viên luyện tập.

      **Đề bài:** ${title}
      **Loại bài:** ${type}
      ${topicBlock}
      ${structureHint}

      Trả về CHỈ một JSON hợp lệ (không markdown):
      {
        "title": "<tiêu đề gợi ý cho bài viết>",
        "sections": [
          {
            "id": "intro",
            "label": "<tên phần, VD: Mở bài>",
            "keyPoints": ["<ý chính 1>", "<ý chính 2>"],
            "hint": "<gợi ý ngắn cách viết phần này>"
          }
        ]
      }

      **Yêu cầu:**
      - 3–5 phần (sections) phù hợp loại bài
      - Mỗi phần có 2–4 keyPoints cụ thể, actionable
      - hint ngắn gọn (1 câu)
      - Không viết sẵn đoạn văn hoàn chỉnh — chỉ dàn ý
      - Toàn bộ bằng tiếng Việt
    `;
  }

  private getOutlineStructureHint(type: string): string {
    switch (type) {
      case WritingType.SOCIAL_ESSAY:
        return '**Khung gợi ý:** Mở bài (nêu vấn đề) → Thân bài (2–3 luận điểm + dẫn chứng) → Kết luận (tổng kết + mở rộng).';
      case WritingType.CATHOLIC_ESSAY:
        return '**Khung gợi ý:** Mở bài (đặt vấn đề đức tin) → Thân bài (lý luận + Kinh Thánh/Giáo huấn + chiêm ngẫm cá nhân) → Kết luận.';
      case WritingType.SHORT_STORY:
        return '**Khung gợi ý:** Bối cảnh/nhân vật → Xung đột → Cao trào → Kết (có ý nghĩa).';
      case WritingType.ARTICLE:
        return '**Khung gợi ý:** Lead (tóm tắt tin) → Thân bài (chi tiết theo thứ tự quan trọng) → Kết (bối cảnh/ý nghĩa).';
      default:
        return '**Khung gợi ý:** Mở bài → Thân bài → Kết luận.';
    }
  }

  /**
   * Check if type is supported
   */
  isTypeSupported(type: string): boolean {
    return Object.values(WritingType).includes(type as WritingType);
  }
}
