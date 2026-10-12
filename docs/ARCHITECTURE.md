# Architecture

## Parser and AST

The project represents programs as a discriminated union of expression tags in `L3/L3-ast.ts`. The top-level parser accepts a Scheme-like source form and converts it into typed expressions such as `DefineExp`, `ProcExp`, `IfExp`, `ClassExp`, and `AppExp`.

The AST keeps the original course structure: simple constructors, type predicates, and `Result`-based parsing failures. The syntax is intentionally direct and easy to inspect in interviews.

## Environment evaluation

`L3/L3-eval-env.ts` implements the evaluation model using an environment chain. Procedure application creates closures that capture their lexical environment, while classes construct object values from field bindings and method definitions.

This runtime is the closest match to the standard environment model used in course notes and is the main path for demonstrating lexical scope and captured bindings.

## Substitution evaluation

`L3/L3-eval-sub.ts` uses a substitution-based approach with renaming and capture-avoiding variable replacement. The substitution evaluator is deliberately more restricted than the environment evaluator and is useful for comparing the intended semantics on a narrower, documented subset.

## Class desugaring

`L3/SyntacticTransformation.ts` converts class expressions into procedure-based dispatch form. The transformation preserves the repository’s contract: it supports the validated subset and rejects unsupported method signatures instead of silently dropping or changing arguments.

## Python translation

`translator.ts` walks the parsed AST and emits Python for supported forms. It intentionally makes unsupported cases fail with explicit `Result` errors instead of producing misleading Python output.

## Result-based error handling

The project’s core error model is the `Result` type in `shared/result.ts`. The evaluators, parser, and translation step all report failures explicitly. This keeps interpreter and translation comparisons readable and deterministic.

## Semantics Lab

The CLI tool `semantics-lab.ts` executes the real project code for a small set of examples, writes a readable HTML report under `reports/`, and emits structured JSON for comparison. It compares actual execution results rather than display strings or labels.
