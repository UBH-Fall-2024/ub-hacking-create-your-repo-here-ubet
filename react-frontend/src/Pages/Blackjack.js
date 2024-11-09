import React from 'react';

function Blackjack() {
    
    // Initializers
    const [deck, setDeck] = useState([]);
    const [dealer, setDealer] = useState(null);
    const [player, setPlayer] = useState(null);
    const [wallet, setWallet] = useState(100);
    const [inputValue, setInputValue] = useState('');
    const [currentBet, setCurrentBet] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState(null);

    const makeDeck = () => {
        const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
        const suits = ['♦', '♣', '♥', '♠'];
        let newDeck = [];
    
        // make the deck
        for (let i = 0; i < cards.length; i++) {
            for (let j = 0; j < suits.length; j++) {
                newDeck.push({ number: cards[i], suit: suits[j] }); // 52 cards in the deck
            }
        }

            
        // Shuffle the deck using Fisher-Yates algorithm
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]; // Swap elements
        }
    
        return newDeck;
    };
    

    return (
        <div>
            <h1>Welcome to Blackjack</h1>
            <p>Play a game of Blackjack here!</p>
            {
            /* Add game functionality here */
            
            
            
            }
        </div>
    );
}

export default Blackjack;
