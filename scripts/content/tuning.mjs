import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = new URL("../../", import.meta.url);

export async function runTuning(args, input) {
  const job = exec("moon", [
    "run", "--target", "native", "cmd/tuning", "--", ...args,
  ], { cwd: root });
  job.child.stdin.on("error", (err) => {
    // An early compiler exit is reported by execFile with its diagnostics.
    if (err.code !== "EPIPE") job.child.kill();
  });
  job.child.stdin.end(input);
  try {
    await job;
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.message, { cause: err });
  }
}
