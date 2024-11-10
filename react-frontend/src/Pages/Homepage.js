import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { useBalance } from '../BalanceContext'; //IMPORTANT

import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { Buffer } from 'buffer';
import { Link } from 'react-router-dom';

window.Buffer = Buffer;

function Homepage() {
    const { user, isAuthenticated, logout } = useAuth0();
    const { loginWithRedirect } = useAuth0();
    const { balance, setBalance } = useBalance();
    const [message, setMessage] = useState("");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [walletAddress, setWalletAddress] = useState(null);   //for phantom
    const [walletConnected, setWalletConnected] = useState(null);  //for phantom
    const [isWalletDataFetched, setIsWalletDataFetched] = useState(false); // Track if wallet data is fetched

    const [solBalance, setSolBalance] = useState(null);
    const [solBalanceInUSD, setSolBalanceInUSD] = useState(null);
    const [tokens, setTokens] = useState([]);

    const [depositAmount, setDepositAmount] = useState("");  //input field for deposit amount DO NOT USE FOR BALANCE


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


                // Fetch SOL and token balances
                const balanceResponse = await fetch(`http://localhost:5000/wallet_balance?walletAddress=${data.walletAddress}`);
                if (!balanceResponse.ok) throw new Error("Failed to fetch wallet balance");
                const balanceData = await balanceResponse.json();

                setSolBalance(balanceData.balance_in_sol);
                setSolBalanceInUSD(balanceData.balance_in_usd);
                setTokens(balanceData.tokens);

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

    const retryFetchWalletData = async (retries = 5, delay = 2000) => {
        for (let attempt = 0; attempt < retries; attempt++) {
            await new Promise(resolve => setTimeout(resolve, delay));  // Wait for the delay
            await fetchWalletData();  // Attempt to fetch wallet data
            if (tokens.length > 0) break;  // Exit if tokens are successfully updated
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

    const depositToHouseWallet = async () => {
        if (!depositAmount) {
            alert("Please enter a deposit amount.");
            return;
        }
    
        const amountInSmallestUnit = parseFloat(depositAmount) * 1e6;  // Assuming 1 UB = 1,000,000,000 smallest units
    
        if (window.solana && window.solana.isPhantom) {
            try {
                // Connect to Solana cluster
                const connection = new Connection("https://omniscient-blissful-dinghy.solana-mainnet.quiknode.pro/10651a6d70e98220ef655b427f74ad1f3e4080d9", "confirmed");
    
                // Get the public keys
                const fromPublicKey = new PublicKey(walletAddress);  // User's wallet address
                const toPublicKey = new PublicKey("46tWio1DEqRn72msURucPgGVMVoHgmEza4mxk7SeZgtn");  // House wallet address
                const mintPublicKey = new PublicKey("4ZvaCuYZc5Xx3Jc8K8RsSUhyPmM1dJUueJQBFG6dpump");  // UB token mint address
    
                // Get the associated token accounts for the user and the house wallet
                const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
                const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);
    
                // Fetch a recent blockhash
                const { blockhash } = await connection.getLatestBlockhash("confirmed");
    
                // Create transaction with transfer instruction
                const transaction = new Transaction().add(
                    createTransferInstruction(
                        fromTokenAccount,
                        toTokenAccount,
                        fromPublicKey,
                        amountInSmallestUnit,
                        [],
                        TOKEN_PROGRAM_ID
                    )
                );
    
                // Set the recent blockhash and fee payer
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = fromPublicKey;
    
                // Request the wallet to sign and send the transaction
                const { signature } = await window.solana.signAndSendTransaction(transaction);
        
                // Send the transaction ID and amount to the backend for balance update in USD
                const result = await fetch("http://localhost:5000/update_balance_in_usd", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transaction_id: signature,
                        email: user.email,
                        amount_in_sol: parseFloat(depositAmount)
                    })
                });

                const data = await result.json();
                if (data.success) {
                    alert("Deposit successful and balance updated in USD!");
                    setDepositAmount("");
                    window.location.reload();
                } else {
                    alert("Deposit verification failed. Please try again.");
                }

                // Send the transaction ID to the backend for verification
                /*
                const result = await fetch("http://localhost:5000/verify_deposit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transaction_id: signature,
                        email: user.email,
                        amount: amountInSmallestUnit
                    })
                });
    
                const data = await result.json();
                if (data.success) {
                    alert("Deposit successful!");
                    fetchWalletData();  // Refresh wallet data to update balance
                } else {
                    alert("Deposit verification failed. Please try again.");
                }*/
                
            } catch (error) {
                console.error("Transaction failed:", error);
                alert("Deposit failed. Please check your Phantom wallet.");
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
                        <div>
                            {walletAddress && (
                                <div>
                                    <p>Wallet connected: {walletAddress}</p>

                                    {/*
                                        <p>SOL Balance: {solBalance} SOL (${solBalanceInUSD} USD)</p>
                                        {tokens.length > 0 && (
                                            <div>
                                                <h3>Tokens</h3>
                                                <ul>
                                                    {tokens.map((token, idx) => (
                                                        <li key={idx}>{token.token_name}: {token.balance}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    */}
                                    <div>
                                        {balance !== null ? <p>Current Balance: ${balance.toFixed(2)} USD</p> : <p>Loading balance...</p>}
                                    </div>

                                    <div>
                                        <h3>Deposit UB Tokens</h3>
                                        <input
                                            type="number"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            placeholder="Enter amount of UB"
                                        />
                                        <button onClick={depositToHouseWallet}>Deposit UB</button>
                                    </div>                                    

                                </div>
                            )}
                        </div>
                    )}

                    </div>
                ) : (
                    <div>
                        <p>Please log in to access more features.</p>
                        <button onClick={() => loginWithRedirect()}>Log In/Sign Up</button>
                    </div>
                )}

                {/* Main Content 
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
                */}

            </div>
        </div>
    );
}

export default Homepage;
