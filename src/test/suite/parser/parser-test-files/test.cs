class Program  
      {  
         /// <summary> The square function returns the square of a given number.</summary>
         ///
         /// <param name="int nmbr"> The number to be squared</param>
         ///
         /// <returns> The value of the square of the given number</returns>
         public void square(int nmbr)  
         {  
             int sq = nmbr * nmbr;
             Console.WriteLine("Square of the given number is  " + sq);  
              
             // Don’t provide any return statement  
          }  
 
         public static void Main(string[] args)  
         {  
            Program pr = new Program(); // Creating a class Object  
            pr.square( 2); //calling the method
         }  

         public void square(int nmbr)  
         {  
             int sq = nmbr * nmbr;
             Console.WriteLine("Square of the given number is  " + sq);  
              
             // Don’t provide any return statement  
          }  

         public static void Main(string[] args)  
         {  
            Program pr = new Program(); // Creating a class Object  
            pr.square( 2); //calling the method
         }  
    }