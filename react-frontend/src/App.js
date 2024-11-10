import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import Homepage from './Pages/Homepage';
import Blackjack from './Pages/Blackjack';
import Plinko from './Pages/Plinko'; 

function App() {
    return (
        <Auth0Provider
            domain="dev-kb24bzbdw6k61nk2.us.auth0.com" 
            clientId="anoENGeMxqbzjceZMzuJefRZC0QmuqDh"
            redirectUri={window.location.origin}
            useRefreshTokens={true}             // Enable refresh tokens
            cacheLocation="localstorage"
        >      
            <Router>
                <Routes>
                    <Route path="/" element={<Homepage />} />
                    <Route path="/blackjack" element={<Blackjack />} /> {/* Blackjack route */}
                    <Route path="/plinko" element={<Plinko />} /> {/* Plinko route */}
                </Routes>
            </Router>
        </Auth0Provider>                
    );
}

export default App;
