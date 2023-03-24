/* eslint-disable @typescript-eslint/naming-convention */
// External imports
const axios = require("axios").default;
import * as vscode from "vscode";

// Internal imports
import "./conf";
import { TokenManager } from "../helpers/token";
import { Function } from "../parser/types";
import {
  GET_CHECKOUT_URL,
  GET_PORTAL_URL,
  GET_USER_URL,
  WRITE_DOCSTRING_URL,
  PARSE_CURRENT_FUNCTION_URL,
  CHECKOUT_RETURN_URL,
  PORTAL_RETURN_URL,
} from "./conf";

export const getCheckoutUrl = async (token: string): Promise<any> => {
  let result = await axios({
    method: "GET",
    url: `${GET_CHECKOUT_URL}&return_url=${CHECKOUT_RETURN_URL}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result.data;
};

export const getPortalUrl = async (token: string): Promise<any> => {
  let result = await axios({
    method: "GET",
    url: `${GET_PORTAL_URL}?return_url=${PORTAL_RETURN_URL}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result.data;
};

export const getUser = async (token: string): Promise<any> => {
  let user = null;
  await axios({
    method: "GET",
    url: GET_USER_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response: any) => {
      let result = response.data;
      user = result;
    })
    .catch((error: any) => {
      console.error(error);
    });

  return user;
};

export const requestDocstrings = async (
  context: vscode.ExtensionContext,
  format: string,
  funcs: Function[],
  user: string,
  language: string,
  modulesContext: string | null
): Promise<any> => {
  let dataArr: { success: boolean; error: string; data: any; function: Function}[] = [];

  let token = await TokenManager.getToken(context);

  // Get a docstring for each function
  await Promise.all(
    funcs.map(async (func: Function) => {
      // Setup our request body
      let reqBody = {
        context: modulesContext,
        format: format,
        function: {
          function_code: func.text,
          function_name: func.name,
          function_params: func.params,
        },
        language: language,
        sender: "ext-vscode",
        user_id: user,
      };

      let tokenHeader = `Bearer ${token}`;

      // Send the request
      await axios({
        method: "POST",
        url: WRITE_DOCSTRING_URL,
        data: JSON.stringify(reqBody),
        headers: {
          Authorization: tokenHeader,
          "Content-Type": "application/json",
        },
      })
        .then((response: any) => {
          let result = response.data;
          dataArr.push({
            ...result,
            function: func
          });
        })
        .catch((error: any) => {
          console.log(error);
          console.error(error);
        });
    })
  );

  return dataArr;
};

export const parseCurrentFunction = (
  document: string,
  language: string,
  cursor: number[]
): Promise<any> => {
  // Setup our request body
  let reqBody = {
    cursor: cursor,
    language: language,
    source: document,
  };

  // Send the request
  return axios({
    method: "POST",
    url: PARSE_CURRENT_FUNCTION_URL,
    data: JSON.stringify(reqBody),
    headers: {
      "Content-Type": "application/json",
    },
  });
};
