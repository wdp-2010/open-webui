# Tool Call Grouping System

This document explains how grouped tool-call labels (for example "Reviewed Chats" and "Managed memory") are matched, ordered, and rendered.

## Where Group Ordering Lives

The group matching and ordering are defined in:

- `src/lib/utils/toolCallPresentation.ts`
- Constant: `TOOL_COMBINATION_RULES`

Rules are evaluated in ascending `order`.

- Smaller `order` = higher priority (matched first)
- First matching rule wins

## Match System (Easy To Edit)

Each rule supports these match clauses:

- `allOf`: every tool name listed must be present
- `anyOf`: at least one tool name listed must be present
- `noneOf`: none of the listed tool names may be present
- `onlyOf`: all tools in the group must be in this allow-list (no extra tools)

Rule shape:

```ts
{
  id: 'unique.rule.id',
  order: 100,
  iconKey: 'chat',
  pendingPrefix: 'Reviewing Chats',
  donePrefix: 'Reviewed Chats',
  match: {
    allOf: ['search_chats'],
    anyOf: ['view_chat'],
    noneOf: ['delete_memory'],
    onlyOf: ['search_chats', 'view_chat']
  },
  showDetailList: false
}
```

`onlyOf` is optional. Use it when a rule should only match a bounded set of tools.

## Named Group Behavior

When a rule matches, the grouped summary uses the rule prefix and icon.

By default, named groups hide the trailing raw tool list (for example "search_chats, view_chat").

- Default is `showDetailList: false`
- Set `showDetailList: true` only when you explicitly want to append the raw tool names

## Add A New Group

1. Open `src/lib/utils/toolCallPresentation.ts`.
2. Add a rule to `TOOL_COMBINATION_RULES`.
3. Choose an `order` that places it before/after related rules.
4. Ensure `id` is unique.
5. Set prefixes and icon.
6. Set `showDetailList` only if needed.

## Practical Ordering Strategy

Use these ranges to keep rules organized:

- `100-299`: web and knowledge research
- `300-499`: chats and notes review
- `500-699`: channels and media
- `700-999`: broad fallback groups (memory/notes/code)

Put narrow/specific rules before broad/fallback rules.

## Examples

### 1) Web search + code execution (but not note viewing)

```ts
{
  id: 'web.search_and_execute_code',
  order: 150,
  iconKey: 'terminal',
  pendingPrefix: 'Researching and Executing',
  donePrefix: 'Researched and Executed',
  match: {
    allOf: ['search_web', 'execute_code'],
    noneOf: ['view_note'],
    onlyOf: ['search_web', 'fetch_url', 'execute_code']
  }
}
```

### 2) New "Reviewed Tasks" group

```ts
{
  id: 'tasks.review',
  order: 350,
  iconKey: 'note',
  pendingPrefix: 'Reviewing Tasks',
  donePrefix: 'Reviewed Tasks',
  match: {
    allOf: ['search_tasks'],
    anyOf: ['view_task']
  }
}
```

### 3) Broad fallback for any task activity

```ts
{
  id: 'tasks.manage',
  order: 950,
  iconKey: 'note',
  pendingPrefix: 'Managing tasks',
  donePrefix: 'Managed tasks',
  match: {
    anyOf: ['search_tasks', 'view_task', 'create_task', 'update_task', 'delete_task']
  }
}
```

## Rendering Location

The grouped summary UI reads these values in:

- `src/lib/components/chat/Messages/Markdown/ConsecutiveDetailsGroup.svelte`

It now suppresses the trailing list whenever a named group is active unless `showDetailList` is set to `true` in the matched rule.
