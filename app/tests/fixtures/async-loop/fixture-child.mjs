// This is intentionally a tiny external observer, used only by the fixture's
// SIGKILL/restart self-test.  It has no access to Courtwork runtime state.
const [origin, jobId] = process.argv.slice(2);
const response = await fetch(`${origin}/jobs/${encodeURIComponent(jobId)}`);
const job = await response.json();
process.stdout.write(`${JSON.stringify({ kind: 'query', job })}\n`);
// Keep the process alive after its query so the parent can kill a real child.
setInterval(() => {}, 1_000);
