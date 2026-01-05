/**
 * Card description templates for common use cases
 */

export type TemplateType = 'bug' | 'feature' | 'task';

/**
 * Templates for different card types
 */
export const templates: Record<TemplateType, string> = {
  bug: `## Bug Description

[Describe the bug]

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- Browser:
- OS:
`,

  feature: `## Feature Request

[Describe the feature]

## Use Case

[Why is this needed]

## Proposed Solution

[How it could work]

## Alternatives Considered

[Other approaches]
`,

  task: `## Task Description

[What needs to be done]

## Acceptance Criteria

- [ ]
- [ ]
- [ ]

## Notes

[Additional context]
`,
};

/**
 * Get a template by type
 * @param type - The template type (bug, feature, or task)
 * @returns The template content
 */
export function getTemplate(type: TemplateType): string {
  return templates[type];
}

/**
 * Check if a string is a valid template type
 * @param value - The value to check
 * @returns True if the value is a valid template type
 */
export function isValidTemplateType(value: string): value is TemplateType {
  return ['bug', 'feature', 'task'].includes(value);
}
