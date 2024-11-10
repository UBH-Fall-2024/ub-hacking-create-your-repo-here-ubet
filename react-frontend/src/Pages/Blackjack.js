import React, { useState, useEffect } from 'react';
import { useBalance } from '../BalanceContext';
import logo from '../imgs/ubhlogo.png';
import { Link } from 'react-router-dom';

function Blackjack() {
    const { balance, updateUserBalance } = useBalance();
    const [deck, setDeck] = useState([]);
    const [dealer, setDealer] = useState(null);
    const [player, setPlayer] = useState(null);
    const [wallet, setWallet] = useState(parseFloat((balance !== null && balance !== undefined ? balance.toFixed(2) : "0.00")) || 0);
    const [inputValue, setInputValue] = useState('');
    const [currentBet, setCurrentBet] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        setWallet(balance ? parseFloat(balance.toFixed(2)) : 0);
    }, [balance]);

    const makeDeck = () => {
        const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
        const suits = ['♦', '♣', '♥', '♠'];
        let newDeck = [];

        for (let card of cards) {
            for (let suit of suits) {
                newDeck.push({ number: card, suit });
            }
        }

        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
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
            count: getCount([dealerCard1.randomCard])
        };

        return { updatedDeck: playerCard2.updatedDeck, player, dealer };
    };

    const getCount = (cards) => {
        let total = 0;
        let aceCount = 0;

        for (let card of cards) {
            if (card.number === 'J' || card.number === 'Q' || card.number === 'K') {
                total += 10;
            } else if (card.number === 'A') {
                aceCount += 1;
                total += 11;
            } else if (typeof card.number === 'number') {
                total += card.number;
            }
        }

        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount -= 1;
        }

        return total;
    };

    const startNewGame = (type) => {
        const newDeck = (type === 'continue' && wallet > 0 && deck.length >= 10) ? deck : makeDeck();
        const { updatedDeck, player, dealer } = dealCards(newDeck);

        setDeck(updatedDeck);
        setDealer(dealer);
        setPlayer(player);
        setCurrentBet(null);
        setGameOver(false);
        setMessage(null);

        if (type !== 'continue') {
            setInputValue('');
        }
    };

    const placeBet = () => {
        const bet = parseInt(inputValue);
        if (bet > wallet) {
            setMessage('Insufficient funds to bet that amount.');
        } else if (bet <= 0 || bet % 1 !== 0) {
            setMessage('Please bet whole positive numbers only.');
        } else {
            setWallet(wallet - bet);
            setCurrentBet(bet);
            setInputValue('');
            setMessage(null);
        }
    };

    const hit = () => {
        if (gameOver) return setMessage('Game over! Please start a new game.');
        if (!currentBet) return setMessage('Please place a bet.');

        const { randomCard, updatedDeck } = getRandomCard(deck);
        const updatedPlayerCards = [...player.cards, randomCard];
        const updatedPlayerCount = getCount(updatedPlayerCards);

        console.log("Player's Hand after Hit:", updatedPlayerCards, "Player's Count after Hit:", updatedPlayerCount);

        setDeck(updatedDeck);
        setPlayer({
            cards: updatedPlayerCards,
            count: updatedPlayerCount
        });

        if (updatedPlayerCount > 21) {
            revealDealerHand(updatedDeck);
            setGameOver(true);
            setMessage('BUST! You lose.');
            updateUserBalance(-currentBet);
        }
    };

    const stand = () => {
        if (gameOver) return setMessage('Game over! Please start a new game.');
        if (!currentBet) return setMessage('Please place a bet.');

        let updatedDeck = deck;
        let updatedDealer = { ...dealer };

        updatedDealer.cards[1] = getRandomCard(updatedDeck).randomCard;
        updatedDeck = getRandomCard(updatedDeck).updatedDeck;
        updatedDealer.count = getCount(updatedDealer.cards);

        while (updatedDealer.count < 17) {
            const { randomCard, updatedDeck: newDeck } = getRandomCard(updatedDeck);
            updatedDealer.cards.push(randomCard);
            updatedDealer.count = getCount(updatedDealer.cards);
            updatedDeck = newDeck;

            console.log("Dealer draws:", randomCard, "Updated Dealer's Count:", updatedDealer.count);
        }

        const resultMessage = determineGameResult(updatedDealer);
        setDeck(updatedDeck);
        setDealer(updatedDealer);
        setGameOver(true);
        setMessage(resultMessage);
    };

    const revealDealerHand = (updatedDeck) => {
        let updatedDealer = { ...dealer };
        updatedDealer.cards[1] = getRandomCard(updatedDeck).randomCard;
        updatedDealer.count = getCount(updatedDealer.cards);
        setDealer(updatedDealer);
    };

    const determineGameResult = (dealer) => {
        if (dealer.count > 21) {
            setWallet(wallet + currentBet * 2);
            updateUserBalance(currentBet);
            return 'Dealer busts! You win!';
        } else if (dealer.count > player.count) {
            updateUserBalance(-currentBet);
            return 'Dealer wins.';
        } else if (dealer.count < player.count) {
            setWallet(wallet + currentBet * 2);
            updateUserBalance(currentBet);
            return 'You win!';
        } else {
            setWallet(wallet + currentBet);
            return 'Push. It\'s a tie.';
        }
    };

    const handleInputChange = (e) => setInputValue(e.target.value);

    useEffect(() => {
        startNewGame();
    }, []);

    return (
        <div>

            {/* Sidebar with UBet logo and navigation links */}
            <div className="sidebar">
            <Link to="/">
                    <img src={logo} alt="UBet Logo" className="logo" /> {/* Make logo clickable */}
            </Link>
            <h3>Navigation</h3>
                <Link to="/blackjack">Go to Blackjack</Link>
                <Link to="/plinko">Go to Plinko</Link>
            </div>

            <h1>Welcome to Blackjack</h1>
            <p>Play a game of Blackjack here!</p>

            <div className="buttons">
                <button onClick={() => startNewGame()}>New Game</button>
                <button onClick={hit}>Hit</button>
                <button onClick={stand}>Stand</button>
            </div>

            <p>Wallet: ${wallet}</p>
            {!currentBet ? (
                <div className="input-bet">
                    <input
                        type="number"
                        placeholder="Enter bet"
                        value={inputValue}
                        onChange={handleInputChange}
                    />
                    <button onClick={placeBet}>Place Bet</button>
                    {message && <p>{message}</p>}
                </div>
            ) : (
                <p>Current Bet: ${currentBet}</p>
            )}

            {currentBet && (
                <div className="game-area">
                    <div className="hand">
                        <h2>Your Hand ({player?.count})</h2>
                        <div className="cards">
                            {player?.cards.map((card, index) => (
                                <Card key={index} number={card.number} suit={card.suit} />
                            ))}
                        </div>
                    </div>

                    <div className="hand">
                        <h2>Dealer's Hand ({gameOver ? dealer?.count : '?'})</h2>
                        <div className="cards">
                            {dealer?.cards.map((card, index) => (
                                <Card key={index} number={card.number} suit={card.suit} hidden={!gameOver && index === 1} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {message && <p className="message">{message}</p>}

            {gameOver && wallet > 0 && (
                <div className="buttons">
                    <button onClick={() => startNewGame('continue')}>Continue</button>
                </div>
            )}

            {wallet <= 0 && (
                <p>You are out of funds. Please start a new game.</p>
            )}
        </div>
    );
}

const Card = ({ number, suit, hidden }) => {
    const combo = number ? `${number}${suit}` : null;
    const color = ['♦', '♥'].includes(suit) ? 'card-red' : 'card';

    return (
        <div className={color}>
            {hidden ? <div className="card-back"></div> : combo}
        </div>
    );
};

export default Blackjack;
