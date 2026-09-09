import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const moduleArgs = process.argv.slice(2);
if (moduleArgs.length === 0) {
  console.error('Usage: node cw-mra1a-spoof-independent.mjs <module-url> [<module-url> ...]');
  process.exitCode = 2;
} else {
  const toModuleUrl = (arg) => arg.includes(':') ? arg : pathToFileURL(arg).href;
  const sourceBytes = (value) => Uint8Array.from(Buffer.from(value, 'utf8'));
  const moduleReport = [];

  const inputCases = [
    {
      name: 'same-realm-forged-Uint16Array',
      make() {
        const value = new Uint16Array([0x61]);
        Object.defineProperty(value, Symbol.toStringTag, { value: 'Uint8Array' });
        return value;
      },
    },
    {
      name: 'cross-realm-forged-Uint16Array',
      make() {
        return vm.runInNewContext(`(() => {
          const value = new Uint16Array([0x61]);
          Object.defineProperty(value, Symbol.toStringTag, { value: 'Uint8Array' });
          return value;
        })()`);
      },
    },
  ];

  for (const arg of moduleArgs) {
    const moduleUrl = toModuleUrl(arg);
    const modulePath = new URL(moduleUrl).protocol === 'file:' ? new URL(moduleUrl) : null;
    const moduleBytes = modulePath ? await readFile(modulePath) : null;
    const module = await import(moduleUrl);
    const cases = [];
    for (const inputCase of inputCases) {
      const value = inputCase.make();
      const actualTag = Object.prototype.toString.call(value);
      const nativeConstructor = value.constructor?.name;
      const isActualUint8Array = value instanceof Uint8Array;
      let outcome;
      try {
        const source = module.buildSourceCoordinates(value);
        outcome = {
          status: 'fail',
          contract: 'must reject forged Uint16Array as TypeError',
          observed: {
            accepted: true,
            text: source.text,
            byteLength: source.byteLength,
            codePointLength: source.codePointLength,
            bytesHex: Buffer.from(source.text, 'utf8').toString('hex'),
          },
        };
      } catch (error) {
        const expected = error?.name === 'TypeError' && error?.code === undefined;
        outcome = {
          status: expected ? 'pass' : 'fail',
          contract: 'must reject forged Uint16Array as TypeError',
          observed: {
            accepted: false,
            error: {
              name: error?.name,
              code: error?.code,
              message: error?.message,
            },
          },
        };
      }
      cases.push({
        name: inputCase.name,
        input: {
          constructor: nativeConstructor,
          objectToString: actualTag,
          sameRealmInstanceofUint8Array: isActualUint8Array,
          byteLength: value.byteLength,
          forgedToStringTag: value[Symbol.toStringTag],
        },
        ...outcome,
      });
    }
    const passed = cases.filter((item) => item.status === 'pass').length;
    moduleReport.push({
      module: basename(modulePath?.pathname ?? moduleUrl),
      moduleUrl,
      moduleSha256: moduleBytes ? createHash('sha256').update(moduleBytes).digest('hex') : null,
      cases,
      summary: { cases: cases.length, passed, failed: cases.length - passed },
    });
  }

  const allCases = moduleReport.flatMap((item) => item.cases);
  const passed = allCases.filter((item) => item.status === 'pass').length;
  console.log(JSON.stringify({
    task: 'MR-A1a forged Symbol.toStringTag Uint16Array independent probe',
    node: process.version,
    contract: 'A Uint16Array that reports [object Uint8Array] must still be rejected; cross-realm forged values are included.',
    modules: moduleReport,
    summary: { cases: allCases.length, passed, failed: allCases.length - passed },
  }, null, 2));
}
