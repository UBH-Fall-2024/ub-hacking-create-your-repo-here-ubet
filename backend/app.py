from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import datetime
import os
import requests

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb+srv://arteaga215:admin@cluster.mu9ti.mongodb.net/db"
mongo = PyMongo(app)

QUICKNODE_ENDPOINT = "https://omniscient-blissful-dinghy.solana-mainnet.quiknode.pro/10651a6d70e98220ef655b427f74ad1f3e4080d9"

@app.route('/')
def hello_world():
    return jsonify(message="Hello from Flask Backend!")

# Route to add a message to MongoDB
@app.route('/add_message', methods=['POST'])
def add_message():
    data = request.json
    message = data.get("message")
    if message:
        mongo.db.users.insert_one({
            "message": message,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        return jsonify(status="Message saved!", message=message), 201
    return jsonify(error="No message provided"), 400

@app.route('/messages', methods=['GET'])
def get_messages():
    messages = list(mongo.db.users.find({}, {"_id": 0, "message": 1, "timestamp": 1}))
    return jsonify(messages=messages)


@app.route('/add_user', methods=['POST'])
def add_user():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    solana_wallet_address = data.get("solana_wallet_address")
    balance = data.get("balance", 0)

    if email and solana_wallet_address:
        # Check if the wallet address is already registered with a different email
        existing_user = mongo.db.users.find_one(
            {"solana_wallet_address": solana_wallet_address, "email": {"$ne": email}}
        )

        if existing_user:
            # Wallet address is already linked to another account
            return jsonify(error="This wallet address is already registered with a different account."), 400

        # Update or insert the user if the wallet is not already associated with another account
        mongo.db.users.update_one(
            {"email": email},
            {"$set": {
                "username": username,
                "email": email,
                "solana_wallet_address": solana_wallet_address,
                "balance": balance
            }},
            upsert=True
        )
        return jsonify(status="User data saved!", username=username), 201

    return jsonify(error="Email or wallet address not provided"), 400

@app.route('/get_user_wallet', methods=['GET'])
def get_user_wallet():
    email = request.args.get("email")
    if not email:
        return jsonify(error="Email not provided"), 400
    
    user = mongo.db.users.find_one({"email": email}, {"_id": 0, "solana_wallet_address": 1})
    if user:
        return jsonify(walletAddress=user.get("solana_wallet_address", None)), 200
    return jsonify(walletAddress=None), 200

@app.route('/wallet_balance', methods=['GET'])
def wallet_balance():
    wallet_address = request.args.get("walletAddress")
    if not wallet_address:
        return jsonify(error="Wallet address not provided"), 400

    try:
        # Call QuickNode API to get SOL balance and token balances
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTokenAccountsByOwner",
            "params": [
                wallet_address,
                {
                    "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"  # SPL Token Program ID
                },
                {
                    "encoding": "jsonParsed"
                }
            ]
        }

        quicknode_response = requests.post(QUICKNODE_ENDPOINT, json=payload)
        
        # Print QuickNode response status and data for debugging
        print("QuickNode API response status:", quicknode_response.status_code)
        print("QuickNode API response data:", quicknode_response.text)
        
        # Check if response was successful
        if quicknode_response.status_code != 200:
            return jsonify(error="Failed to retrieve balance information from QuickNode"), 500

        quicknode_data = quicknode_response.json()

        # Retrieve SOL balance separately
        sol_balance_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [
                wallet_address
            ]
        }
        sol_balance_response = requests.post(QUICKNODE_ENDPOINT, json=sol_balance_payload)
        
        if sol_balance_response.status_code != 200:
            return jsonify(error="Failed to retrieve SOL balance"), 500

        sol_balance_data = sol_balance_response.json()
        sol_balance = sol_balance_data['result']['value'] / 1e9  # Convert lamports to SOL

        # SOL to USD conversion (using CoinGecko API)
        sol_price_response = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
        
        # Print CoinGecko response for debugging
        print("CoinGecko API response status:", sol_price_response.status_code)
        print("CoinGecko API response data:", sol_price_response.text)

        if sol_price_response.status_code != 200:
            return jsonify(error="Failed to retrieve SOL price from CoinGecko"), 500

        sol_price = sol_price_response.json()
        sol_in_usd = sol_balance * sol_price['solana']['usd']

        # Parse token balances
        token_list = []
        for account in quicknode_data['result']['value']:
            token_info = account['account']['data']['parsed']['info']

            token_balance = {}
            if token_info['mint'] == "4ZvaCuYZc5Xx3Jc8K8RsSUhyPmM1dJUueJQBFG6dpump":
                token_balance = {
                    "token_address": token_info['mint'],
                    "token_name": "UB",
                    "balance": int(token_info['tokenAmount']['amount']) / (10 ** int(token_info['tokenAmount']['decimals']))
                }                
            else:
                token_balance = {
                    "token_address": token_info['mint'],
                    "token_name": token_info.get("tokenSymbol", "Unknown"),
                    "balance": int(token_info['tokenAmount']['amount']) / (10 ** int(token_info['tokenAmount']['decimals']))
                }
                
            token_list.append(token_balance)

        return jsonify({
            "balance_in_sol": sol_balance,
            "balance_in_usd": sol_in_usd,
            "tokens": token_list
        }), 200
    except Exception as e:
        print("Unexpected error occurred in wallet_balance:", e)
        return jsonify(error="An unexpected error occurred"), 500

if __name__ == "__main__":
    app.run(debug=True)