from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb+srv://arteaga215:admin@cluster.mu9ti.mongodb.net/db"
mongo = PyMongo(app)

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

if __name__ == "__main__":
    app.run(debug=True)