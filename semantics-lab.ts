import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseL3 } from './L3/L3-ast';
import { evalL3program as evalEnv } from './L3/L3-eval-env';
import { l2ToPython } from './q3';
import { isFailure } from './shared/result';

type PythonCommand = { command: string; args: string[] };

const resolvePythonCommand = (): PythonCommand | undefined => {
  const candidates: PythonCommand[] = [
    { command: 'py', args: ['-3'] },
    { command: 'python3', args: [] },
    { command: 'python', args: [] }
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.args, '--version'], { stdio: 'ignore' });
    if (result.status === 0) {
      return candidate;
    }
  }
  return undefined;
};

const preparePythonScript = (translated: string): string => {
  const lines = translated.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return translated;
  }

  const last = lines[lines.length - 1].trim();
  if (!last.startsWith('(') && !/^[_A-Za-z]/.test(last)) {
    return translated;
  }

  return [...lines.slice(0, -1), `_result = ${last}`, 'print(_result)'].join('\n');
};

const runPythonScript = (translated: string): { status: string; output: string; error: string; exitCode: number | null } => {
  const python = resolvePythonCommand();
  if (!python) {
    return { status: 'Not executed', output: '', error: 'Python runtime unavailable', exitCode: null };
  }

  const script = preparePythonScript(translated);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppl-demo-'));
  const scriptPath = path.join(tmpDir, 'generated.py');
  fs.writeFileSync(scriptPath, script, 'utf8');

  try {
    const result = spawnSync(python.command, [...python.args, scriptPath], { cwd: tmpDir, encoding: 'utf8' });
    return {
      status: result.status === 0 ? 'Executed' : 'Failed',
      output: (result.stdout || '').trim(),
      error: (result.stderr || '').trim(),
      exitCode: result.status
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
};

const workoutSource = `(L3
  (define WorkoutSession
    (class (name sets reps)
      ((getName (lambda () name))
       (total (lambda () (* sets reps)))
       (label (lambda () name)))))
  (define warmup (WorkoutSession "press" 3 12))
  (define coolDown (WorkoutSession "row" 2 8))
  (+ (warmup 'total) (coolDown 'total)))`;

const pythonSource = `(lambda (x y) (* x y))`;

const workoutParsed = parseL3(workoutSource);
const workoutResult = workoutParsed.tag === 'Ok' ? evalEnv(workoutParsed.value) : workoutParsed;
const workoutPython = workoutParsed.tag === 'Ok' ? l2ToPython(workoutParsed.value) : { tag: 'Failure', message: workoutParsed.message };
const pythonGenerated = (() => {
  const parsed = parseL3(`(L3 ${pythonSource})`);
  if (parsed.tag !== 'Ok') return { tag: 'Failure', message: parsed.message };
  return l2ToPython(parsed.value);
})();

const pythonGeneratedAny: any = pythonGenerated;
const workoutPythonAny: any = workoutPython;

let generatedPython = 'Python not generated';
if (pythonGeneratedAny.tag === 'Ok') {
  generatedPython = pythonGeneratedAny.value;
} else {
  generatedPython = pythonGeneratedAny.message;
}

let workoutExecution: { status: string; output: string; error: string; exitCode: number | null } = {
  status: 'Not executed',
  output: '',
  error: 'Python runtime unavailable',
  exitCode: null
};
if (workoutPythonAny.tag === 'Ok') {
  workoutExecution = runPythonScript(workoutPythonAny.value);
} else {
  workoutExecution = { status: 'Not executed', output: '', error: workoutPythonAny.message, exitCode: null };
}

const report = {
  title: 'WorkoutSession demo',
  workoutSource,
  workoutValue: isFailure(workoutResult) ? workoutResult.message : String(workoutResult.value),
  generatedPython,
  pythonExecution: workoutExecution,
  translationSource: pythonSource,
  translationOutput: generatedPython
};

const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'semantics-lab.json'), JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(path.join(reportDir, 'semantics-lab.html'), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>WorkoutSession demo</title></head>
  <body>
    <h1>WorkoutSession demo</h1>
    <h2>Interpreter result</h2>
    <pre>${report.workoutValue}</pre>
    <h2>Class source</h2>
    <pre>${report.workoutSource}</pre>
    <h2>L2-to-Python example</h2>
    <pre>${report.translationSource}</pre>
    <h2>Generated Python</h2>
    <pre>${report.translationOutput}</pre>
    <h2>Python execution</h2>
    <pre>${report.pythonExecution.status === 'Not executed' ? 'Not executed: Python runtime unavailable' : report.pythonExecution.output || report.pythonExecution.error}</pre>
  </body>
</html>`, 'utf8');

console.log(`WorkoutSession result: ${report.workoutValue}`);
console.log(`Report written to ${path.join(reportDir, 'semantics-lab.html')}`);
