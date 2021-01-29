import { io } from "socket.io-client";
import "peerjs";

console.log(`lib called`);
const socket = io("http://localhost:9000");
const myPeer = new Peer(undefined, {
  host: "localhost",
  port: "9000",
  path: "/peerjs",
});

export { socket, myPeer };
