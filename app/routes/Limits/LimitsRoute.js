const express = require("express");
const router = express.Router();
const controller = require("../../controllers/LIMITS/LimitsController");

// qr_bonus_flyer
router.post("/create_update_limit", controller.createOrUpdateLimit);
router.post("/get_limit", controller.getLimit);

module.exports = router;
