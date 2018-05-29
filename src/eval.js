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
  flattened() {
    if (this.next === null) {
      let entries = {};
      for (let [key, value] of this.values.entries()) {
        entries[key] = value;
      }
      return entries;
    }
    let entries = this.next.flattened();
    for (let [key, value] of this.values.entries()) {
      entries[key] = value;
    }
    return entries;
  }
}

const BASE_CONTEXT = new ContextListNode(
  new Map(
    Object.entries({
      "!log!": {
        type: "BUILTIN",

        value: (ast, context) => {
          console.log(evaluate(ast, context));
          return [context, ast];
        }
      },
      "!debug!": {
        type: "BUILTIN",
        value: (ast, context) => {
          console.log(context.flattened());
          return [context, ast];
        }
      },
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
      lambda: {
        type: "BUILTIN",
        value: (ast, context) => {
          let [args, ...body] = ast.elements;
          let f = func(args, body);
          return [context, f];
        }
      },
      define: {
        type: "BUILTIN",
        value: (ast, context) => {
          let varName = ast.elements[0].text;
          let value = evaluate(ast.elements[1], context)[1];
          let newContext = context.append(
            new Map(
              Object.entries({
                [varName]: value
              })
            )
          );
          return [newContext, value];
        }
      },
      defun: {
        type: "BUILTIN",
        value: (ast, context) => {
          let [funcName, args, ...body] = ast.elements;
          let f = func(args, body);

          let ctx = context.append(
            new Map(
              Object.entries({
                [funcName.text]: f
              })
            )
          );
          return [ctx, f];
        }
      }
    })
  )
);

function evaluateBody(elements, context) {
  return elements.reduce(
    ([context], element) => {
      return evaluate(element, context);
    },
    [context, null]
  );
}

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
      return [context, evaluateBody(func.body, newContext)[1]];
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
      return evaluateBody(ast.expressions, context);
    case "STRCONST":
      return [context, ast.text];
    case "DECCONST":
      return [context, ast.value];
  }
}
