const express = require('express');
const router = express.Router();
const controller = require("../../controllers/TRANSACTION_HISTORY/transactionHistoryController")


router.get("/get_transactions_by_user_id", controller.getAllTransactionsByUserId);
router.post("/create_transaction_history", controller.createTransactionHistory);
router.get("/get_wallet_value_by_user_id", controller.getWalletValueByUserId);




module.exports = router;