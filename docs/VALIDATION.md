# Validation

## Environment

- OS: Windows
- Node.js: verified in the workspace (`v24.14.0`)
- Python: present as a Windows App stub, but not a working runtime in this container; the project therefore guards execution-based Python checks and marks the report status as unavailable when no valid interpreter is available

## Commands run

```powershell
cd "c:/Users/guygu/OneDrive/Desktop/ppl/ppl assignmant2"
npm test -- --reporter dot
npx tsc --noEmit
npm run build
node -r ts-node/register ./semantics-lab.ts
```

## Outcomes

- `npm test -- --reporter dot` passed: 29 passing (22ms)
- `npx tsc --noEmit` passed with no TypeScript errors
- `npm run build` passed
- `node -r ts-node/register ./semantics-lab.ts` successfully generated the HTML and JSON reports in `reports/`

## Remaining limitations

- Translation remains restricted to the documented supported subset.
- The substitution evaluator is intentionally narrower than the environment evaluator.
- Python execution-based equivalence checks are guarded by runtime availability; if Python is missing or non-functional, the report is intentionally labeled as unavailable rather than reported as a match.
