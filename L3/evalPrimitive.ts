import { reduce } from "ramda";
import { PrimOp } from "./L3-ast";
import { isCompoundSExp, isEmptySExp, isSymbolSExp, makeCompoundSExp, makeEmptySExp, CompoundSExp, EmptySExp, Value } from "./L3-value";
import { List, allT, first, isNonEmptyList, rest } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure, bind } from "../shared/result";
import { format } from "../shared/format";

const expectArity = (op: string, args: Value[], expected: number): Result<void> =>
    args.length === expected ? makeOk(undefined) :
    makeFailure(`${op} expects ${expected} arguments, received ${args.length}`);

const isSchemeTrue = (x: Value): boolean => x !== false;

export const applyPrimitive = (proc: PrimOp, args: Value[]): Result<Value> =>
    proc.op === "+" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x + y, 0, args)) : 
                                              makeFailure(`+ expects numbers only: ${format(args)}`)) :
    proc.op === "-" ? bind(expectArity("-", args, 2), () => minusPrim(args)) :
    proc.op === "*" ? (allT(isNumber, args) ? makeOk(reduce((x, y) => x * y, 1, args)) : 
                                              makeFailure(`* expects numbers only: ${format(args)}`)) :
    proc.op === "/" ? bind(expectArity("/", args, 2), () => divPrim(args)) :
    proc.op === ">" ? bind(expectArity(">", args, 2), () => makeOk(args[0] > args[1])) :
    proc.op === "<" ? bind(expectArity("<", args, 2), () => makeOk(args[0] < args[1])) :
    proc.op === "=" ? bind(expectArity("=", args, 2), () => makeOk(args[0] === args[1])) :
    proc.op === "not" ? bind(expectArity("not", args, 1), () => makeOk(args[0] === false)) :
    proc.op === "and" ? bind(expectArity("and", args, 2), () =>
        isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] && args[1]) :
        makeFailure(`Arguments to "and" not booleans: ${format(args)}`)) :
    proc.op === "or" ? bind(expectArity("or", args, 2), () =>
        isBoolean(args[0]) && isBoolean(args[1]) ? makeOk(args[0] || args[1]) :
        makeFailure(`Arguments to "or" not booleans: ${format(args)}`)) :
    proc.op === "eq?" ? bind(expectArity("eq?", args, 2), () => makeOk(eqPrim(args))) :
    proc.op === "string=?" ? bind(expectArity("string=?", args, 2), () => makeOk(args[0] === args[1])) :
    proc.op === "cons" ? bind(expectArity("cons", args, 2), () => makeOk(consPrim(args[0], args[1]))) :
    proc.op === "car" ? bind(expectArity("car", args, 1), () => carPrim(args[0])) :
    proc.op === "cdr" ? bind(expectArity("cdr", args, 1), () => cdrPrim(args[0])) :
    proc.op === "list" ? makeOk(listPrim(args)) :
    proc.op === "pair?" ? bind(expectArity("pair?", args, 1), () => makeOk(isPairPrim(args[0]))) :
    proc.op === "number?" ? bind(expectArity("number?", args, 1), () => makeOk(typeof (args[0]) === 'number')) :
    proc.op === "boolean?" ? bind(expectArity("boolean?", args, 1), () => makeOk(typeof (args[0]) === 'boolean')) :
    proc.op === "symbol?" ? bind(expectArity("symbol?", args, 1), () => makeOk(isSymbolSExp(args[0]))) :
    proc.op === "string?" ? bind(expectArity("string?", args, 1), () => makeOk(isString(args[0]))) :
    makeFailure(`Bad primitive op: ${format(proc.op)}`);

const minusPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x - y);
    }
    else {
        return makeFailure(`Type error: - expects numbers ${format(args)}`);
    }
};

const divPrim = (args: Value[]): Result<number> => {
    // TODO complete
    const x = args[0], y = args[1];
    if (isNumber(x) && isNumber(y)) {
        return makeOk(x / y);
    }
    else {
        return makeFailure(`Type error: / expects numbers ${format(args)}`);
    }
};

const eqPrim = (args: Value[]): boolean => {
    const x = args[0], y = args[1];
    if (isSymbolSExp(x) && isSymbolSExp(y)) {
        return x.val === y.val;
    }
    else if (isEmptySExp(x) && isEmptySExp(y)) {
        return true;
    }
    else if (isNumber(x) && isNumber(y)) {
        return x === y;
    }
    else if (isString(x) && isString(y)) {
        return x === y;
    }
    else if (isBoolean(x) && isBoolean(y)) {
        return x === y;
    }
    else {
        return false;
    }
};

const carPrim = (v: Value): Result<Value> => 
    isCompoundSExp(v) ? makeOk(v.val1) :
    makeFailure(`Car: param is not compound ${format(v)}`);

const cdrPrim = (v: Value): Result<Value> =>
    isCompoundSExp(v) ? makeOk(v.val2) :
    makeFailure(`Cdr: param is not compound ${format(v)}`);

const consPrim = (v1: Value, v2: Value): CompoundSExp =>
    makeCompoundSExp(v1, v2);

export const listPrim = (vals: List<Value>): EmptySExp | CompoundSExp =>
    isNonEmptyList<Value>(vals) ? makeCompoundSExp(first(vals), listPrim(rest(vals))) :
    makeEmptySExp();

const isPairPrim = (v: Value): boolean =>
    isCompoundSExp(v);
