import { Language } from "web-tree-sitter";

export const getAllFuncsQuery = (lang: string, TSLanguage: Language) => {
  let query = funcQeries[lang];
  return TSLanguage.query(query);
};

const csharpFuncQuery = `
(
  (comment)* @function.docstrings
  .
  (constructor_declaration
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body) @function.def
)
(
  (comment)* @function.docstrings
  .
  (method_declaration
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body) @function.def
)
(
  (comment)* @function.docstrings
  .
  (local_function_statement
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body
  ) @function.def
)
`;

const javaFuncQuery = `(
  (block_comment)? @function.docstring
  .
  (method_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (block) @function.body
  ) @function.def
)
(
  (block_comment)? @function.docstring
  .
  (constructor_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (constructor_body) @function.body
  ) @function.def
)`;

const jsFuncQuery = `
(
  (comment)? @function.docstring
  .
  (function_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (statement_block) @function.body
  ) @function.def 
)
(
  (comment)? @function.docstring
  .
  (generator_function_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (statement_block) @function.body
  ) @function.def
)
(
  (comment)? @function.docstring
  .
  (lexical_declaration
    (variable_declarator
      name: (identifier) @function.name
      value: [
        (arrow_function
          parameters: (formal_parameters) @function.params
          body: (_) @function.body
        )
        (function
          parameters: (formal_parameters) @function.params
          body: (_) @function.body
        )
      ]
    )
  ) @function.def
)
(
  (comment)? @function.docstring
  .
  (labeled_statement
    label: (statement_identifier) @function.name
    (expression_statement
      (function
        parameters: (formal_parameters) @function.params
        body: (statement_block) @function.body
      )
    )
  ) @function.def
)
(
  (comment)? @function.docstring
  .
  (pair
    key: (property_identifier) @function.name
    value: (function
      parameters: (formal_parameters) @function.params
      body: (statement_block) @function.body
    )
  ) @function.def
)
(
  (comment)? @function.docstring
  .
  (method_definition
    name: (property_identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (statement_block) @function.body
  ) @function.def
)`;

const pythonFuncQuery = `
(function_definition
  name: (identifier) @function.name
  parameters: (parameters) @function.params
  body: (block
    (expression_statement
        (string) @function.docstring
      )?
  ) @function.body
) @function.def
`;


const funcQeries: any = {
  csharp: csharpFuncQuery,
  java: javaFuncQuery,
  javascript: jsFuncQuery,
  python: pythonFuncQuery,
};
