import { func, list } from "./helpers";

export class ContextListNode {
  constructor(values, next = null) {
    this.values = values;
    this.next = next;
  }
  append(values) {
    return new ContextListNode(values, this);
  }
  lookup(key) {
    if (this.values.has(key)) {
      return this.values.get(key);
    }
    if (this.next) {
      return this.next.lookup(key);
    }
    throw new Error("Could not find identifier " + key);
  }
}

const BASE_CONTEXT = new ContextListNode(
  new Map(
    Object.entries({
      add: {
        type: "BUILTIN",
        value: (ast, context) => {
          return [
            context,
            ast.elements.reduce((prev, curr) => {
              return prev + evaluate(curr, context)[1];
            }, 0)
          ];
        }
      },
      defun: {
        type: "BUILTIN",
        value: (ast, context) => {
          let funcName = ast.elements[0].text;
          let args = ast.elements[1];
          let body = ast.elements[2];
          let f = func(args, body);

          let ctx = context.append(
            new Map(
              Object.entries({
                [funcName]: f
              })
            )
          );
          return [ctx, f];
        }
      }
    })
  )
);

function listToArray(ast, context) {
  let results = [];
  for (let element of ast.elements) {
    let result = evaluate(element, context);
    context = result[0];
    results.push(result[1]);
  }
  return [context, results];
}

function funcall(func, args, context) {
  switch (func.type) {
    case "BUILTIN":
      return func.value(args, context);
    case "FUNCTION": {
      /**
       * We set up a new context with the values of the args replaced with
       * the values we have passed in via args. We don't return this because
       * that would pollute the parent's context table.
       */
      let [newContext, argValues] = listToArray(args, context);
      newContext = newContext.append(
        new Map(
          argValues.map((val, i) => {
            let key = func.args.elements[i].text;
            return [key, val];
          })
        )
      );
      return [context, evaluate(func.body, newContext)[1]];
    }
  }
}

export function evaluate(ast, context = BASE_CONTEXT) {
  switch (ast.type) {
    case "LIST": {
      let functionName = evaluate(ast.elements[0], context)[1];
      let rest = list(ast.elements.slice(1));
      return funcall(functionName, rest, context);
    }
    case "IDENTIFIER":
      return [context, context.lookup(ast.text)];
    case "PROGRAM":
      return ast.expressions.reduce(
        ([context], curr) => {
          return evaluate(curr, context);
        },
        [context, null]
      )[1];
    case "STRCONST":
      return [context, ast.text];
    case "DECCONST":
      return [context, ast.value];
  }
}
