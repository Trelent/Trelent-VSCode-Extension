import { SyntaxNode } from "web-tree-sitter";

export type Function = {
  body: string;
  definition: string;
  docstring: string | undefined;
  docstring_point: number[] | undefined;
  name: string;
  params: string[];
  range: number[][]; // [[start col, start line], [end col, end line]]
  text: string;
};

export type QueryGroup = {
  defNode: SyntaxNode;
  nameNode: SyntaxNode;
  paramsNode: SyntaxNode;
  bodyNode: SyntaxNode;
  docNodes: SyntaxNode[];
}