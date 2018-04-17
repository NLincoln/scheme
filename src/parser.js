import {
  program,
  decconst,
  strconst,
  expression,
  identifier,
  list
} from "./helpers";

// Holds all the state of our recursive-descent parser
export class Lexer {
  constructor(str) {
    this.tokens = str;
    this.index = 0;
  }

  next() {
    this.index++;
    return this.peek();
  }

  peek() {
    let result = this.tokens[this.index];
    return result;
  }
}
/**
 * The I-combinator. Returns it's first arg
 * @param args
 */
function I(val) {
  return val;
}

/**
 * Casts it's operand to boolean
 * @param {any} val
 * @returns {boolean}
 */
function bool(val) {
  return Boolean(val);
}

/**
 * Returns a function that returns the complement
 * Useful if you're wanting to do something like [].filter(not(isDigit))
 */
function not(func) {
  return val => !bool(val);
}

function collectWhile(lexer, allowed = bool, transform = I) {
  let result = [];
  let next = lexer.peek();
  do {
    result.push(transform(next, lexer));
    if (!allowed(lexer.peek(), lexer)) {
      break;
    }
    next = lexer.next();
  } while (next && allowed(next, lexer));
  return result.filter(bool);
}

function isDigit(str) {
  return /[0-9]/.test(str);
}

export function parse_string(lexer) {
  lexer.next(); // Past "
  return strconst(collectWhile(lexer, val => val !== '"').join(""));
}

/**
 * @param {Lexer} lexer
 */
export function parse_number(lexer) {
  return decconst(Number(collectWhile(lexer, isDigit).join("")));
}

function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n";
}

function isIdentifierAllowed(char) {
  return /([A-Z]|[a-z]|[0-9]|\-)/.test(char);
}

/**
 * @param {Lexer} lexer
 */
export function parse_identifier(lexer) {
  return identifier(collectWhile(lexer, isIdentifierAllowed).join(""));
}

/**
 * @param {Lexer} lexer
 */
export function parse_expression(lexer) {
  let char = lexer.peek();
  if (isDigit(char)) {
    return parse_number(lexer);
  } else if (char === '"') {
    return parse_string(lexer);
  } else if (char === "(") {
    lexer.next(); // past the (
    let body = collectWhile(
      lexer,
      val => val !== ")",
      (val, lexer) => parse_expression(lexer)
    );
    lexer.next(); // past the )
    return list(body);
  } else if (isIdentifierAllowed(char)) {
    return parse_identifier(lexer);
  } else if (isIdentifierAllowed(char)) {
    return parse_identifier(lexer);
  } else {
    return null;
  }
}

export function parse(str) {
  let lexer = new Lexer(str);
  return program(
    collectWhile(lexer, bool, (val, lexer) => parse_expression(lexer))
  );
}
