# Supported Language

## Syntax

The repository implements a subset of Scheme-like syntax for the course language:

- `#t` and `#f` for booleans
- numbers and strings
- `(lambda (x y) ...)`
- `(if test then else)`
- `(define name value)`
- `(class (field ...) ((method (lambda (...) ...)) ...))`
- `(obj 'method arg ...)`
- primitive applications such as `(+ 1 2)`

## Semantics

### Environment evaluation

- Lexical scope is preserved by closure capture.
- Primitive operations check arity and type before evaluating.
- `not` follows the Scheme convention: only `#f` is false; everything else is true.

### Class desugaring contract

The supported subset is intentionally strict:

- A class must have a non-empty field list and distinct field names.
- Each method must be a lambda/procedure body with a single expression, zero method parameters, and a unique method name.
- The transformation emits a dispatcher of the form `(lambda (field...) (lambda (msg) ...))` and compares against the message symbol with `eq?`.

Explicitly rejected cases include:

- duplicate field names
- duplicate method names
- unsupported method signatures such as methods that accept an explicit `self` / extra parameters
- multi-expression method bodies
- nested class expressions that require deeper transformation than the supported subset

### Substitution evaluation

- Intended to mirror the environment semantics on the supported subset.
- It rejects constructs not explicitly included, such as `let`.

### Class/object model

- A class is a constructor-like value.
- Applying a class to field arguments produces an object.
- Applying an object to a quoted method symbol invokes the selected method.
- Methods are evaluated in the relevant lexical environment and are compared by observable results.

## Supported matrix

| Path | Supported subset |
| --- | --- |
| Environment evaluation | Core arithmetic, if, lambda, define, let, class/object model |
| Substitution evaluation | Core arithmetic, if, lambda, define, class/object model; let intentionally rejected |
| Class desugaring | Supported subset of methods with a single dispatch body and no unsupported nested transformation |
| Python translation | Arithmetic, booleans, strings, lambda, applications, and simple definitions with explicit failure on unsupported nodes |

## Important limitation

This is not full Scheme or full recursion support. The project documents the supported subset and fails clearly when a case falls outside it.
