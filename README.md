# Programming Languages Interpreter & Code Translator

This project implements a small language runtime for a Scheme-like core language. It parses source into an AST, evaluates programs in both an environment-based and a substitution-based model, desugars a validated subset of class expressions into procedures, and emits Python for a supported subset of expressions.

## Implemented features

- Class support for a limited validated subset of class expressions.
- Environment-based evaluation with lexical scoping and object-style dispatch.
- Substitution-based evaluation for comparison with the environment model.
- AST transformations for class-to-procedure desugaring.
- Python translation for a supported L2 expression subset.

## Requirements

- Node.js and npm
- TypeScript toolchain via the project dependencies
- Python 3 for executing translated Python when needed

## Installation

```powershell
cd "c:/Users/guygu/OneDrive/Desktop/ppl/ppl assignmant2"
npm install
```

## Run the test suite

```powershell
cd "c:/Users/guygu/OneDrive/Desktop/ppl/ppl assignmant2"
npm test
```

## Type-check and build

```powershell
cd "c:/Users/guygu/OneDrive/Desktop/ppl/ppl assignmant2"
npm run typecheck
npm run build
```

## Run the demo script

```powershell
cd "c:/Users/guygu/OneDrive/Desktop/ppl/ppl assignmant2"
npm run demo:semantics-lab
```

## Example: class expression

```scheme
(L3
  (define WorkoutSession
    (class (name sets reps)
      ((getName (lambda () name))
       (total (lambda () (* sets reps)))
       (label (lambda () name)))))
  (define warmup (WorkoutSession "press" 3 12))
  (define coolDown (WorkoutSession "row" 2 8))
  (+ (warmup 'total) (coolDown 'total)))
```

This defines a simple class with fields and methods and evaluates a program using the class object model.

## Example: translation

Source expression:

```scheme
(lambda (x y) (* x y))
```

Generated Python output from the translator:

```python
(lambda x,y : (x * y))
```

Executed Python output is separate from generated source. When the translator result is run under Python, the runtime prints the value of the final expression; for example, a call equivalent to `((lambda x,y : (x * y)) 3 4)` evaluates to `12`.

## Main modules

- `L3/L3-ast.ts`: AST definitions, parser, and unparser.
- `L3/L3-eval-env.ts`: environment-based evaluator using lexical scoping.
- `L3/L3-eval-sub.ts`: substitution-based evaluator for comparison and semantics checks.
- `L3/SyntacticTransformation.ts`: class desugaring into procedure-based form.
- `translator.ts` and `q3.ts`: Python-generation entry points for supported L2 expressions.
- `shared/`: helper modules for parsing, results, lists, optionals, and type predicates.

## Known limitations

- The implementation is not a full Scheme implementation.
- The substitution evaluator supports a narrower subset and intentionally rejects some forms.
- Class transformation supports a validated subset only: unique field names, unique method names, zero-argument method procedures, and exactly one expression in each method body.
- Translation supports a limited subset of expression forms: numbers, booleans, strings, variables, conditionals, lambdas, applications, and primitive operators.
- Unsupported forms fail explicitly with a result error rather than generating a misleading translation.

