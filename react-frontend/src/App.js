import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import Homepage from './Pages/Homepage';

function App() {
    return (
        <Auth0Provider
            domain="dev-kb24bzbdw6k61nk2.us.auth0.com" 
            clientId="anoENGeMxqbzjceZMzuJefRZC0QmuqDh"
            redirectUri={window.location.origin}
        >      
            <Router>
                <Routes>
                    <Route path="/" element={<Homepage />} />

                    {/* Add more routes here if needed */}
                </Routes>
            </Router>
        </Auth0Provider>                
    );
}

export default App;