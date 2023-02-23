var assert = require('assert');

let testModules = {
    parser: "./parser/parser-test"
}


describe("top", function(){
    Object.keys(testModules).forEach((testName) => {
        describe(testName, function() {
            require(testModules[testName]);
        });
    });
    after(function(){
        console.log("All tests done.");
    })
});

function importTest(name, path) {
    describe(name, function () {
        require(path);
    });
}