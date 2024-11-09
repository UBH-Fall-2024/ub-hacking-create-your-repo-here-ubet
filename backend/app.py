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

if __name__ == "__main__":
    app.run(debug=True)