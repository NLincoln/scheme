import { parse } from "./parser";
import { evaluate, ContextListNode } from "./eval";

describe("ContextListNode", () => {
  test("it is able to do nested lookups", () => {
    let root = new ContextListNode(new Map([["a", "b"]]));

    let child = root.append(new Map([["b", "c"]]));
    let grandchild = child.append(new Map([["c", "d"]]));
    expect(grandchild.lookup("b")).toBe("c");
    expect(grandchild.lookup("a")).toBe("b");

    expect(grandchild.flattened()).toEqual({
      a: "b",
      b: "c",
      c: "d"
    });
  });
});

const testEval = (code, result) =>
  test(code, () => {
    expect(evaluate(parse(code))[1]).toEqual(result);
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
  testEval(
    `
    (defun dumb-add (a b)
      (define a-other (add a 3))
      (define b-other (add b 5))
      (add a-other b-other)
    )
    (dumb-add 4 10)
    `,
    22
  );
});

let qeval = (code, ctx) => evaluate(parse(code), ctx);

test("define", () => {
  let [context] = evaluate(
    parse(
      `
      (define a "a")
      (define b "b")
      (define c a)
      (define a "new")
    `
    )
  );
  expect(qeval(`a`, context)[1]).toBe("new");
  expect(qeval(`c`, context)[1]).toBe("a");
  expect(qeval(`b`, context)[1]).toBe("b");
});

describe("lambda expressions", () => {
  testEval(
    `
  (define add-proxy (lambda (a b)
    (add a b)))
  (define a 5)
  (add-proxy a a)
  `,
    10
  );
});
