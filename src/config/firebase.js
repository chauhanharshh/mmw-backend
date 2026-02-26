import admin from "firebase-admin";
import config from "./index.js";

// Provide credentials from configuration
const serviceAccount = {
  project_id: config.firebase.projectId,
  client_email: config.firebase.clientEmail,
  private_key: (config.firebase.privateKey || "").replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Initialized");
}

export default admin;
