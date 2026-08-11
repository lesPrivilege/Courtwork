import type { VerticalPackageBindings } from '@courtwork/registry';
import type { ZodType } from 'zod';
import { BatchReportSchema } from '../schemas/batch-report.js';
import { DraftDocumentSchema } from '../schemas/draft-document.js';

export const GENERIC_PACKAGE_BINDINGS: VerticalPackageBindings = {
  schemas: new Map<string, ZodType>([
    ['generic.DraftDocument', DraftDocumentSchema],
    ['generic.BatchReport', BatchReportSchema],
  ]),
};
