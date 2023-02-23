
let parserTests = {
    java: "./langs/java-test",
    python: "./langs/python-test",
    csharp: "./langs/csharp-test",
    javascript: "./langs/javascript-test"
}

Object.keys(parserTests).forEach((testName) => {
    describe(testName, function(){
        require(parserTests[testName]);
    });

});
after(function(){
    console.log("Finsihed Parser Tests");
})