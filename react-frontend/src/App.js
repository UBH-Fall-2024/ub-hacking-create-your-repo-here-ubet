import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { BalanceProvider } from './BalanceContext';
import Homepage from './Pages/Homepage';
import Blackjack from './Pages/Blackjack';


function App() {
    return (
        <Auth0Provider
            domain="dev-kb24bzbdw6k61nk2.us.auth0.com" 
            clientId="anoENGeMxqbzjceZMzuJefRZC0QmuqDh"
            redirectUri={window.location.origin}
            useRefreshTokens={true}             // Enable refresh tokens
            cacheLocation="localstorage"
        >      
            <BalanceProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Homepage />} />

                        <Route path="/blackjack" element={<Blackjack />} /> {/* Add the Blackjack route */}
                    </Routes>
                </Router>
            </BalanceProvider>
        </Auth0Provider>                
    );
}

export default App;
