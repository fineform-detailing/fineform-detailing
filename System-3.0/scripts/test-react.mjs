import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const files = readdirSync("tests/react")
  .filter((name) => name.endsWith(".test.tsx"))
  .map((name) => "tests/react/" + name);
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  {
    stdio: "inherit",
    env: { ...process.env, TSX_TSCONFIG_PATH: "apps/web/tsconfig.json" },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
