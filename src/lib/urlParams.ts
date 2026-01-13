import { z } from 'zod';

// 許可されるタブとアクションの契約
export const TabSchema = z.enum(['fuel', 'maintenance', 'custom', 'insurance']).optional();
export const ActionSchema = z.enum(['add', 'add-fuel', 'add-maintenance', 'add-customization', 'add-insurance']).optional();
export const DraftSchema = z.string().min(1).optional();
export const TemplateSchema = z.string().min(1).optional();

export const QuerySchema = z.object({
  tab: TabSchema,
  action: ActionSchema,
  draft: DraftSchema,
  template: TemplateSchema,
});

export type ParsedQuery = z.infer<typeof QuerySchema>;

export function parseQuery(params: URLSearchParams): ParsedQuery {
  // 'customs' を 'custom' にマッピング（後方互換性のため）
  const tabParam = params.get('tab');
  const normalizedTab = tabParam === 'customs' ? 'custom' : tabParam;
  
  return QuerySchema.parse({
    tab: normalizedTab || undefined,
    action: params.get('action') || undefined,
    draft: params.get('draft') || undefined,
    template: params.get('template') || undefined,
  });
}


