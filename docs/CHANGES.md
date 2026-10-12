# Changes

## Current release

- Corrected the primitive `not` contract to match Scheme-style truthiness and avoid JavaScript coercion.
- Tightened primitive arity checks to reject invalid argument counts explicitly.
- Preserved the repository’s class/object semantics while restricting class desugaring to a validated subset.
- Added a direct translator module and compatibility wrapper for the public Python translation path.
- Added a Semantics Lab CLI that generates both HTML and JSON comparison reports from real execution.
- Added focused regression coverage for the truthiness contract and unsupported transformation cases.

## Validation

See `docs/VALIDATION.md` for the exact commands and outcomes from the local verification run.
