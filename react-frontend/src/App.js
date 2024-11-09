import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Homepage from './Pages/Homepage';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Homepage />} />
                {/* Add more routes here if needed */}
            </Routes>
        </Router>
    );
}

export default App;