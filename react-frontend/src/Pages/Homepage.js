import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';

function Homepage() {
    const { user, isAuthenticated, logout } = useAuth0();
    const { loginWithRedirect } = useAuth0();
    const [message, setMessage] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [walletAddress, setWalletAddress] = useState(null);   //for phantom
    const [walletConnected, setWalletConnected] = useState(null);  //for phantom
    const [isWalletDataFetched, setIsWalletDataFetched] = useState(false); // Track if wallet data is fetched


    useEffect(() => {
        fetchMessages();

        if (isAuthenticated) {
            fetchWalletData();
        }

    }, [isAuthenticated]);

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
                fetchMessages();
            } catch (error) {
                console.error("Fetch error:", error);
            }
        }
    };
    const fetchWalletData = async () => {
        try {
            const response = await fetch(`http://localhost:5000/get_user_wallet?email=${user.email}`);
            if (!response.ok) throw new Error("Failed to fetch wallet data");
            const data = await response.json();
    
            if (data.walletAddress) {
                setWalletAddress(data.walletAddress);
                setWalletConnected(true);
                localStorage.setItem("walletAddress", data.walletAddress);
                localStorage.setItem("walletConnected", "true");
            } else {
                setWalletAddress(null);
                setWalletConnected(false);
                localStorage.removeItem("walletAddress");
                localStorage.removeItem("walletConnected");
            }
            setIsWalletDataFetched(true); // Mark data as fetched here
        } catch (error) {
            console.error("Error fetching wallet data:", error);
        }
    };

    //must ONLY be called after a user has been logged in
    const connectWallet = async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                const response = await window.solana.connect();
                const walletAddr = response.publicKey.toString();
                
                // Check if wallet address is already connected to another account
                const result = await fetch("http://localhost:5000/add_user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: user?.name,
                        email: user?.email,
                        solana_wallet_address: walletAddr,
                        balance: 0
                    })
                });
    
                const data = await result.json();
                if (!result.ok) {
                    // Display error message if wallet is already linked to another account
                    alert(data.error);
                    return;
                }
    
                // If successful, set wallet information in state and local storage
                setWalletAddress(walletAddr);
                setWalletConnected(true);
                localStorage.setItem("walletAddress", walletAddr);
                localStorage.setItem("walletConnected", "true");
    
                alert("Wallet connected successfully!");
            } catch (error) {
                console.error("Wallet connection failed:", error);
            }
        } else {
            alert("Please install Phantom Wallet!");
        }
    };

    return (
        <div>
            {isAuthenticated ? (
                <div>
                    {/* Sidebar with the link to Blackjack and Plinko */}
                    <h3>Navigation</h3>
                    <Link to="/blackjack">Go to Blackjack</Link><br />
                    <Link to="/plinko">Go to Plinko</Link>
                </div>
            ) : (
                <div></div>
            )}

            {/* Main Content */}
            <div>
                <h1>Hello from React Frontend</h1>

                {isAuthenticated ? (
                    <div>
                        <p>Welcome, {user.name}</p>

                        <button onClick={() => {
                        // Clear local storage on logout
                        localStorage.removeItem("walletAddress");
                        localStorage.removeItem("walletConnected");
                        setWalletAddress(null);
                        setWalletConnected(false);
                        setIsWalletDataFetched(false);
                        logout({ returnTo: window.location.origin });
                    }}>
                            Sign Out
                        </button>

                    {isWalletDataFetched && (!walletAddress) ? (
                        <button onClick={connectWallet}>Connect Phantom Wallet</button>
                    ) : (
                        walletAddress && <p>Wallet connected: {walletAddress}</p>
                    )}

                    </div>
                ) : (
                    <div>
                        <p>Please log in to access more features.</p>
                        <button onClick={() => loginWithRedirect()}>Log In/Sign Up</button>
                    </div>
                )}

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
