// External imports
const axios = require('axios').default;


// Internal imports
import './conf';
import { WRITE_DOCSTRING_URL, PARSE_FUNCTIONS_URL, PARSE_CURRENT_FUNCTION_URL } from './conf';

export const requestDocstrings = async(funcs: any, user: string, language: string): Promise<any>  => {

    let functionDocstrings: { docstring: string; point: [number]; }[] = [];

    // Get a docstring for each function
    // eslint-disable-next-line @typescript-eslint/naming-convention
    await Promise.all(funcs.map(async(func: { docstring_point: [number]; name: string; params: [string]; text: string;   }) => {
        // Setup our request body
        let reqBody = {
            'language': language,
            'sender': 'ext-vscode',
            'snippet': func.text,
            'name': func.name,
            'params': func.params,
            'user': user,
        };

        // Send the request based on the language
        await axios({
            method: 'POST',
            url: WRITE_DOCSTRING_URL,
            data: JSON.stringify(reqBody),
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json'
            }
        })
        .then((response: any) => {
            let result = response.data;

            if(result.docstring !== null) {

                // Quickly setup our docstring editor
                let docstring = result.docstring;
                functionDocstrings.push({"docstring": docstring, "point": func.docstring_point});
            }
        })
        .catch((error : any) => {
            console.error(error);
        });
    }));

    return functionDocstrings;
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
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/json'
		}
	});
}