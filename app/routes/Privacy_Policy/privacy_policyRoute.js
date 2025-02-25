const express = require('express');
const router = express.Router();
const controller = require("../../controllers/PRIVACY_POLICY/privacy_policyController")

// policy 
router.post("/create_update_policy", controller.create_update_policy);
router.post("/create_update_terms", controller.create_update_terms);
// terms 
router.get("/get", controller.getPrivacyPolicy);
router.get("/getTerms", controller.getTerms);
//social links 
router.post("/create_update_social_links", controller.create_update_social_links);
router.get("/getSocialLinks", controller.getSocialLinks);
// website support emails 
router.post("/create_update_support_email", controller.create_update_support_email);
router.get("/getSupportEmail", controller.getSupportEmail);
// website downloads buttons urls 
router.post("/create_update_download_buttons", controller.create_update_download_buttons);
router.get("/getDownloadButtons", controller.getDownloadButtons);
module.exports = router;