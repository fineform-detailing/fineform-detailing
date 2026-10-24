import test from "node:test";
import assert from "node:assert/strict";
import { wranglerEnvironment } from "../scripts/cloudflare.mjs";
test("Workers Builds keeps primary Worker routing while publishing the internal web service to its own target", () => {
  const source = {
    WRANGLER_CI_OVERRIDE_NAME: "fine-form-3-0",
    WRANGLER_CI_MATCH_TAG: "primary-worker-tag",
    CLOUDFLARE_ACCOUNT_ID: "same-authorized-account",
    UNRELATED_SETTING: "keep",
  };
  const primary = wranglerEnvironment(source),
    web = wranglerEnvironment(source, true);
  assert.equal(primary.WRANGLER_CI_OVERRIDE_NAME, "fine-form-3-0");
  assert.equal(primary.WRANGLER_CI_MATCH_TAG, "primary-worker-tag");
  assert.equal(web.WRANGLER_CI_OVERRIDE_NAME, undefined);
  assert.equal(web.WRANGLER_CI_MATCH_TAG, undefined);
  assert.equal(web.WRANGLER_CI_GENERATE_PREVIEW_ALIAS, "false");
  assert.equal(web.CLOUDFLARE_ACCOUNT_ID, source.CLOUDFLARE_ACCOUNT_ID);
  assert.equal(web.UNRELATED_SETTING, "keep");
  assert.equal(source.WRANGLER_CI_OVERRIDE_NAME, "fine-form-3-0");
});
