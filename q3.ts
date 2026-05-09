import {
    Exp, Program, CExp, AppExp, PrimOp,
    isProgram, isDefineExp, isNumExp, isBoolExp, isStrExp,
    isPrimOp, isVarRef, isIfExp, isProcExp, isAppExp
} from './L3/L3-ast';

import { Result, makeOk } from './shared/result';


// Convert an L2 AST to Python code.
export const l2ToPython = (exp: Exp | Program): Result<string> =>
    makeOk(isProgram(exp) ? programToPython(exp) : expToPython(exp));


// Convert a full program to Python code.
const programToPython = (program: Program): string =>
    program.exps.map(expToPython).join("\n");


// Convert one expression to Python code.
const expToPython = (exp: Exp): string =>
    isDefineExp(exp) ? `${exp.var.var} = ${cexpToPython(exp.val)}` :
    cexpToPython(exp);


// Convert one CExp to Python code.
const cexpToPython = (exp: CExp): string =>
    isNumExp(exp) ? exp.val.toString() :
    isBoolExp(exp) ? boolToPython(exp.val) :
    isStrExp(exp) ? `"${exp.val}"` :
    isPrimOp(exp) ? primToPython(exp) :
    isVarRef(exp) ? exp.var :
    isIfExp(exp) ? ifToPython(exp) :
    isProcExp(exp) ? procToPython(exp) :
    isAppExp(exp) ? appToPython(exp) :
    "";


// Convert a boolean to Python.
const boolToPython = (val: boolean): string =>
    val ? "True" : "False";


// Convert a primitive operator used as a value.
const primToPython = (exp: PrimOp): string =>
    exp.op === "number?" ? "(lambda x : (type(x) == int or type(x) == float))" :
    exp.op === "boolean?" ? "(lambda x : (type(x) == bool))" :
    exp.op === "not" ? "(lambda x : (not x))" :
    exp.op === "and" ? "(lambda x,y : (x and y))" :
    exp.op === "or" ? "(lambda x,y : (x or y))" :
    exp.op === "=" ? "(lambda x,y : (x == y))" :
    exp.op === "eq?" ? "(lambda x,y : (x == y))" :
    exp.op;


// Convert an if expression to Python.
const ifToPython = (exp: { test: CExp; then: CExp; alt: CExp }): string =>
    `(${cexpToPython(exp.then)} if ${cexpToPython(exp.test)} else ${cexpToPython(exp.alt)})`;


// Convert a lambda expression to Python.
const procToPython = (exp: { args: { var: string }[]; body: CExp[] }): string => {
    const args = exp.args.map(arg => arg.var).join(",");
    const body = cexpToPython(exp.body[0]);

    return `(lambda ${args} : ${body})`;
};


// Convert an application expression to Python.
const appToPython = (exp: AppExp): string => {
    if (isPrimOp(exp.rator)) {
        return primAppToPython(exp.rator.op, exp.rands);
    }

    const rator = cexpToPython(exp.rator);
    const rands = exp.rands.map(cexpToPython).join(",");

    return `${rator}(${rands})`;
};


// Convert a primitive application to Python.
const primAppToPython = (op: string, rands: CExp[]): string => {
    const args = rands.map(cexpToPython);

    if (op === "not") {
        return `(not ${args[0]})`;
    }

    if (op === "number?") {
        return `(type(${args[0]}) == int or type(${args[0]}) == float)`;
    }

    if (op === "boolean?") {
        return `(type(${args[0]}) == bool)`;
    }

    if (op === "=" || op === "eq?") {
        return `(${args[0]} == ${args[1]})`;
    }

    if (op === "and") {
        return `(${args.join(" and ")})`;
    }

    if (op === "or") {
        return `(${args.join(" or ")})`;
    }

    if (isInfixOp(op)) {
        return `(${args.join(` ${op} `)})`;
    }

    return `${op}(${args.join(",")})`;
};


// Check if the operator is written between arguments.
const isInfixOp = (op: string): boolean =>
    ["+", "-", "*", "/", "<", ">"].indexOf(op) >= 0;