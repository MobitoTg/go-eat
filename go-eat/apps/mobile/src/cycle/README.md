# `src/cycle/` — the refresh mechanic, and how to remove it

The batch-and-cycle refresh mechanic (User Story 3) is explicitly a provisional product bet
(spec.md, Assumptions: "Refresh mechanic is provisional"). It is isolated behind a configuration
switch (`refreshEnabled`, FR-019) specifically so it can be stripped to a zero-refresh,
single-suggestion widget without reworking selection, presentation, or tap-through.

## What refresh actually is

The entire mechanic is one pure function:

```ts
// cursor.ts
export function advance(batch: SuggestionBatch): SuggestionBatch {
  if (batch.items.length === 0) return batch;
  return { ...batch, cursor: (batch.cursor + 1) % batch.items.length };
}
```

Everything else in this directory — `refresh.ts`'s valid/invalid dispatch, the platform refresh
handlers (`../widget/ios-refresh.ts`, `../../widgets/android/widget-task-handler.ts`) — exists to
call `advance` at the right time and persist the result. None of it touches scoring, shaping, or
the widget's rendering of a `suggestion`/`stale` state.

## The removal path

To ship the zero-refresh variant (a single suggestion, no refresh control, everything else
unchanged):

1. **Backend**: set `refreshEnabled: false` in operator config (`services/suggestion-api/src/config/index.ts`).
   `POST /v1/cycle` already truncates `items` to 1 when this is false (FR-019, `routes/cycle.ts`).
2. **Delete** `cursor.ts` and `refresh.ts`.
3. **Delete** the refresh-only files: `../widget/ios-refresh.ts` and
   `../../widgets/android/widget-task-handler.ts`'s `WIDGET_CLICK` case (keep the render cases).
4. **Widget views**: nothing to change — both `widgets/ios/GoEatWidget.tsx` and
   `widgets/android/GoEatWidget.tsx` already gate the refresh control on `content.showRefresh`
   (`../widget/content.ts`), which is `false` whenever `refreshEnabled` is `false`. The button
   simply stops rendering.
5. **`SuggestionBatch`** (`@go-eat/contract-types`) and `shared-storage.ts`'s batch read/write
   functions can stay — they cost nothing unused — or be deleted along with `cursor`/`refresh` if a
   full cleanup is wanted. `WidgetPayload` (what the widget actually renders) never referenced the
   batch shape at all, so nothing downstream of it changes either way.

Steps 2–4 are the entire code deletion. Nothing in `packages/selection-core`,
`services/suggestion-api/src/shaping/`, or the widget views' non-refresh rendering paths is touched
— which is the constitutional guarantee this isolation exists to keep (`Product & Platform
Constraints`: "Provisional mechanics stay removable").
