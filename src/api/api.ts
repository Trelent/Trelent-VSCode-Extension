/* eslint-disable @typescript-eslint/naming-convention */
// External imports
const axios = require('axios').default;
import * as vscode from 'vscode';


import { TokenManager } from '../helpers/token';
// Internal imports
import './conf';
import { GET_USER_URL, WRITE_DOCSTRING_URL, PARSE_FUNCTIONS_URL, PARSE_CURRENT_FUNCTION_URL, SUBMIT_CHOICE_URL } from './conf';

export const submitChoice = async(choice: string, user: string) => {
    // Setup our request body
    let reqBody = {
        'choice': choice,
        'user': user,
    };

    // Send the request based on the language
    await axios({
        method: 'POST',
        url: SUBMIT_CHOICE_URL,
        data: JSON.stringify(reqBody),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then((response: any) => {
        let result = response.data;
    })
    .catch((error : any) => {
        console.error(error);
    });
};

export const getUser = async(token: string) : Promise<any> => {
    let user = null;
    await axios({
        method: 'GET',
        url: GET_USER_URL,
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then((response: any) => {
        let result = response.data;
        user = result;
    })
    .catch((error : any) => {
        console.error(error);
    });

    return user;
};

export const requestDocstrings = async(context: vscode.ExtensionContext, format: string, funcs: any, user: string, language: string): Promise<any>  => {

    let dataArr: { success: boolean; error: string, data: any; }[] = [];

    let token = await TokenManager.getToken(context);

    // Get a docstring for each function
    await Promise.all(funcs.map(async(func: { docstring_point: [number]; name: string; params: [string]; text: string;   }) => {
        // Setup our request body
        let reqBody = {
            'format': format,
            'function': {
                function_code: func.text,
                function_name: func.name,
                function_params: func.params
            },
            'language': language,
            'sender': 'ext-vscode',
            'user_id': user
        };

        let tokenHeader = `Bearer ${token}`;

        // Send the request
        await axios({
            method: 'POST',
            url: WRITE_DOCSTRING_URL,
            data: JSON.stringify(reqBody),
            headers: {
                'Authorization': tokenHeader,
                'Content-Type': 'application/json'
            }
        })
        .then((response: any) => {
            let result = response.data;
            dataArr.push(result);
        })
        .catch((error : any) => {
            console.log(error);
            console.error(error);
        });
    }));

    return dataArr;
};

export const parseCurrentFunction = (document: string, language: string, cursor: number[]) : Promise<any> => {

    // Setup our request body
    let reqBody = {
        'cursor': cursor,
        'language': language,
        'source': document
    };

    // Send the request
    return axios({
		method: 'POST',
		url: PARSE_CURRENT_FUNCTION_URL,
		data: JSON.stringify(reqBody),
		headers: {
			'Content-Type': 'application/json'
		}
	});
}