import { ERROR_CODE, ERROR_MESSAGES } from 'src/constants';
import { WritingTypeEnum } from '../enum';

/** Thể loại đang mở cho người dùng tạo bài mới */
export const ACTIVE_WRITING_TYPES = [
  WritingTypeEnum.SOCIAL_ESSAY,
  WritingTypeEnum.CATHOLIC_ESSAY,
] as const;

export type ActiveWritingType = (typeof ACTIVE_WRITING_TYPES)[number];

export const ACTIVE_WRITING_TYPE_VALUES: ActiveWritingType[] = [
  ...ACTIVE_WRITING_TYPES,
];

export const ACTIVE_WRITING_TYPE_MESSAGE =
  ERROR_MESSAGES[ERROR_CODE.WRITING_TYPE_NOT_SUPPORTED];

export function isActiveWritingType(type: string): type is ActiveWritingType {
  return ACTIVE_WRITING_TYPE_VALUES.includes(type as ActiveWritingType);
}
