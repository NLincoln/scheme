import { parse } from "./parser";
import { evaluate, ContextListNode } from "./eval";

describe("ContextListNode", () => {
  test("it is able to do nested lookups", () => {
    let root = new ContextListNode(new Map([["a", "b"]]));

    let child = root.append(new Map([["b", "c"]]));
    let grandchild = child.append(new Map([["c", "d"]]));
    expect(grandchild.lookup("b")).toBe("c");
    expect(grandchild.lookup("a")).toBe("b");
  });
});

const testEval = (code, result) =>
  test(code, () => {
    expect(evaluate(parse(code))).toEqual(result);
  });

testEval(` 1 `, 1);
testEval(` 1 2 `, 2);
testEval(` "a" `, "a");
testEval(`(add 1 2)`, 3);
testEval(`(add 1 (add 1 1))`, 3);

describe("defining functions", () => {
  testEval(
    `
  (defun add-one (a)
    (add 1 a))
  (add-one 3)
  `,
    4
  );
  testEval(
    `
  (defun add-proxy (a b)
    (add a b))
  (add-proxy 4 5)
  `,
    9
  );
  testEval(
    `
    (defun add-proxy (a b)
      (add a b))
    (defun add-one (a)
      (add-proxy a 1))
    (add-one 3)
    `,
    4
  );
  testEval(
    `
  (defun add-proxy (a b)
    (add a b))
  (defun add-one (a)
    (add-proxy a 1))
  (defun add-two (a)
    (add-one (add-one a)))
  (add-two 2)
  `,
    4
  );
});
