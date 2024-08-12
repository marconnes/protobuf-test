// https://github.com/protobufjs/protobuf.js

const protobuf = require("protobufjs");
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

protobuf.load("chat.proto", (err, root) => {
    if (err) throw err;

    const ChatMessage = root.lookupType("ChatMessage");

    const server = http.createServer((req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === "GET" && (req.url === "/chat.proto" || req.url === "/protobuf.min.js")) {
            const filePath = path.join(__dirname, req.url);
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.end("Internal Server Error");
                    return;
                }

                console.log(req.url)

                res.setHeader("Cache-Control", "public, max-age=86400"); // 1 dia
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end(data);
            });
        } else {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    });

    const wss = new WebSocket.Server({ server });

    wss.on("connection", ws => {
        ws.on("message", data => {
            const message = ChatMessage.decode(new Uint8Array(data));
            console.log("Received message:", message);

            const response = ChatMessage.create({
                chatId: message.chatId,
                systemPrompt: "Response",
                chatModel: "idk",
                messages: [
                    { messageContent: "Message received", userType: 2 }
                ]
            });

            const buffer = ChatMessage.encode(response).finish();
            ws.send(buffer);
        });
    });

    server.listen(3000, () => {
        console.log("Server is listening on port 3000");
    });
});