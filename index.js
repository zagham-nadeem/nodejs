const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create a MySQL connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "chatbot",
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (message) => {
    console.log("Received message:", message);
    // Handle the received message, e.g., send notifications to the recipient
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// API endpoint to get messages between two users
app.get("/api/messages", (req, res) => {
  const { senderId, receiverId } = req.query;
  const query = `
    SELECT * FROM messages
    WHERE (sender = ${senderId} AND receiver = ${receiverId})
    OR (sender = ${receiverId} AND receiver = ${senderId})
    ORDER BY timestamp ASC
  `;
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error retrieving messages:", error);
      res.status(500).json({ error: "Failed to retrieve messages" });
    } else {
      res.json(results);
    }
  });
});

// API endpoint to send a message
app.post("/api/messages", (req, res) => {
  const { sender, receiver, message, timestamp } = req.body;
  const sql =
    "INSERT INTO messages (sender, receiver, message, timestamp) VALUES (?, ?, ?, ?)";
  const values = [sender, receiver, message, timestamp];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error sending message:", err);
      res.status(500).send("Error sending message");
    } else {
      console.log("Message sent successfully");
      res
        .status(200)
        .send({ error: false, message: "Message sent successfully" });

      // Notify the recipient using WebSocket
      const notification = {
        sender,
        message,
        timestamp,
      };
      wss.clients.forEach((client) => {
        if (client !== ws) {
          client.send(JSON.stringify(notification));
        }
      });
    }
  });
});
app.get("/api/check-messages", (req, res) => {
  const { receiverId } = req.query;
  const query = `
      SELECT DISTINCT sender FROM messages
      WHERE receiver = ${receiverId}
    `;
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error checking messages:", error);
      res.status(500).json({ error: "Failed to check messages" });
    } else {
      const senders = results.map((result) => result.sender);
      res.json(senders);
    }
  });
});

// Webhook endpoint
app.post("/webhook", (req, res) => {
  // Extract data from the request payload
  const { key } = req.body;

  // Process the data or perform any required actions
  console.log("Received data:", key);

  // Send a response (optional)
  res.status(200).json({ message: "Webhook received successfully" });
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
