import * as vscode from "vscode";

const CHECKOUT_REDIRECT = `${vscode.env.uriScheme}://trelent.trelent/checkout`;
const PORTAL_REDIRECT = `${vscode.env.uriScheme}://trelent.trelent/portal`;

// Prod api
// export const GET_USER_URL = "https://prod-api.trelent.net/me";
// export const LOGIN_URL = "https://prod-api.trelent.net/auth/login";
// export const LOGOUT_URL = "https://prod-api.trelent.net/auth/logout";
// export const WRITE_DOCSTRING_URL =
//   "https://prod-api.trelent.net/docs/docstring";
// export const GET_CHECKOUT_URL =
//   "https://prod-api.trelent.net/billing/checkout?billing_plan=1";
// export const GET_PORTAL_URL = "https://prod-api.trelent.net/billing/portal";
// export const CHECKOUT_RETURN_URL = `https://prod-api.trelent.net/redirect?redirect_url=${encodeURIComponent(
//   CHECKOUT_REDIRECT
// )}`;
// export const PORTAL_RETURN_URL = `https://prod-api.trelent.net/redirect?redirect_url=${encodeURIComponent(
//   PORTAL_REDIRECT
// )}`;

// Dev api
export const GET_USER_URL = "https://dev-api.trelent.net/me";
export const LOGIN_URL = "https://dev-api.trelent.net/auth/login";
export const LOGOUT_URL = "https://dev-api.trelent.net/auth/logout";
export const WRITE_DOCSTRING_URL = "https://dev-api.trelent.net/docs/docstring";
export const GET_CHECKOUT_URL =
 "https://dev-api.trelent.net/billing/checkout?billing_plan=1";
export const GET_PORTAL_URL = "https://dev-api.trelent.net/billing/portal";
export const CHECKOUT_RETURN_URL = `https://dev-api.trelent.net/redirect?redirect_url=${encodeURIComponent(
 CHECKOUT_REDIRECT
)}`;
export const PORTAL_RETURN_URL = `https://dev-api.trelent.net/redirect?redirect_url=${encodeURIComponent(
 PORTAL_REDIRECT
)}`;

// Local api
//export const GET_USER_URL = "http://localhost:8000/me";
//export const LOGIN_URL = "http://localhost:8000/auth/login";
//export const LOGOUT_URL = "http://localhost:8000/auth/logout";
//export const WRITE_DOCSTRING_URL = "http://localhost:8000/docs/docstring";
//export const GET_CHECKOUT_URL =
//  "http://localhost:8000/billing/checkout?billing_plan=1";
//export const GET_PORTAL_URL = "http://localhost:8000/billing/portal";
//export const CHECKOUT_RETURN_URL = `http://localhost:8000/redirect?redirect_url=${encodeURIComponent(
//  CHECKOUT_REDIRECT
//)}`;
//export const PORTAL_RETURN_URL = `http://localhost:8000/redirect?redirect_url=${encodeURIComponent(
//  PORTAL_REDIRECT
//)}`;
