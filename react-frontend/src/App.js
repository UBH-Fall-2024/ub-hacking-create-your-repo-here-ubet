import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Homepage from './Pages/Homepage';
import Blackjack from './Pages/Blackjack'; // Import the Blackjack component

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/blackjack" element={<Blackjack />} /> {/* Add the Blackjack route */}
            </Routes>
        </Router>
    );
}

export default App;
