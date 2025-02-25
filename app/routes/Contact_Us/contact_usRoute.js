const express = require('express');
const router = express.Router();
const controller = require("../../controllers/CONTACT_US/contact_usController")

// contact_us 
router.post("/send_message", controller.createMessages);
router.get("/get_all_contact_us", controller.getAllMessagescreateMessages);
router.get("/get_all_contact_us_pagination", controller.getAllMessagescreateMessagesPagination);
router.get("/get_single_contact_us/:message_id", controller.getSingleMessagescreateMessages);
// addBallImages
router.post("/add_ball_images", controller.addBallImages);
router.get("/get_all_ball_images", controller.getAllBallImages);


module.exports = router;