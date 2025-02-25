const express = require('express');
const router = express.Router();
const controller = require("../../controllers/FEEDBACK/feedbackController")

// feedback 
router.post("/create_feedback", controller.createFeedback);
router.get("/get_all_feedback", controller.getAllFeedback);
router.get("/get_all_feedback_pagination", controller.getAllFeedbackPagination);
router.get("/get_single_feedback/:feedback_id", controller.getSingleFeedback);

router.get("/get_dashboard_counts", controller.getActiveUsersCount);
router.get("/get_single_user_played_games_and_win_games_by_user_id", controller.getSingleUserPlayedGamesAndWinGamesByUserId);
router.post("/create_app_share_link", controller.createAppShareLink);
router.get("/get_app_share_link", controller.getAppShareLink);
// getCompletedGamesCommisionWinningAmountSum
router.get("/get_completed_games_commision_winning_amount_sum", controller.getCompletedGamesCommisionWinningAmountSum);

module.exports = router;