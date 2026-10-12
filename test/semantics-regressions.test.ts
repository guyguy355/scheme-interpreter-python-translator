import { expect } from 'chai';
import { parseL3, parseL3Exp, isClassExp, unparseL3 } from '../L3/L3-ast';
import { evalL3program as evalEnv } from '../L3/L3-eval-env';
import { class2proc, transform } from '../L3/SyntacticTransformation';
import { l2ToPython } from '../translator';
import { bind, makeFailure, makeOk } from '../shared/result';
import { parse as p } from '../shared/parser';
import { makeSymbolSExp } from '../L3/L3-value';

describe('Semantics regressions', () => {
  it('uses Scheme-style truthiness for not', () => {
    const result = bind(parseL3('(L3 (not #f) (not 0) (not 3) (not "x"))'), evalEnv);
    expect(result).to.deep.equal(makeOk(false));
  });

  it('rejects unsupported method signatures in class desugaring', () => {
    const parsed = bind(p('(class (left right) ((get (lambda () left)) (sum (lambda (self x) (+ left x)))))'), (sexp) =>
      bind(parseL3Exp(sexp), (exp) => isClassExp(exp) ? class2proc(exp) : makeFailure('Not a class expression')));
    expect(parsed.tag).to.equal('Failure');
  });

  it('rejects unsupported multi-expression lambda bodies in translation', () => {
    const program = parseL3('(L3 ((lambda (x) (+ x 1) (* x 2)) 3))');
    expect(program.tag).to.equal('Ok');
    const result = bind(program, l2ToPython);
    expect(result.tag).to.equal('Failure');
  });

  it('checks closure arity consistently', () => {
    const result = bind(parseL3('(L3 ((lambda (x) x) 1 2))'), evalEnv);
    expect(result.tag).to.equal('Failure');
  });

  it('keeps class dispatch fresh when a field is named msg', () => {
    const source = `(L3 (define C (class (msg) ((get (lambda () msg))))) (define c (C 12)) (c 'get))`;
    const parsed = parseL3(source);
    expect(parsed.tag).to.equal('Ok');
    if (parsed.tag !== 'Ok') return;

    const original = evalEnv(parsed.value);
    const transformed = transform(parsed.value);

    expect(original).to.deep.equal(makeOk(12));
    expect(transformed.tag).to.equal('Ok');
    if (transformed.tag !== 'Ok') return;
    if (!('exps' in transformed.value)) {
      expect(transformed.value).to.equal(undefined);
      return;
    }
    expect(evalEnv(transformed.value)).to.deep.equal(makeOk(12));
  });
});
