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

    const getRandomCard = (deck) => {
        const randomIndex = Math.floor(Math.random() * deck.length);
        const randomCard = deck[randomIndex];
        
        const updatedDeck = [...deck.slice(0, randomIndex), ...deck.slice(randomIndex + 1)];
        return { randomCard, updatedDeck };
    };
    
    
    const dealCards = (deck) => {
        const playerCard1 = getRandomCard(deck);
        const dealerCard1 = getRandomCard(playerCard1.updatedDeck);
        const playerCard2 = getRandomCard(dealerCard1.updatedDeck);

        const playerStartingHand = [playerCard1.randomCard, playerCard2.randomCard];
        const dealerStartingHand = [dealerCard1.randomCard, {}];

        const player = {
            cards: playerStartingHand,
            count: getCount(playerStartingHand)
        };
        const dealer = {
            cards: dealerStartingHand,
            count: getCount(dealerStartingHand)
        };

        return { updatedDeck: playerCard2.updatedDeck, player, dealer };
    };

    // count cards for user and dealer
    const getCount = (cards) => {
        let total = 0;
        let aceCount = 0;
    
        // adding all non ace cards, and count number of aces
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
    
            if (card.number === 'J' || card.number === 'Q' || card.number === 'K') {
                total += 10; // jack queen king is 10
            } 
            else if (card.number === 'A') {
                aceCount += 1; // count number of aces
            } 
            else {
                total += card.number; // Add the face value of number cards (2-10)
            }
        }
    
        // handling aces
        // adding 11 if total is < 21
        // otherwise add 1
        for (let j = 0; j < aceCount; j++) {
            if (total + 11 <= 21) {
                total += 11; // add 11 if it doesn't bust
            } else {
                total += 1; // add 1
            }
        }
    
        return total;
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
