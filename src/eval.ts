import {
  list,
  AstNode as BaseAstNode,
  ListNode,
  IdentifierNode
} from "./helpers";

export interface FunctionNode {
  type: "FUNCTION";
  args: ListNode;
  body: BaseAstNode[];
}

export let func = (args: ListNode, body: BaseAstNode[]): FunctionNode => ({
  type: "FUNCTION",
  args,
  body
});

interface ContextReturn<T> {
  context: ContextListNode;
  value: T;
}

interface BuiltinNode {
  type: "BUILTIN";
  value: (ast: ListNode, context: ContextListNode) => ContextReturn<any>;
}

type CallableNode = BuiltinNode | FunctionNode;
type AstNode = BaseAstNode | CallableNode;
type EvaluateResult = string | number | IdentifierNode | CallableNode | null;
type ContextListNodeValue = AstNode | string | number | null;
export class ContextListNode {
  constructor(
    private values: Map<string, ContextListNodeValue>,
    private next: ContextListNode | null = null
  ) {}
  static from(
    hash: { [x: string]: ContextListNodeValue },
    next?: ContextListNode
  ) {
    return new ContextListNode(new Map(Object.entries(hash)), next);
  }
  append(values: { [x: string]: ContextListNodeValue }) {
    return ContextListNode.from(values, this);
  }
  lookup(key: string): AstNode | string | number {
    if (this.values.has(key)) {
      return this.values.get(key) as AstNode;
    }
    if (this.next) {
      return this.next.lookup(key);
    }
    throw new Error("Could not find identifier " + key);
  }
  flattened() {
    if (this.next === null) {
      let entries: { [x: string]: ContextListNodeValue } = {};
      for (let [key, value] of this.values.entries()) {
        entries[key] = value;
      }
      return entries;
    }
    let entries: { [x: string]: ContextListNodeValue } = this.next.flattened();
    for (let [key, value] of this.values.entries()) {
      entries[key] = value;
    }
    return entries;
  }
}

const BASE_CONTEXT: ContextListNode = ContextListNode.from({
  "!log!": {
    type: "BUILTIN",
    value: (ast, context) => {
      console.log(evaluate(ast, context));
      return {
        context,
        value: null
      };
    }
  },
  "!debug!": {
    type: "BUILTIN",
    value: (ast, context) => {
      console.log(context.flattened());
      return { context, value: null };
    }
  },
  add: {
    type: "BUILTIN",
    value: (ast, context) => {
      return {
        context,
        value: ast.elements.reduce((prev, curr) => {
          return prev + (evaluate(curr, context).value as number);
        }, 0)
      };
    }
  },
  lambda: {
    type: "BUILTIN",
    value: (ast, context) => {
      let [args, ...body] = ast.elements as Array<ListNode>;
      let f = func(args, body);
      return { context, value: f };
    }
  },
  define: {
    type: "BUILTIN",
    value: (ast, context) => {
      if (ast.elements[0].type !== "IDENTIFIER") {
        throw new Error("Argument to define must be an identifier");
      }
      let varName = (ast.elements[0] as IdentifierNode).text;
      let value = evaluate(ast.elements[1], context).value;
      let newContext = context.append({
        [varName]: value
      });
      return { context: newContext, value };
    }
  },
  defun: {
    type: "BUILTIN",
    value: (ast, context) => {
      let [funcName, args, ...body] = ast.elements;

      if (funcName.type !== "IDENTIFIER") {
        throw new Error("First argument to defun must be an identifier");
      }

      if (args.type !== "LIST") {
        throw new Error("2nd argument to list must be a list");
      }
      let f = func(args, body);

      let ctx = context.append({
        [(funcName as IdentifierNode).text]: f
      });
      return { context: ctx, value: f };
    }
  }
});

function evaluateBody(
  elements: BaseAstNode[],
  context: ContextListNode
): ContextReturn<EvaluateResult> {
  let result: ContextReturn<EvaluateResult> = {
    context,
    value: null
  };
  for (let element of elements) {
    result = evaluate(element, result.context);
  }
  return result;
}

function listToArray(
  ast: ListNode,
  context: ContextListNode
): ContextReturn<ContextListNodeValue[]> {
  let results = [];
  for (let element of ast.elements) {
    let result = evaluate(element, context);
    context = result.context;
    results.push(result.value);
  }
  return {
    context,
    value: results
  };
}

function funcall(
  func: CallableNode,
  args: ListNode,
  context: ContextListNode
): ContextReturn<EvaluateResult> {
  switch (func.type) {
    case "BUILTIN":
      return func.value(args, context);
    case "FUNCTION": {
      /**
       * We set up a new context with the values of the args replaced with
       * the values we have passed in via args. We don't return this because
       * that would pollute the parent's context table.
       */
      let { context: newContext, value: argValues } = listToArray(
        args,
        context
      ) as { context: ContextListNode; value: IdentifierNode[] };
      let map: Map<string, IdentifierNode> = new Map();
      argValues.forEach((val, i) => {
        map.set((func.args.elements[i] as IdentifierNode).text, val);
      });
      newContext = new ContextListNode(map, newContext);
      return {
        context,
        value: evaluateBody(func.body, newContext).value
      };
    }
  }
}

export function evaluate(
  ast: BaseAstNode,
  context = BASE_CONTEXT
): ContextReturn<EvaluateResult> {
  switch (ast.type) {
    case "LIST": {
      // Perform the lookup. We evaluate in case the head of the list is a lambda expression
      let functionName = evaluate(ast.elements[0], context)
        .value as CallableNode;
      let rest = list(ast.elements.slice(1));
      return funcall(functionName, rest, context);
    }
    case "IDENTIFIER":
      return {
        context,
        value: context.lookup(ast.text) as string | number
      };
    case "PROGRAM":
      return evaluateBody(ast.expressions, context);
    case "STRCONST":
      return {
        context,
        value: ast.text
      };
    case "DECCONST":
      return {
        context,
        value: ast.value
      };
  }
}
