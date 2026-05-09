import {
    ClassExp, ProcExp, Exp, Program, CExp, Binding,
    isProgram, isDefineExp, isClassExp, isIfExp, isProcExp,
    isLetExp, isAppExp,
    makeProgram, makeDefineExp, makeProcExp, makeVarDecl,
    makeVarRef, makeIfExp, makeAppExp, makePrimOp, makeLitExp,
    makeBinding
} from "./L3-ast";
import { makeSymbolSExp } from "./L3-value";

import { Result, makeOk } from "../shared/result";
import { map } from "ramda";

const msgVar = makeVarDecl("msg");
const msgRef = makeVarRef("msg");
const errorExp = makeLitExp(makeSymbolSExp("error"));


// Get the body of a method.
const getMethodBody = (method: Binding): CExp =>
    isProcExp(method.val) ? method.val.body[0] : method.val;


// Build the test expression for a method name.
const makeMethodTest = (methodName: string): CExp =>
    makeAppExp(makePrimOp("eq?"), [
        msgRef,
        makeLitExp(makeSymbolSExp(methodName))
    ]);


// Build the nested if expressions for the methods.
const makeMethodIfs = (methods: Binding[]): CExp => {
    if (methods.length === 0) {
        return errorExp;
    }

    const firstMethod = methods[0];
    const restMethods = methods.slice(1);

    return makeIfExp(
        makeMethodTest(firstMethod.var.var),
        getMethodBody(firstMethod),
        makeMethodIfs(restMethods)
    );
};


// Transform a class expression into a procedure expression.
export const class2proc = (exp: ClassExp): ProcExp => {
    const innerProc = makeProcExp(
        [msgVar],
        [makeMethodIfs(exp.methods)]
    );

    return makeProcExp(
        exp.fields,
        [innerProc]
    );
};


// Transform a compound expression and remove class expressions.
const transformCExp = (exp: CExp): CExp => {
    if (isClassExp(exp)) {
        return class2proc(exp);
    }

    if (isIfExp(exp)) {
        return makeIfExp(
            transformCExp(exp.test),
            transformCExp(exp.then),
            transformCExp(exp.alt)
        );
    }

    if (isProcExp(exp)) {
        return makeProcExp(
            exp.args,
            map(transformCExp, exp.body)
        );
    }

    if (isLetExp(exp)) {
        const newBindings = map((b: Binding) =>
            makeBinding(b.var.var, transformCExp(b.val)), exp.bindings);

        const newBody = map(transformCExp, exp.body);

        return {
            ...exp,
            bindings: newBindings,
            body: newBody
        };
    }

    if (isAppExp(exp)) {
        return makeAppExp(
            transformCExp(exp.rator),
            map(transformCExp, exp.rands)
        );
    }

    return exp;
};


// Transform one expression.
const transformExp = (exp: Exp): Exp => {
    if (isDefineExp(exp)) {
        return makeDefineExp(exp.var, transformCExp(exp.val));
    }

    return transformCExp(exp);
};


// Transform a full program or one expression.
export const transform = (exp: Exp | Program): Result<Exp | Program> => {
    if (isProgram(exp)) {
        return makeOk(makeProgram(map(transformExp, exp.exps)));
    }

    return makeOk(transformExp(exp));
};