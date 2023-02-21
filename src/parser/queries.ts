import { Language } from "web-tree-sitter";

export const getAllFuncsQuery = (lang: string, TSLanguage: Language) => {
  let query = funcQeries[lang];
  return TSLanguage.query(query);
};

export const getDocumentedFuncsQuery = (lang: string, TSLanguage: Language) => {
  let query = documentedFuncQeries[lang];
  return TSLanguage.query(query);
};

const csharpFuncQuery = `[
  (constructor_declaration
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body
  ) @function.def
  (method_declaration
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body
  ) @function.def
  (local_function_statement
    name: (identifier) @function.name
    parameters: (parameter_list) @function.params
    body: (block) @function.body
  ) @function.def
]`;

const javaFuncQuery = `[
  (method_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (block) @function.body
  ) @function.def
]`;

const jsFuncQuery = `[
  (function_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (statement_block) @function.body
  ) @function.def
  (generator_function_declaration
    name: (identifier) @function.name
    parameters: (formal_parameters) @function.params
    body: (statement_block) @function.body
  ) @function.def
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
  (labeled_statement
    label: (statement_identifier) @function.name
    (expression_statement
      (function
        parameters: (formal_parameters) @function.params
        body: (statement_block) @function.body
      )
    )
  ) @function.def
  (pair
    key: (property_identifier) @function.name
    value: (function
      parameters: (formal_parameters) @function.params
      body: (statement_block) @function.body
    )
  ) @function.def
]`;

const pythonFuncQuery = `[
  (function_definition
    name: (identifier) @function.name
    parameters: (parameters) @function.params
    body: (block) @function.body
  ) @function.def
]`;

const csharpDocstringFuncQuery = `[
  (
    (
      (comment)+
    ) @function.docstring
    .
    (constructor_declaration
      name: (identifier) @function.name
      parameters: (parameter_list) @function.params
      body: (block) @function.body
    ) @function.def
  )
  (
    (
      (comment)+
    ) @function.docstring
    .
    (method_declaration
      name: (identifier) @function.name
      parameters: (parameter_list) @function.params
      body: (block) @function.body
    ) @function.def
  )
  (
    (
      (comment)+
    ) @function.docstring
    .
    (local_function_statement
      name: (identifier) @function.name
      parameters: (parameter_list) @function.params
      body: (block) @function.body
    ) @function.def
  )
]`;

const javaDocstringFuncQuery = `[
  (
    (block_comment) @function.docstring
    .
    (method_declaration
      name: (identifier) @function.name
      parameters: (formal_parameters) @function.params
      body: (block) @function.body
    ) @function.def
  ) 
]`;
const jsDocstringFuncQuery = `[
  (
    (comment) @function.docstring
    .
    (expression_statement
      (assignment_expression
        left: (member_expression) @function.name
        right: (arrow_function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
    (comment) @function.docstring
    .
    (expression_statement
      (assignment_expression
        left: (member_expression) @function.name
        right: (function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
  	(comment) @function.docstring
    .
    (generator_function_declaration
      name: (identifier) @function.name
      parameters: (formal_parameters) @function.params
      body: (statement_block) @function.body
    )@function.def
  )
  (
  	(comment) @function.docstring
    .
    (expression_statement
      (assignment_expression
        left: (identifier) @function.name
        right: (arrow_function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
  	(comment) @function.docstring
    .
    (expression_statement
      (assignment_expression
        left: (identifier) @function.name
        right: (function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
  	(comment) @function.docstring
    .
    (lexical_declaration
      (variable_declarator
        name: (identifier) @function.name
        value: (arrow_function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
  	(comment) @function.docstring
    .
    (lexical_declaration
      (variable_declarator
        name: (identifier) @function.name
        value: (function
          parameters: (formal_parameters) @function.params
          body: (statement_block) @function.body
        )
      )@function.def
    )
  )
  (
  	(comment) @function.docstring
    .
    (function_declaration
        name: (identifier) @function.name
        parameters: (formal_parameters) @function.params
        body: (statement_block) @function.body
    ) @function.def
  )
]`;

const pythonDocstringFuncQuery = `[
  (function_definition
    name: (identifier) @function.name
    parameters: (parameters) @function.params
    body: (block
      (expression_statement
          (string) @function.docstring
        )
    ) @function.body
  ) @function.def
]`;

const funcQeries: any = {
  csharp: csharpFuncQuery,
  java: javaFuncQuery,
  javascript: jsFuncQuery,
  python: pythonFuncQuery,
};

const documentedFuncQeries: any = {
  csharp: csharpDocstringFuncQuery,
  java: javaDocstringFuncQuery,
  javascript: jsDocstringFuncQuery,
  python: pythonDocstringFuncQuery,
};
