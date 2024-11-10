from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import datetime
import requests

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb+srv://arteaga215:admin@cluster.mu9ti.mongodb.net/db"
mongo = PyMongo(app)

house_wallet_address = "46tWio1DEqRn72msURucPgGVMVoHgmEza4mxk7SeZgtn"
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

@app.route('/update_balance_in_usd', methods=['POST'])
def update_balance_in_usd():
    data = request.json
    transaction_id = data.get("transaction_id")
    email = data.get("email")
    amount_in_sol = data.get("amount_in_sol")

    try:
        # Get the current SOL-to-USD price from CoinGecko
        sol_price_response = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
        if sol_price_response.status_code != 200:
            return jsonify(error="Failed to retrieve SOL price from CoinGecko"), 500

        sol_price = sol_price_response.json().get("solana", {}).get("usd", 0)
        if sol_price == 0:
            return jsonify(error="Invalid SOL price received from CoinGecko"), 500

        # Calculate the amount in USD
        amount_in_usd = amount_in_sol * sol_price

        # Update the user's balance in MongoDB
        mongo.db.users.update_one(
            {"email": email},
            {"$inc": {"balance": amount_in_usd}}
        )

        return jsonify(success=True, message="Balance updated successfully in USD"), 200

    except Exception as e:
        print("Unexpected error in update_balance_in_usd:", e)
        return jsonify(error="An unexpected error occurred"), 500

@app.route('/get_balance', methods=['GET'])
def get_balance():
    email = request.args.get("email")
    if not email:
        return jsonify(error="Email not provided"), 400
    
    user = mongo.db.users.find_one({"email": email}, {"_id": 0, "balance": 1})
    if user and "balance" in user:
        return jsonify(balance=user["balance"]), 200
    else:
        return jsonify(balance=0), 200  #return 0 if no balance found for user

@app.route('/update_balance', methods=['POST'])
def update_balance():
    data = request.json
    email = data.get("email")
    amount = data.get("amount")

    if not email or amount is None:
        return jsonify(error="Email or amount not provided"), 400

    # Update the user's balance in MongoDB
    mongo.db.users.update_one(
        {"email": email},
        {"$inc": {"balance": amount}}
    )

    return jsonify(success=True, message="Balance updated successfully"), 200

''' potential in this method but doesnt work properly on successful transaction
@app.route('/verify_deposit', methods=['POST'])
def verify_deposit():
    data = request.json
    transaction_id = data.get("transaction_id")
    email = data.get("email")
    amount = data.get("amount")

    try:
        # Check the transaction using QuickNode
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getConfirmedTransaction",
            "params": [transaction_id, "jsonParsed"]
        }
        quicknode_response = requests.post(QUICKNODE_ENDPOINT, json=payload)
        
        # Debugging information
        print("QuickNode response:", quicknode_response.status_code, quicknode_response.text)

        if quicknode_response.status_code != 200:
            return jsonify(error="Failed to retrieve transaction information from QuickNode"), 500

        transaction_data = quicknode_response.json()

        # Verify that the transaction transferred UB tokens to the house wallet
        instructions = transaction_data['result']['transaction']['message']['instructions']
        for instruction in instructions:
            if (
                instruction['program'] == "spl-token" and
                instruction['parsed']['info']['destination'] == house_wallet_address and
                instruction['parsed']['info']['mint'] == "4ZvaCuYZc5Xx3Jc8K8RsSUhyPmM1dJUueJQBFG6dpump" and
                int(instruction['parsed']['info']['amount']) == amount
            ):
                # Update the user's balance in MongoDB
                mongo.db.users.update_one(
                    {"email": email},
                    {"$inc": {"balance": amount}}
                )
                return jsonify(success=True, message="Deposit verified"), 200

        return jsonify(success=False, message="Deposit verification failed"), 400
    except Exception as e:
        print("Unexpected error in verify_deposit:", e)
        return jsonify(error="An unexpected error occurred"), 500
'''

if __name__ == "__main__":
    app.run(debug=True)