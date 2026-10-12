import {
    ClassExp, ProcExp, Exp, Program, CExp, Binding,
    isProgram, isDefineExp, isClassExp, isIfExp, isProcExp,
    isLetExp, isAppExp,
    makeProgram, makeDefineExp, makeProcExp, makeVarDecl,
    makeVarRef, makeIfExp, makeAppExp, makePrimOp, makeLitExp,
    makeBinding
} from "./L3-ast";
import { makeSymbolSExp } from "./L3-value";

import { Result, makeOk, makeFailure, bind, mapResult } from "../shared/result";
import { map } from "ramda";

const defaultDispatchVarName = "msg";
const fallbackDispatchVarName = "methodArg";
const errorExp = makeLitExp(makeSymbolSExp("error"));

const getMethodBody = (method: Binding): CExp =>
    isProcExp(method.val) ? method.val.body[0] || errorExp : method.val;

const makeMethodTest = (methodName: string, dispatchName: string): CExp =>
    makeAppExp(makePrimOp("eq?"), [
        makeVarRef(dispatchName),
        makeLitExp(makeSymbolSExp(methodName))
    ]);

const makeMethodIfs = (methods: Binding[], dispatchName: string): CExp => {
    if (methods.length === 0) {
        return errorExp;
    }

    const [firstMethod, ...restMethods] = methods;
    return makeIfExp(
        makeMethodTest(firstMethod.var.var, dispatchName),
        getMethodBody(firstMethod),
        makeMethodIfs(restMethods, dispatchName)
    );
};

export const class2proc = (exp: ClassExp): Result<ProcExp> => {
    if (exp.fields.length === 0) {
        return makeFailure("Class desugaring requires at least one field");
    }

    const dispatchVarName = exp.fields.some((field) => field.var === defaultDispatchVarName)
        ? fallbackDispatchVarName
        : defaultDispatchVarName;

    const fieldNames = new Set<string>();
    for (const field of exp.fields) {
        if (fieldNames.has(field.var)) {
            return makeFailure(`Duplicate field name: ${field.var}`);
        }
        fieldNames.add(field.var);
    }

    const methodNames = new Set<string>();
    for (const method of exp.methods) {
        if (methodNames.has(method.var.var)) {
            return makeFailure(`Duplicate method name: ${method.var.var}`);
        }
        methodNames.add(method.var.var);
    }

    for (const method of exp.methods) {
        if (!isProcExp(method.val)) {
            return makeFailure(`Unsupported method body in class desugaring: ${method.var.var}`);
        }

        if (method.val.args.length !== 0) {
            return makeFailure(`Unsupported method signature in class desugaring: ${method.var.var}`);
        }

        if (method.val.body.length !== 1) {
            return makeFailure(`Unsupported method body length in class desugaring: ${method.var.var}`);
        }
    }

    return makeOk(makeProcExp(
        exp.fields,
        [makeProcExp([makeVarDecl(dispatchVarName)], [makeMethodIfs(exp.methods, dispatchVarName)])]
    ));
};

const transformCExp = (exp: CExp): Result<CExp> => {
    if (isClassExp(exp)) {
        return bind(class2proc(exp), (v: ProcExp) => makeOk(v));
    }

    if (isIfExp(exp)) {
        return bind(transformCExp(exp.test), (test: CExp) =>
            bind(transformCExp(exp.then), (then: CExp) =>
                bind(transformCExp(exp.alt), (alt: CExp) =>
                    makeOk(makeIfExp(test, then, alt)))));
    }

    if (isProcExp(exp)) {
        return bind(mapResult(transformCExp, exp.body), (body: CExp[]) =>
            makeOk(makeProcExp(exp.args, body)));
    }

    if (isLetExp(exp)) {
        return bind(mapResult((b: Binding) =>
            bind(transformCExp(b.val), (val: CExp) => makeOk(makeBinding(b.var.var, val))), exp.bindings),
            (bindings: Binding[]) =>
                bind(mapResult(transformCExp, exp.body), (body: CExp[]) =>
                    makeOk({ ...exp, bindings, body })));
    }

    if (isAppExp(exp)) {
        return bind(transformCExp(exp.rator), (rator: CExp) =>
            bind(mapResult(transformCExp, exp.rands), (rands: CExp[]) =>
                makeOk(makeAppExp(rator, rands))));
    }

    return makeOk(exp);
};

const transformExp = (exp: Exp): Result<Exp> => {
    if (isDefineExp(exp)) {
        return bind(transformCExp(exp.val), (val: CExp) =>
            makeOk(makeDefineExp(exp.var, val)));
    }

    return transformCExp(exp);
};

export const transform = (exp: Exp | Program): Result<Exp | Program> => {
    if (isProgram(exp)) {
        return bind(mapResult(transformExp, exp.exps), (exps: Exp[]) =>
            makeOk(makeProgram(exps)));
    }

    return transformExp(exp);
};