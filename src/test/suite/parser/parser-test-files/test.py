
def foo(): 
    """
    a
    """
    return "a"
    def foobar():
        """
        b
        """
        return foo() + bar()


def foo(): 
    return "a"
    def foobar():
        return foo() + bar()