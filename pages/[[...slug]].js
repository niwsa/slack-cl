import { createRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "styles/Home.module.scss";

export default function Home() {
  const { query } = useRouter();

  const { slug } = query;

  const roomid = slug?.[0];

  console.log(`roomId`, roomid);

  // const localUserId = useRef(null);
  const socketRef = useRef(null);
  const myPeerRef = useRef(null);
  const peers = useRef({});

  const [rooms, setRooms] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    if (videos.length !== 0) {
      videos.forEach((v) => {
        v.ref.current.srcObject = v.stream;
        v.ref.current.muted = true;
        v.ref.current.addEventListener("loadedmetadata", () => {
          v.ref.current.play();
        });
      });
    }
  }, [videos]);

  const fetchRooms = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API}/rooms`);
    if (res.ok) {
      const rooms = await res.json();
      setRooms(rooms);
    }
  };

  const createRoom = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API}/room`, {
      method: "POST",
    });
    if (res.ok) {
      await fetchRooms();
    }
  };

  function addVideo(stream, userId) {
    console.log(`adding video from ${userId}`);
    setVideos((cur) => {
      const videoInArr = cur.findIndex(
        ({ stream: vStream }) => vStream === stream
      );
      if (videoInArr !== -1) {
        console.log(`video stream already in grid`);
        return cur;
      }
      return [...cur, { stream: stream, ref: createRef() }];
    });
  }

  async function importRTClib() {
    try {
      const { socket, myPeer } = await import("lib/webRTC");
      socketRef.current = socket;
      myPeerRef.current = myPeer;

      socket.open();

      myPeer.on("open", (id) => {
        roomid && socket.emit("join-room", roomid, id);
      });

      myPeer.id && roomid && socket.emit("join-room", roomid, myPeer.id);

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          console.log(`add video L86`);
          addVideo(stream, myPeer.id);

          myPeer.on("call", (call) => {
            console.log(`answering call from ${call.peer} L90`);
            call.answer(stream);
            call.on("stream", (userVideoStream) => {
              console.log(`add video L93`);
              addVideo(userVideoStream, call.peer);
            });
          });
          socket.on("user-connected", (userId) => {
            console.log("user-connected L98 userId::", userId);
            const call = myPeer.call(userId, stream);
            call.on("stream", (userVideoStream) => {
              console.log(`add video L101`);
              addVideo(userVideoStream, userId);
              call.on("close", () => {
                console.log(`closing user stream L104`);
                userVideoStream.getTracks().forEach((track) => track.stop());
                // delVideoStream(userVideoStream);
                setVideos((cur) => {
                  const videoToDelIndex = cur.findIndex(
                    ({ stream }) => userVideoStream === stream
                  );
                  if (videoToDelIndex === -1) return cur;
                  return [
                    ...cur.slice(0, videoToDelIndex),
                    ...cur.slice(videoToDelIndex + 1),
                  ];
                });
                // delete peers.current[userId];
              });
            });

            peers.current[userId] = call;
          });
        });

      socket.on("user-disconnected", (userId) => {
        console.log(`user disconnected`);
        if (peers.current[userId]) {
          peers.current[userId].close();
          delete peers.current[userId];
        }
      });
    } catch (err) {
      console.log(`error in importRTClib call`, err);
    }
  }

  useEffect(() => {
    console.log(`calling cDM`);
    fetchRooms();
  }, []);

  useEffect(() => {
    socketRef.current?.close();
    // whenever room changes stop current running streams
    videos.forEach(({ stream }) => {
      console.log("stopping track");
      stream.getTracks().forEach((track) => track.stop());
    });
    setVideos([]);
  }, [roomid]);

  useEffect(() => {
    roomid && console.log(`called importRTClib`, roomid);
    roomid && importRTClib();
  }, [roomid]);

  return (
    <main className={styles.workspace}>
      <div className={styles.sidebar}>
        <ul className={styles.roomlist}>
          {rooms.map((r) => (
            <li key={r}>
              <Link href={`${r}`}>
                <a>{r}</a>
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" onClick={createRoom}>
          <svg viewBox="0 0 512 512">
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="32"
              d="M256 112v288m144-144H112"
            />
          </svg>
          Add Room
        </button>
        <details open>
          <summary>
            DETAILS: This app streams video from your webcam using WebRTC,
            Multiple clients can connect to a room and stream their webcam
            stream.
          </summary>
          <ul>
            <li>Click on the room in the left pane</li>
            <li>Open the same link in another window or a different device</li>
            <li>
              If no room you can add room by clicking Add Room button above
            </li>
          </ul>
        </details>
      </div>
      <div className={styles.videogrid}>
        {videos.map((v, i) => (
          <video key={i} ref={v.ref}></video>
        ))}
      </div>
    </main>
  );
}
