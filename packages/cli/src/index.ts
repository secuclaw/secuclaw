#!/usr/bin/env node
import { runCli } from "./run-main.js";

runCli(process.argv).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
