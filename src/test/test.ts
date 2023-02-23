import 'mocha'

let testModules: {[key: string]: string} = {
    parser: "./parser/parser-test"
}


describe("tests", function(){
    Object.keys(testModules).forEach((testName) => {
        describe(testName, function() {
            require(testModules[testName]);
        });
    });
    after(function(){
        console.log("All tests done.");
    })
});

function importTest(name: string, path: string) {
    describe(name, function () {
        require(path);
    });
}