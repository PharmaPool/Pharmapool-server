const express = require("express");
const router = express.Router();
const userController = require("../controller/user");
const multer = require("multer");

const upload = multer({ dest: "../uploads" });

router.post("/post", upload.single("file"), userController.createPost);

module.exports = router;
