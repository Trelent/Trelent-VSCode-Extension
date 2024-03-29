import { SyntaxNode } from "web-tree-sitter";

export type Function = {
  body: string;
  definition: string;
  definition_line: number;
  docstring: string | undefined;
  docstring_offset: number;
  docstring_range: number[] | undefined;
  name: string;
  params: string[];
  range: number[]; // [[start col, start line], [end col, end line]]
  text: string;
  levenshteinDistanceSum?: number;
};

export type QueryGroup = {
  defNode: SyntaxNode;
  nameNode: SyntaxNode;
  paramsNode: SyntaxNode;
  bodyNode: SyntaxNode;
  docNodes: SyntaxNode[];
};

export enum DocTag {
  AUTO,
  IGNORE,
  HIGHLIGHT,
  NONE,
}
