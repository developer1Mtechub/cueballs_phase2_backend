const express = require("express");
const router = express.Router();
const controller = require("../../controllers/QR_BONUS_FLYER/qr_bonus_flyerController");

// qr_bonus_flyer
router.post("/create_qr_bonus_flyer", controller.createqr_bonus_flyer);
// validate bonus fyer
router.post("/validate_bonus_flyer", controller.validate_bonus_flyer);
router.post("/apply_bonus_flyer", controller.apply_bonus_flyer);

router.get("/get_all_qr_bonus_flyer", controller.getAllqr_bonus_flyer);
router.get(
  "/get_all_qr_bonus_flyer_pagination",
  controller.getAllqr_bonus_flyerPagination
);
router.get(
  "/get_single_qr_bonus_flyer/:qr_bonus_flyer_id",
  controller.getSingleqr_bonus_flyer
);
router.post("/update_qr_bonus_flyer", controller.updateqr_bonus_flyer);
router.post("/delete_qr_bonus_flyer", controller.deleteqr_bonus_flyer);
module.exports = router;
