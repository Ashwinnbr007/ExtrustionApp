import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  //Commenting out strict mode (only for dev purposes) because it renders twice on load,
  //in prod it should be fine
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)