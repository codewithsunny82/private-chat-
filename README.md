# PrivateChat — encrypted two-person chat starter

## Run locally
1. Install Node.js 18 or newer.
2. Extract this folder and open a terminal inside it.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000` in your browser. For a two-person local test, use two browser profiles/devices that can reach the same server.
6. Both users enter the same room code (8–64 letters, numbers, `_` or `-`). Use a long random code and share it privately.

## What this starter does
- Limits each room to two simultaneous connections.
- Generates a browser-side RSA-OAEP 3072-bit key pair.
- Encrypts message text in the sender's browser using AES-GCM with a fresh key wrapped by RSA-OAEP; server relays ciphertext only.
- Does not save messages to a database or disk.
- Uses WebSocket transport and basic message size/rate limits.

## Important security limitations
This is a learning prototype, **not a production-ready secure messenger**. It does not provide a hardened login system, verified identity/fingerprint checks, forward secrecy, multi-device key management, abuse controls, audited cryptographic protocol, or reliable message delivery. The server's room code is not a substitute for user authentication, and a malicious server could substitute public keys or serve altered JavaScript. This prototype is intended for short text messages.

Before real use: deploy behind HTTPS/WSS, add strong authentication and invitation/authorization checks, verify key fingerprints out of band, use an established audited end-to-end encryption protocol/library, add security headers and operational monitoring, and commission a security review. Never claim the app is “unhackable.”
