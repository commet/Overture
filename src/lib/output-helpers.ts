import type { Project } from '@/stores/types';

/**
 * Check if generated output text has meaningful content.
 */
export function hasContent(text: string): boolean {
  // Strip markdown headers, whitespace, and common empty patterns
  const stripped = text
    .replace(/^#+\s*.*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/[-|]/g, '')
    .trim();
  return stripped.length > 20;
}

/**
 * Create a filter function that matches items belonging to a project.
 * If project is null, returns a pass-all filter.
 */
export function projectFilter(project: Project | null): (item: { project_id?: string }) => boolean {
  if (!project) return () => true;
  return (item) => item.project_id === project.id;
}
