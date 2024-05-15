const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "../uploads" });

const businessController = require("../controller/business");

router.get("/", businessController.getAllBusinesses);
router.get ("/:_id", businessController.getSingleBusiness)
router.post(
  "/:_id",
  upload.single("file"),
  businessController.createBusiness
);
router.post("/user/:_id", businessController.addInterestedPartners);
router.delete("/user/:_id", businessController.removeInterestedPartner);
router.patch("/status/:_id", businessController.changeBusinessStatus);
router.post("/group/:_id", businessController.createJointPurchaseGroup)

router.get("/pharmacy/:id", businessController.getPharmacy)
router.get("/pharmacies/:_id", businessController.getAllUserPharmacies)
router.post(
  "/pharmacy/:_id",
  upload.single("file"),
  businessController.registerPharmacy
);
router.delete("/pharmacy/:_id", businessController.deletePharmacy);

router.post("/inventory/addproduct/:pharmacyId", businessController.addNewProduct)
router.post("/inventory/addstock/:inventoryId", businessController.addMoreStock);
router.delete("/inventory/removestock/:inventoryId", businessController.removeStock)
router.get("/inventory/:id", businessController.getSingleProductInventory)

module.exports = router;
