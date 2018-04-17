export let program = children => ({
  type: "PROGRAM",
  expressions: children
});
export let identifier = text => ({
  type: "IDENTIFIER",
  text
});

export let expression = (head, body) => ({
  type: "EXPRESSION",
  head,
  body
});

export let list = elements => ({
  type: "LIST",
  elements
});

export let strconst = text => ({
  type: "STRCONST",
  text
});

export let decconst = literal => ({
  type: "DECCONST",
  value: literal
});
