const admin = require("firebase-admin");
const { pool } = require("../../app/config/db.config");

const sendNotification = async (tokenObj, title, body, data, type) => {
  // Convert all values in the data object to strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)])
  );

  // Extract tokens
  const { deviceToken, webToken } = tokenObj;

  // Prepare the message structure
  const message = {
    notification: {
      title,
      body,
    },
    data: stringData,
  };

  try {
    console.log("Sending Notification:", { title, body, data });

    // Array to track promises for sending notifications
    const notificationPromises = [];

    // ✅ Send to device token if available
    if (deviceToken) {
      console.log(`Sending FCM to device token: ${deviceToken}`);
      notificationPromises.push(
        admin.messaging().send({ ...message, token: deviceToken })
      );
    }

    // ✅ Send to web token if available
    if (webToken) {
      console.log(`Sending FCM to web token: ${webToken}`);
      notificationPromises.push(
        admin.messaging().send({ ...message, token: webToken })
      );
    }

    // Execute all notification sends
    const responses = await Promise.all(notificationPromises);
    console.log(responses);

    // ✅ If at least one notification was sent successfully, insert into DB
    if (responses.length > 0) {
      await pool.query(
        "INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)",
        [data.userId || null, title, body, type]
      );
      console.log("Notification record inserted successfully.");
    } else {
      console.error("Notification sending failed. Not inserting into DB.");
    }

    console.log("Notification(s) sent successfully.");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
// ✅ Export using CommonJS
module.exports = { sendNotification };
