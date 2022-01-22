// External imports
const axios = require('axios').default;


// Internal imports
import './conf';
import { GENERATE_PYTHON_DOCSTRING_URL, GENERATE_JAVASCRIPT_DOCSTRING_URL, PARSE_FUNCTIONS_URL } from './conf';

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

        // Hey Han & Hahnbee! Funny seeing you here - hope Mintlify is doing well! We should re-connect sometime.

        // Send the request based on the language
        if(language === "python") {
            // Python
            await axios({
                method: 'POST',
                url: GENERATE_PYTHON_DOCSTRING_URL,
                data: JSON.stringify(reqBody),
                headers: {
                    //'X-Trelent-API-Key': key,
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
        }
        else if(language === "javascript") {
            // JS
            await axios({
                method: 'POST',
                url: GENERATE_JAVASCRIPT_DOCSTRING_URL,
                data: JSON.stringify(reqBody),
                headers: {
                    //'X-Trelent-API-Key': key,
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
        }
        else {
            // Default to Python
            await axios({
                method: 'POST',
                url: GENERATE_PYTHON_DOCSTRING_URL,
                data: JSON.stringify(reqBody),
                headers: {
                    //'X-Trelent-API-Key': key,
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
        }
    }));

    return functionDocstrings;
};

export const parseSnippet = async(snippet: string, language: string): Promise<any> => {

    // Setup our request body
    let reqBody = {
        'source': snippet,
        'language': language
    };

    // Send the request
    return axios({
		method: 'POST',
		url: PARSE_FUNCTIONS_URL,
		data: JSON.stringify(reqBody),
		headers: {
			//'X-Trelent-API-Key': key,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/json'
		}
	});
};