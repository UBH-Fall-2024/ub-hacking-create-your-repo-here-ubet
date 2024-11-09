import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Homepage() {
    const [message, setMessage] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch("http://localhost:5000/messages");
            if (!response.ok) throw new Error("Failed to fetch messages");
            const data = await response.json();
            setMessages(data.messages);
        } catch (error) {
            console.error("Fetch error:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (input) {
            try {
                const response = await fetch("http://localhost:5000/add_message", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ message: input })
                });
                if (!response.ok) throw new Error("Failed to add message");

                setInput("");
                fetchMessages();  // Refresh the messages list
            } catch (error) {
                console.error("Fetch error:", error);
            }
        }
    };

    return (
        <div style={{ display: "flex" }}>
            {/* Sidebar with the link to Blackjack */}
            <div style={{ marginRight: "20px", width: "150px" }}>
                <h3>Navigation</h3>
                <Link to="/blackjack">Go to Blackjack</Link>
            </div>

            {/* Main Content */}
            <div>
                <h1>Hello from React Frontend</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter a message"
                    />
                    <button type="submit">Submit</button>
                </form>
                <h2>Messages</h2>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>
                            {msg.message} (at {new Date(msg.timestamp).toLocaleString()})
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Homepage;
