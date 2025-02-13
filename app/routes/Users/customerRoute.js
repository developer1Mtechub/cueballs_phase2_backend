const express = require("express");
const router = express.Router();
const controller = require("../../controllers/USERS/customerController");

// user
router.post("/create_account", controller.registerCustomer);
router.post("/create_subadmin", controller.registerCustomer1);
router.get("/get_subadmin", controller.get_subadmin);
router.put("/update_subadmin", controller.update_subadmin);
router.put("/update_subadmin_password", controller.update_subadmin_password);
// delete subadmin
router.post("/delete_subadmin", controller.delete_subadmin);
router.put("/sign_in", controller.signinCustomer);
router.post("/forget_password_email", controller.verifyEmail);
router.put("/verification_otp", controller.verificationOtp);
router.put("/reset_password", controller.resetPassword);
router.get("/get_specific_user_by_id", controller.getSpecificUserById);
// admin
// add_money_to_wallet
router.post("/add_money_to_wallet", controller.addMoneyToWallet);
router.put("/sign_in_admin", controller.signinAdmin);

router.post("/otpverificationresponse", controller.otpverificationresponse);
router.put("/reset_password_admin", controller.resetPasswordAdmin);
router.put(
  "/reset_password_admin_profile",
  controller.resetPasswordAdminLoggedUser
);
router.put("/update_user_name", controller.updateUserName);
router.get("/get_all_users", controller.getAllUsers);
router.get("/get_all_users_pagination", controller.getAllUsersPagination);
router.put("/update_user_account_status", controller.updateUserAccountStatus);
router.get("/get_all_deleted_users", controller.getAllDeletedUsers);
router.delete("/delete_user", controller.deleteUser);
router.get(
  "/get_all_deleted_users_pagination",
  controller.getAllDeletedUsersPagination
);
router.get("/get_users_by_year", controller.getUsersByYear);
router.get(
  "/get_top_5_recent_registered_users",
  controller.getTop5RecentRegisteredUsers
);
router.get(
  "/getUserTransactionsWithDateRange",
  controller.getUserTransactionsWithDateRange
);

router.get("/getGamesByDateRange", controller.getGamesByDateRange);
module.exports = router;
