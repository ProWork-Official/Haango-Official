import { createContext, useState,  } from 'react';
export const MyContext = createContext(null);

const MyContextProvider = (props) =>{

    const [error, setErrors] = useState({})
   
   
    const contextValue = {

        error, setErrors,
    }

    return(
        <MyContext.Provider value={contextValue}>
            {props.children}
        </MyContext.Provider>
    )
}
export default MyContextProvider;
