import { spawn } from "node:child_process";

const [mode = "echo", argument] = process.argv.slice(2);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function event(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function readInput({ delayMs = 0 } = {}) {
  if (delayMs) {
    process.stdin.pause();
    await sleep(delayMs);
    process.stdin.resume();
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks);
}

switch (mode) {
  case "echo": {
    const input = await readInput();
    event({ type: "input", bytes: input.byteLength, text: input.toString("utf8") });
    break;
  }
  case "split-utf8": {
    await readInput();
    const bytes = Buffer.from(`${JSON.stringify({ type: "text", value: "拆分🙂字节" })}\n`, "utf8");
    for (let index = 0; index < bytes.byteLength; index += 1) {
      process.stdout.write(bytes.subarray(index, index + 1));
      await sleep(1);
    }
    break;
  }
  case "malformed":
    process.stdout.write('{"type":}\n');
    break;
  case "non-object":
    process.stdout.write('["event"]\n');
    break;
  case "partial":
    process.stdout.write('{"type":"partial"}');
    break;
  case "invalid-utf8":
    process.stdout.write(Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d, 0x0a]));
    break;
  case "oversize-frame":
    process.stdout.write(`${JSON.stringify({ value: "x".repeat(Number(argument) || 4096) })}\n`);
    break;
  case "oversize-total": {
    const count = Number(argument) || 100;
    for (let index = 0; index < count; index += 1) event({ index, value: "x".repeat(80) });
    break;
  }
  case "stderr":
    process.stderr.write("é".repeat(Number(argument) || 100));
    event({ type: "done" });
    break;
  case "backpressure": {
    const input = await readInput({ delayMs: Number(argument) || 150 });
    event({ type: "input", bytes: input.byteLength });
    break;
  }
  case "many-events": {
    const count = Number(argument) || 20;
    for (let index = 0; index < count; index += 1) event({ index });
    break;
  }
  case "exit-early":
    process.exitCode = Number(argument) || 7;
    break;
  case "spawn-grandchild-ignore-term": {
    process.on("SIGTERM", () => {});
    const descendant = spawn(process.execPath, ["-e", "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"], {
      stdio: "ignore",
    });
    event({ type: "ready", pid: process.pid, descendantPid: descendant.pid });
    setInterval(() => {}, 1000);
    break;
  }
  case "wait":
    event({ type: "ready", pid: process.pid });
    setInterval(() => {}, 1000);
    break;
  case "env":
    event({ type: "env", value: process.env.CW_FIXTURE_VALUE ?? null, ambient: process.env.HOME ?? null });
    break;
  default:
    process.stderr.write("unknown fixture mode");
    process.exitCode = 64;
}

