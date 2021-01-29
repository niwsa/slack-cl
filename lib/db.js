import firebase from "./firebase";

const db = firebase.firestore();

export async function createRoomInDb(roomWithOffer) {
  return await db.collection("rooms").add(roomWithOffer);
}

export function createSite(data) {
  const site = db.collection("sites").doc();
  site.set(data);

  return site;
}
