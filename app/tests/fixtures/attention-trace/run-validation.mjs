#!/usr/bin/env node
import { assertValidTraceVectors } from "./validate.mjs";

process.stdout.write(`${JSON.stringify(assertValidTraceVectors())}\n`);
