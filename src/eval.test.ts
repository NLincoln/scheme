import { parse } from "./parser";
import { evaluate, ContextListNode } from "./eval";

const testEval = (code: string, result: any) =>
  test(code, () => {
    expect(evaluate(parse(code)).value).toEqual(result);
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

let qeval = (code: string, ctx: ContextListNode) => evaluate(parse(code), ctx);

test("define", () => {
  let { context } = evaluate(
    parse(
      `
      (define a "a")
      (define b "b")
      (define c a)
      (define a "new")
    `
    )
  );
  expect(qeval(`a`, context).value).toBe("new");
  expect(qeval(`c`, context).value).toBe("a");
  expect(qeval(`b`, context).value).toBe("b");
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
  testEval(
    `
    ((lambda (a) (add a 1)) 3)
    `,
    4
  );
  testEval(`((lambda ()))`, null);
});
