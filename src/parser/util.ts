import { Point } from "web-tree-sitter";

export const getMultilineStringIndex = (
  text: string,
  col: number,
  row: number
) => {
  let split = text.split("\n");
  let index = 0;
  for (let i = 0; i < row; i++) {
    index += split[i].length + 1;
  }
  index += col;

  //console.log("TRELENT: Multiline string index", index);
  return index;
};

export const getParams = (paramsText: string): string[] => {
  // remove the first and last parenthesis, and early return if empty
  paramsText = paramsText.substring(1, paramsText.length - 1);
  if (paramsText.length == 0) return [];

  // Split on commas
  let params = paramsText.split(",").map((param) => {
    return param.trim();
  });

  // Remove default values
  params = params.map((param) => {
    if (param.includes("=")) {
      return param.split("=")[0].trim();
    }
    return param;
  });

  return params;
};

export const getTextBetweenPoints = (
  text: string,
  start: Point,
  end: Point
) => {
  let startIndex = getMultilineStringIndex(text, start.column, start.row);
  let endIndex = getMultilineStringIndex(text, end.column, end.row);

  let result = text.substring(startIndex, endIndex);

  return result;
};
