import { createRoot } from 'react-dom/client'
import MyContextProvider from './ContextAPI.jsx'
import { BrowserRouter } from 'react-router-dom'
import './main.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
   <BrowserRouter>
    <MyContextProvider>
     <App/>  
    </MyContextProvider>
  </BrowserRouter>,
)
