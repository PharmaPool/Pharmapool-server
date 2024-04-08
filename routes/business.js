const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "../uploads" });

const businessController = require("../controller/business");

router.get("/", businessController.getAllBusinesses);
router.get("/:_id", businessController.getSingleBusiness)
router.post(
  "/:_id",
  upload.single("file"),
  businessController.createBusiness
);
router.post("/user/:_id", businessController.addInterestedPartners);
router.delete("/user/:_id", businessController.removeInterestedPartner);
router.patch("/status/:_id", businessController.changeBusinessStatus);

router.post(
  "/pharmacy/:_id",
  upload.single("file"),
  businessController.registerPharmacy
);
router.patch(
  "/pharmacy/:_id",
  upload.single("file"),
  businessController.addPharmacyImages
);
router.delete("/pharmacy/:_id", businessController.deletePharmacy);

module.exports = router;
