import {
  program,
  decconst,
  strconst,
  identifier,
  list,
  IdentifierNode,
  AstNode,
  DecConstNode,
  StringConstNode
} from "./helpers";

// Holds all the state of our recursive-descent parser
export class Lexer {
  index: number;
  constructor(private tokens: string) {
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
function I<T>(val: T): T {
  return val;
}

/**
 * Casts it's operand to boolean
 */
function bool<T>(val: T): boolean {
  return Boolean(val);
}

type TransformFunction<T> = (s: string, l: Lexer) => T;

function collectWhile<T = string>(
  lexer: Lexer,
  allowed: (s: string, l: Lexer) => boolean = bool,
  transform: TransformFunction<T>
) {
  let result = [];
  let next = lexer.peek();
  do {
    result.push(transform(next, lexer));
    if (!allowed(lexer.peek(), lexer)) {
      break;
    }
    next = lexer.next();
  } while (next && allowed(next, lexer));
  return result;
}

function isDigit(str: string): boolean {
  return /[0-9]/.test(str);
}

export function parse_string(lexer: Lexer): StringConstNode {
  lexer.next(); // Past "
  return strconst(collectWhile(lexer, val => val !== '"', I).join(""));
}

/**
 * @param {Lexer} lexer
 */
export function parse_number(lexer: Lexer): DecConstNode {
  return decconst(Number(collectWhile(lexer, isDigit, I).join("")));
}

function isIdentifierAllowed(char: string): boolean {
  return /([A-Z]|[a-z]|[0-9]|!|\-)/.test(char);
}

/**
 * @param {Lexer} lexer
 */
export function parse_identifier(lexer: Lexer): IdentifierNode {
  return identifier(collectWhile(lexer, isIdentifierAllowed, I).join(""));
}

/**
 * @param {Lexer} lexer
 */
export function parse_expression(lexer: Lexer): AstNode | null {
  let char = lexer.peek();
  if (isDigit(char)) {
    return parse_number(lexer);
  } else if (char === '"') {
    return parse_string(lexer);
  } else if (char === "(") {
    lexer.next(); // past the (
    let body = collectWhile<AstNode | null>(
      lexer,
      val => val !== ")",
      (val: string, lexer: Lexer): AstNode | null => parse_expression(lexer)
    );
    lexer.next(); // past the )
    return list(body.filter(bool) as AstNode[]);
  } else if (isIdentifierAllowed(char)) {
    return parse_identifier(lexer);
  } else if (isIdentifierAllowed(char)) {
    return parse_identifier(lexer);
  } else {
    return null;
  }
}

export function parse(str: string) {
  let lexer = new Lexer(str);
  let nodes = collectWhile<AstNode | null>(lexer, bool, (val, lexer) =>
    parse_expression(lexer)
  );

  return program(nodes.filter(bool) as AstNode[]);
}
