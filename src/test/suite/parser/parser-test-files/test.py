
def foo(): 
    """
    a
    """
    def foobar():
        """
        b
        """
        return foo() + bar()
    return "a"


def foo(): 
	def foobar():
        return "b"
    return "a"