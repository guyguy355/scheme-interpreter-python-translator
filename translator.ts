import {
    Exp,
    Program,
    CExp,
    AppExp,
    PrimOp,
    isProgram,
    isDefineExp,
    isNumExp,
    isBoolExp,
    isStrExp,
    isPrimOp,
    isVarRef,
    isIfExp,
    isProcExp,
    isAppExp,
} from './L3/L3-ast';
import { Result, makeOk, makeFailure, bind, mapResult } from './shared/result';

export const l2ToPython = (exp: Exp | Program): Result<string> =>
    isProgram(exp) ? programToPython(exp) : expressionToPython(exp);

const programToPython = (program: Program): Result<string> =>
    bind(mapResult((item: Exp) => expressionToPython(item), program.exps),
        (lines: string[]) => makeOk(lines.join('\n')));

const isPythonIdentifier = (name: string): boolean => /^[_A-Za-z][_A-Za-z0-9]*$/.test(name);

const expressionToPython = (exp: Exp): Result<string> =>
    isDefineExp(exp)
        ? bind(cexpToPython(exp.val), (value: string) => {
            if (!isPythonIdentifier(exp.var.var)) {
                return makeFailure(`Unsupported identifier for Python translation: ${exp.var.var}`);
            }
            return makeOk(`${exp.var.var} = ${value}`);
        })
        : cexpToPython(exp);

const cexpToPython = (exp: CExp): Result<string> => {
    if (isNumExp(exp)) return makeOk(exp.val.toString());
    if (isBoolExp(exp)) return makeOk(exp.val ? 'True' : 'False');
    if (isStrExp(exp)) return makeOk(JSON.stringify(exp.val));
    if (isPrimOp(exp)) return makeOk(exp.op);
    if (isVarRef(exp)) {
        return isPythonIdentifier(exp.var)
            ? makeOk(exp.var)
            : makeFailure(`Unsupported identifier for Python translation: ${exp.var}`);
    }
    if (isIfExp(exp)) return ifToPython(exp);
    if (isProcExp(exp)) return procToPython(exp);
    if (isAppExp(exp)) return appToPython(exp);
    return makeFailure(`Unsupported expression for Python translation: ${String(exp)}`);
};

const ifToPython = (exp: { test: CExp; then: CExp; alt: CExp }): Result<string> =>
    bind(cexpToPython(exp.test), (test: string) =>
        bind(cexpToPython(exp.then), (then: string) =>
            bind(cexpToPython(exp.alt), (alt: string) =>
                makeOk(`(${then} if (${test} is not False) else ${alt})`))))

const procToPython = (exp: { args: { var: string }[]; body: CExp[] }): Result<string> => {
    if (exp.body.length !== 1) return makeFailure(`Unsupported lambda body length: ${exp.body.length}`);
    if (exp.args.some(arg => !isPythonIdentifier(arg.var))) {
        return makeFailure(`Unsupported identifier for Python translation: ${exp.args.find(arg => !isPythonIdentifier(arg.var))?.var}`);
    }
    const args = exp.args.map(arg => arg.var).join(',');
    return bind(cexpToPython(exp.body[0]), (body: string) => makeOk(`(lambda ${args} : ${body})`));
};

const appToPython = (exp: AppExp): Result<string> => {
    if (isPrimOp(exp.rator)) return primAppToPython(exp.rator.op, exp.rands);

    const translatedRator = cexpToPython(exp.rator);
    if (translatedRator.tag === 'Failure') return translatedRator;

    return bind(mapResult(cexpToPython, exp.rands), (rands: string[]) =>
        makeOk(`${translatedRator.value}(${rands.join(',')})`));
};

const primAppToPython = (op: string, rands: CExp[]): Result<string> => {
    const translated = rands.map(cexpToPython);
    const failure = translated.find(item => item.tag === 'Failure');
    if (failure) return failure as Result<string>;

    const args = translated.map(item => (item as any).value as string);
    if (op === 'not') {
        if (args.length !== 1) return makeFailure(`Unsupported arity for Python translation: not`);
        return makeOk(`(${args[0]} is False)`);
    }
    if (op === 'and') {
        if (args.length !== 2) return makeFailure(`Unsupported arity for Python translation: ${op}`);
        return makeOk(`(((${args[0]} is not False) and (${args[1]} is not False)))`);
    }
    if (op === 'or') {
        if (args.length !== 2) return makeFailure(`Unsupported arity for Python translation: ${op}`);
        return makeOk(`(((${args[0]} is not False) or (${args[1]} is not False)))`);
    }
    if (['+', '-', '*', '/'].includes(op)) {
        if (args.length < 2) return makeFailure(`Unsupported zero-arity ${op} in Python translation`);
        return makeOk(`(${args.join(` ${op} `)})`);
    }
    if (['<', '>', '<=', '>='].includes(op)) {
        if (args.length !== 2) return makeFailure(`Unsupported arity for Python translation: ${op}`);
        return makeOk(`(${args.join(` ${op} `)})`);
    }
    if (op === '=' || op === 'eq?') {
        if (args.length !== 2) return makeFailure(`Unsupported arity for Python translation: ${op}`);
        return makeOk(`(${args[0]} == ${args[1]})`);
    }
    if (['number?', 'boolean?', 'symbol?', 'string?', 'cons', 'car', 'cdr', 'list', 'pair?', 'string=?', '>', '<', '<=', '>='].includes(op)) {
        return makeFailure(`Unsupported primitive in Python translation: ${op}`);
    }
    return makeFailure(`Unsupported primitive in Python translation: ${op}`);
};

const isInfixOp = (op: string): boolean => ['+', '-', '*', '/', '<', '>', '<=', '>='].includes(op);