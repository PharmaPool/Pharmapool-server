const express = require("express");
const router = express.Router();

const adminController = require("../controller/admin");

router.get("/users", adminController.getAllUsers);
router.get("/user/:id", adminController.getUser);
router.delete("/user/:id", adminController.deleteUser);

router.get("/posts", adminController.getAllPosts);
router.get("/post/:id", adminController.getPost);
router.delete("/post/:id", adminController.deletePost);

router.get("/wallets", adminController.getAllWallets);
router.get("/wallet/:id", adminController.getWallet);

router.get("/business", adminController.getBusinesses);
router.get("/business/:id", adminController.getBusiness);
router.delete("/business/:id", adminController.deleteBusiness);
router.post("/business/:id", adminController.closeBusiness);

router.get("/transactions", adminController.getTransactions);

router.get("/pharmacies", adminController.getPharmacies);
router.get("/pharmacy/:id", adminController.getPharmacy);

router.get("/inventories", adminController.getInventories);
router.get("/inventory/:id", adminController.getInventory);

module.exports = router;
