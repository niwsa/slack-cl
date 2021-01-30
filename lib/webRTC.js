import { io } from "socket.io-client";
import "peerjs";

console.log(`lib called`);
const socket = io(process.env.NEXT_PUBLIC_API, { autoConnect: false });
const myPeer = new Peer(undefined, {
  debug: process.env.NEXT_PUBLIC_PEERJS_DEBUG,
});

export { socket, myPeer };
