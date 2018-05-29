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

interface ContextReturn<T = any> {
  context: ContextListNode;
  value?: T;
}

interface BuiltinNode {
  type: "BUILTIN";
  value: (ast: ListNode, context: ContextListNode) => ContextReturn;
}

type AstNode = BaseAstNode | BuiltinNode | FunctionNode;

export class ContextListNode {
  constructor(
    private values: Map<string, AstNode>,
    private next: ContextListNode | null = null
  ) {}
  append(values: Map<string, AstNode>) {
    return new ContextListNode(values, this);
  }
  lookup(key: string): AstNode {
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
      let entries: { [x: string]: AstNode } = {};
      for (let [key, value] of this.values.entries()) {
        entries[key] = value;
      }
      return entries;
    }
    let entries: { [x: string]: AstNode } = this.next.flattened();
    for (let [key, value] of this.values.entries()) {
      entries[key] = value;
    }
    return entries;
  }
}

const BASE_CONTEXT: ContextListNode = new ContextListNode(
  new Map<string, BuiltinNode>(
    Object.entries<BuiltinNode>({
      "!log!": {
        type: "BUILTIN",
        value: (ast, context) => {
          console.log(evaluate(ast, context));
          return {
            context
          };
        }
      },
      "!debug!": {
        type: "BUILTIN",
        value: (ast, context) => {
          console.log(context.flattened());
          return { context };
        }
      },
      add: {
        type: "BUILTIN",
        value: (ast, context) => {
          return {
            context,
            value: ast.elements.reduce((prev, curr) => {
              return prev + evaluate(curr, context).value;
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
          let newContext = context.append(
            new Map(
              Object.entries({
                [varName]: value
              })
            )
          );
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

          let ctx = context.append(
            new Map(
              Object.entries({
                [(funcName as IdentifierNode).text]: f
              })
            )
          );
          return { context: ctx, value: f };
        }
      }
    })
  )
);

function evaluateBody(
  elements: BaseAstNode[],
  context: ContextListNode
): ContextReturn {
  return elements.reduce(
    ({ context }, element) => {
      return evaluate(element, context);
    },
    { context }
  );
}

function listToArray(
  ast: ListNode,
  context: ContextListNode
): ContextReturn<IdentifierNode[]> {
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
  func: AstNode,
  args: ListNode,
  context: ContextListNode
): ContextReturn {
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
      newContext = newContext.append(map);
      return {
        context,
        value: evaluateBody(func.body, newContext).value
      };
    }
    default:
      throw new Error("Unknown function call type found");
  }
}

export function evaluate(
  ast: BaseAstNode,
  context = BASE_CONTEXT
): ContextReturn {
  switch (ast.type) {
    case "LIST": {
      let functionName = evaluate(ast.elements[0], context).value;
      let rest = list(ast.elements.slice(1));
      return funcall(functionName, rest, context);
    }
    case "IDENTIFIER":
      return {
        context,
        value: context.lookup(ast.text)
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
