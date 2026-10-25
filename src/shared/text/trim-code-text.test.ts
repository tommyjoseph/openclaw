import { expect, it } from "vitest";
import { trimTextPreservingCode } from "./trim-code-text.js";

it.each(["start", "both"] as const)("keeps an indented fence's own indent (%s)", (mode) => {
  const fence = "  ```js\n  const x = 1;\n  ```";
  expect(trimTextPreservingCode(fence, mode)).toBe(fence);
  expect(trimTextPreservingCode(`\n \n${fence}`, mode)).toBe(fence);
  expect(trimTextPreservingCode(`\r\n${fence.replaceAll("\n", "\r\n")}`, mode)).toBe(
    fence.replaceAll("\n", "\r\n"),
  );
});

it.each([
  ["\n\n```js\nx\n```", "```js\nx\n```"],
  ["\n    indented code", "    indented code"],
  ["  plain text  ", "plain text"],
  ["\n  `inline` text", "`inline` text"],
])("still trims padding outside code blocks %#", (source, expected) => {
  expect(trimTextPreservingCode(source)).toBe(expected);
});
