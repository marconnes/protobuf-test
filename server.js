// https://github.com/protobufjs/protobuf.js

const protobuf = require("protobufjs");
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

protobuf.load("chat.proto", (err, root) => {
    if (err) throw err;

    const ChatMessage = root.lookupType("ChatMessage");
    const Message = root.lookupType("Message");

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
            const operation = new Uint8Array(data)[0];
            const messageData = new Uint8Array(data.slice(1));

            if (operation === 0x01) { // Operação 0x01: Receber ChatMessage
                const message = ChatMessage.decode(messageData);
                console.log("Received ChatMessage:", message);

                const loremIpsum = [
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
                    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
                    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
                    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
                ];

                let index = 0;
                const intervalId = setInterval(() => {
                    if (index < loremIpsum.length) {
                        const response = Message.create({
                            messageContent: loremIpsum[index]
                        });

                        const buffer = Message.encode(response).finish();
                        const messageWithOperation = new Uint8Array(1 + buffer.length);
                        messageWithOperation[0] = 0x02; // Operação 0x02: Enviar Message
                        messageWithOperation.set(buffer, 1);

                        ws.send(messageWithOperation);
                        index++;
                    } else {
                        clearInterval(intervalId);
                    }
                }, 100); // 0.1s delay
            }
        });
    });

    server.listen(3000, () => {
        console.log("Server is listening on port 3000");
    });
});