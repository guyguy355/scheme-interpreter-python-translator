import { expect } from 'chai';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseL3 } from '../L3/L3-ast';
import { l2ToPython } from '../translator';
import { bind } from '../shared/result';

type PythonCommand = {
  command: string;
  args: string[];
};

const findPython = (): PythonCommand | undefined => {
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

const python = findPython();
const pythonSuite = python ? describe : describe.skip;

pythonSuite('Python equivalence', function () {
  it('executes generated Python for a supported program', () => {
    const translated = bind(parseL3('(L3 (define x 5) (+ x 2))'), l2ToPython);
    expect(translated.tag).to.equal('Ok');

    if (translated.tag !== 'Ok') {
      return;
    }

    const script = preparePythonScript(translated.value);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ppl-python-'));
    const scriptPath = path.join(tmpDir, 'generated.py');
    fs.writeFileSync(scriptPath, script, 'utf8');

    try {
      const result = spawnSync(python!.command, [...python!.args, scriptPath], { cwd: tmpDir, encoding: 'utf8' });
      expect(result.status).to.equal(0);
      expect((result.stdout || '').trim()).to.equal('7');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
