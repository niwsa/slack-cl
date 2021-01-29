import { io } from "socket.io-client";
import "peerjs";

console.log(`lib called`);
const socket = io(process.env.NEXT_PUBLIC_API);
const myPeer = new Peer(undefined, {
  host: process.env.NEXT_PUBLIC_PEER_SERVER,
  port: process.env.NEXT_PUBLIC_PEER_SERVERPORT,
  path: "/peerjs",
});

export { socket, myPeer };
