export type AstNode =
  | ProgramNode
  | IdentifierNode
  | ListNode
  | DecConstNode
  | StringConstNode;

export interface ProgramNode {
  type: "PROGRAM";
  expressions: AstNode[];
}

export let program = (children: AstNode[]): ProgramNode => ({
  type: "PROGRAM",
  expressions: children
});

export interface IdentifierNode {
  type: "IDENTIFIER";
  text: string;
}

export let identifier = (text: string): IdentifierNode => ({
  type: "IDENTIFIER",
  text
});

export interface ListNode {
  type: "LIST";
  elements: Array<AstNode>;
}

export let list = (elements: Array<AstNode>): ListNode => ({
  type: "LIST",
  elements
});

export interface StringConstNode {
  type: "STRCONST";
  text: string;
}

export let strconst = (text: string): StringConstNode => ({
  type: "STRCONST",
  text
});

export interface DecConstNode {
  type: "DECCONST";
  value: number;
}

export let decconst = (literal: number): DecConstNode => ({
  type: "DECCONST",
  value: literal
});
