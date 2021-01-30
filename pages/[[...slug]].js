import { createRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "styles/Home.module.scss";

// function waitForAllICE(pc, destination) {
//   return new Promise((resolve, reject) => {
//     pc.onicecandidate = (iceEvent) => {
//       if (iceEvent.candidate === null) {
//         console.log(`gathering complete`);
//         resolve();
//       } else {
//         console.log(`ICE CANDIDATE`, iceEvent.candidate);
//         destination.addIceCandidate(iceEvent.candidate).catch((e) => {
//           console.log("Failure during addIceCandidate(): ", e);
//           resolve();
//         });
//       }
//     };
//     setTimeout(() => reject("Waited a long time for ice candidates..."), 10000);
//   });
// }

export default function Home() {
  const { query } = useRouter();

  const { slug } = query;

  const roomid = slug?.[0];

  console.log(`roomId`, roomid);

  // async function setupRTC() {
  //   try {
  //     lc.current = new RTCPeerConnection();
  //     rc.current = new RTCPeerConnection();
  //     lc.current.oniceconnectionstatechange = (e) =>
  //       console.log(lc.current.iceConnectionState);
  //     rc.current.oniceconnectionstatechange = (e) =>
  //       console.log(rc.current.iceConnectionState);

  //     bobHandle.current = lc.current.createDataChannel("channel");

  //     bobHandle.current.onopen = () => {
  //       console.log("Local channel open!");
  //       rc.current.ondatachannel = ({ channel }) => {
  //         console.log(`channel`, channel);
  //         channel.onopen = () => {
  //           aliceHandle.current = channel;
  //           console.log(`onRemoteDataChannel:`, aliceHandle.current);
  //           aliceHandle.current.onmessage = (e) => {
  //             console.log("received message from Bob", e.data);
  //             setThread((t) => [...t, { text: e.data, author: "Bob" }]);
  //           };
  //           aliceHandle.current.onclose = () => {
  //             console.log("Remote channel closed!");
  //           };
  //         };
  //       };
  //     };

  //     bobHandle.current.onclose = () => {
  //       console.log("Local channel closed!");
  //     };

  //     bobHandle.current.onmessage = (e) => {
  //       console.log("received message from Alice", e.data);
  //       setThread((t) => [...t, { text: e.data, author: "Alice" }]);
  //     };

  //     const initLocalOffer = async () => {
  //       const localOffer = await lc.current.createOffer();
  //       console.log(`Got local offer`, localOffer);
  //       const localDesc = await lc.current.setLocalDescription(localOffer);
  //       const remoteDesc = await rc.current.setRemoteDescription(localOffer);
  //       // return Promise.all([localDesc,iceGathering, remoteDesc]);
  //     };

  //     const initRemoteAnswer = async () => {
  //       const remoteAnswer = await rc.current.createAnswer();
  //       console.log(`Got remote answer`, remoteAnswer);
  //       const localDesc = await rc.current.setLocalDescription(remoteAnswer);
  //       const remoteDesc = await lc.current.setRemoteDescription(remoteAnswer);
  //     };

  //     await initLocalOffer();
  //     await waitForAllICE(lc.current, rc.current);
  //     await initRemoteAnswer();
  //     await waitForAllICE(rc.current, lc.current);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }

  // const webRTCInit = async () => {
  // await import("webrtc-adapter");
  // await setupRTC();
  // try {
  //   const videoStream = await navigator.mediaDevices.getUserMedia(
  //     mediaStreamConstraints
  //   );
  //   bobVideoRef.current.srcObject = videoStream;
  //   aliceVideoRef.current.srcObject = videoStream;
  //   lc.current.addStream(videoStream);
  // } catch (err) {
  //   console.error(err);
  // }
  // };

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

  function addVideo(stream) {
    setVideos((cur) => {
      const videoInArr = cur.findIndex(
        ({ stream: vStream }) => vStream === stream
      );
      if (videoInArr !== -1) {
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
          console.log(`add video L168`);
          addVideo(stream);

          myPeer.on("call", (call) => {
            console.log(`answering call from ${call.peer} L172`);
            call.answer(stream);
            call.on("stream", (userVideoStream) => {
              console.log(`add video L175`);
              addVideo(userVideoStream);
            });
          });
          socket.on("user-connected", (userId) => {
            console.log("user-connected L180 userId::", userId);

            const call = myPeer.call(userId, stream);
            call.on("stream", (userVideoStream) => {
              console.log(`add video L185`);
              addVideo(userVideoStream);
              call.on("close", () => {
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
    roomid && console.log(`called importRTClib`, roomid);
    roomid && importRTClib();
  }, [roomid]);

  useEffect(() => {
    if (!roomid) {
      videos.forEach(({ stream }) => {
        console.log("stopping track");
        stream.getTracks().forEach((track) => track.stop());
      });
      setVideos([]);
    }
  }, [roomid]);

  // useEffect(() => {
  //   myPeerRef.current?.id &&
  //     roomid &&
  //     socketRef.current.emit("join-room", roomid, myPeerRef.current.id);
  // }, [roomid]);

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
            stream.````
          </summary>
          <ul>
            <li>Click on the room in the left pane</li>
            <li>Open the same link in another window/tab</li>
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
      {/* <video
            ref={bobVideoRef}
            style={{ maxHeight: "200px" }}
            muted={true}
          ></video>
          <video
            ref={aliceVideoRef}
            style={{ maxHeight: "200px" }}
            muted={true}
          ></video> */}
      {/* <div className={styles.txteditor}>
            <textarea
              value={bobMsgVal}
              onChange={({ target: { value } }) => {
                setBobMsgVal(value);
              }}
              ref={bobTxtArea}
              wrap="off"
            ></textarea>
            <div className={styles.actionBar}>
              <button
                aria-label="Send message"
                className={styles.send}
                onClick={() => {
                  bobMsgVal && bobHandle.current.send(bobMsgVal);
                  setBobMsgVal("");
                }}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 12l-4 9 20-9H6zM2 3l4 9h16L2 3z"
                    fill="transparent"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div> */}
      {/* <div className={styles.alice}>
          <section>
            {thread.map(({ text, author }, index) => (
              <div key={index}>
                {author}: {text}
              </div>
            ))}
          </section>
          <video
            ref={aliceVideoRef}
            autoPlay
            style={{ maxHeight: "200px" }}
          ></video>

          <div className={styles.txteditor}>
            <textarea
              value={aliceMsgVal}
              onChange={({ target: { value } }) => {
                setAliceMsgVal(value);
              }}
              ref={aliceTxtArea}
            ></textarea>
            <div className={styles.actionBar}>
              <button
                aria-label="Send message"
                className={styles.send}
                onClick={() => {
                  aliceMsgVal && aliceHandle.current.send(aliceMsgVal);
                  setAliceMsgVal("");
                }}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 12l-4 9 20-9H6zM2 3l4 9h16L2 3z"
                    fill="transparent"
                    stroke="currentColor"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div> */}
    </main>
  );
}
