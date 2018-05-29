import { parse } from "./parser";
import {
  program,
  decconst,
  strconst,
  expression,
  identifier,
  list
} from "./helpers";

let testExpression = (title, str, expected) =>
  test(title, () => {
    expect(parse(str)).toEqual(expected);
  });

testExpression(
  "it is able to parse simple number expressions",
  "1234",
  program([decconst(1234)])
);

testExpression(
  "it is able to parse simple text expressions",
  `"abcd"`,
  program([strconst("abcd")])
);

describe("statements", () => {
  testExpression(
    "a simple expression with no body",
    "(a)",
    program([list([identifier("a")])])
  );
  testExpression(
    "a simple one after something else",
    "(a) 1",
    program([list([identifier("a")]), decconst(1)])
  );
  testExpression(
    "with a body",
    "(a b c)",
    program([list([identifier("a"), identifier("b"), identifier("c")])])
  );
  testExpression(
    "intermixed with strings and numbers",
    '(a "b" 123)',
    program([list([identifier("a"), strconst("b"), decconst(123)])])
  );
  testExpression(
    "nesting",
    "(cons (cons (cons a b)))",
    program([
      list([
        identifier("cons"),
        list([
          identifier("cons"),
          list([identifier("cons"), identifier("a"), identifier("b")])
        ])
      ])
    ])
  );
  testExpression(
    "bodied program",
    `
  (defun add-two (a)
    (add a 2)
    (add b 3))
  `,
    program([
      list([
        identifier("defun"),
        identifier("add-two"),
        list([identifier("a")]),
        list([identifier("add"), identifier("a"), decconst(2)]),
        list([identifier("add"), identifier("b"), decconst(3)])
      ])
    ])
  );
  testExpression(
    "a simple program?",
    `
  (defun add-one (a) (add a 1))
  (add-one 2)
  `,
    program([
      list([
        identifier("defun"),
        identifier("add-one"),
        list([identifier("a")]),
        list([identifier("add"), identifier("a"), decconst(1)])
      ]),
      list([identifier("add-one"), decconst(2)])
    ])
  );
});

describe("parsing identifiers", () => {
  testExpression("id w/ symbols", "!debug!", program([identifier("!debug!")]));
  testExpression("simple id", "a", program([identifier("a")]));
  testExpression("multiple characters", "aaa", program([identifier("aaa")]));
  testExpression(
    "with numbers intermixed",
    "aa11aa",
    program([identifier("aa11aa")])
  );
  testExpression("with spaces in it", " aabb  ", program([identifier("aabb")]));
  testExpression(
    "multiple identifiers",
    " aa bb  cc",
    program([identifier("aa"), identifier("bb"), identifier("cc")])
  );
});
