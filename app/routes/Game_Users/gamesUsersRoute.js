const express = require("express");
const router = express.Router();
const controller = require("../../controllers/GAME_USERS/gameUsersController");

// games
router.post("/participate", controller.createGameUser);
router.post("/participate-v2", controller.createGameUserV2);

router.get("/get_game_details", controller.getGameUserByGameId);

module.exports = router;
