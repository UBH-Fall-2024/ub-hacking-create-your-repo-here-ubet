import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const BalanceContext = createContext();

//custom hook to access the BalanceContext
export const useBalance = () => {
    return useContext(BalanceContext);
};

export const BalanceProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth0();
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUserBalance();
        } else {
            setBalance(null); //reset balance when user is logged out
        }
    }, [isAuthenticated]);

    const fetchUserBalance = async () => {
        try {
            const response = await fetch(`http://localhost:5000/get_balance?email=${user.email}`);
            if (!response.ok) throw new Error("Failed to fetch balance data");
            const data = await response.json();

            setBalance(data.balance); //set balance from response
        } catch (error) {
            console.error("Error fetching balance:", error);
        }
    };

    const updateUserBalance = async (amount) => {
        try {
            const response = await fetch("http://localhost:5000/update_balance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email, amount })
            });
            if (!response.ok) throw new Error("Failed to update balance");
            await fetchUserBalance();  // Refresh balance after update
        } catch (error) {
            console.error("Error updating balance:", error);
        }
    };

    return (
        <BalanceContext.Provider value={{ balance, updateUserBalance }}>
            {children}
        </BalanceContext.Provider>
    );
};
