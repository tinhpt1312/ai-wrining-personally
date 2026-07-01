import { PartialType } from '@nestjs/swagger';
import { CreateBookDTO } from './create-book.dto';

export class UpdateBookDTO extends PartialType(CreateBookDTO) {}
