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
    "with a body",
    "(a b c)",
    program([list([identifier("a"), identifier("b"), identifier("c")])])
  );
  testExpression(
    "intermixed with strings and numbers",
    '(a "b" 123)',
    program([list([identifier("a"), strconst("b"), decconst(123)])])
  );
});

describe("parsing identifiers", () => {
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
