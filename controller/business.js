// models
const Product = require("../model/product");
const Pharmacy = require("../model/pharmacy");
const User = require("../model/user");
const ChatRoom = require("../model/chatroom");
const Business = require("../model/business");
const Inventory = require("../model/inventory");
const Transactions = require("../model/transactions");

// middle wares
const error = require("../util/error-handling/errorHandler");
const io = require("../util/socket");
const { uploadImage, removeImage } = require("../util/images/images");

/*******************
 * Create Business *
 *******************/
module.exports.createBusiness = async (req, res, next) => {
  const genericName = req.body.genericName,
    brandName = req.body.brandName,
    strength = req.body.strength,
    expiryDate = req.body.expiryDate,
    date = Date.now(),
    manufacturer = req.body.manufacturer,
    locationOfPharmacy = req.body.locationOfPharmacy,
    content = req.body.content,
    userId = req._id,
    quantity = req.body.quantity,
    deadline = req.body.deadline,
    businessType = req.body.business;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // check for image
    let imageUrl, imageId;
    if (req.file) {
      const uploadedImage = await uploadImage(res, req.file.path);
      imageUrl = uploadedImage.imageUrl;
      imageId = uploadedImage.imageId;
    }

    // Add new product
    const product = new Product({
      owner: userId,
      genericName,
      brandName,
      strength,
      expiryDate,
      date,
      manufacturer,
      quantity,
      locationOfPharmacy,
    });
    await product.productImage.push({ imageUrl, imageId });

    // save new product
    const newProduct = await product.save();

    // add new demand
    const business = new Business({
      creator: userId,
      content,
      product: newProduct._id,
      deadline,
      business: businessType,
      interestedPartners: [{ user: userId }],
    });

    // push business to user businesses array
    await user.businesses.push(business._id);

    // save demand
    await business.save();
    await user.save();

    // populate product
    const businessMade = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");

    const businesses = [...businessMade].reverse();

    io.getIO().emit("business", { action: "business made", businesses });

    res.status(200).json({ message: "business created successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/***************************
 * Add Interested Partners *
 ***************************/
module.exports.addInterestedPartners = async (req, res, next) => {
  const businessId = req.params._id,
    userId = req._id,
    amount = req.body.amount;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
    }

    // validate demand
    const business = await Business.findById(businessId, "interestedPartners");
    if (!business) {
      error.errorHandler(res, "demand not found", "demand");
    }

    // check if user is already in interestedPartners array
    const alreadyInterested = business.interestedPartners.find(
      (user) => user.user._id.toString() === userId.toString()
    );
    if (alreadyInterested) {
      error.errorHandler(
        res,
        "you have already declared interest",
        "interested partner"
      );
      return;
    }

    //   continue if there are no errors

    //   create interested partner object
    const interestedPartner = {
      user: userId,
      price: amount,
    };

    //   add interested partner in interested partners array
    business.interestedPartners.push(interestedPartner);

    //   save demand to database
    await business.save();

    const biz = await Business.findById(business._id)
      .populate("creator", "firstName lastName fullName profileImage")
      .populate(
        "interestedPartners.user",
        "firstName lastName fullName profileImage"
      )
      .populate("product");

    // get all demand
    const businessMade = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");

    const businesses = [...businessMade].reverse();

    io.getIO().emit("business", { action: "partner added", businesses });
    io.getIO().emit("biz", { action: "partner added", biz });

    res.status(200).json({ message: "partner added successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/*****************************
 * Remove Interested Partner *
 *****************************/
module.exports.removeInterestedPartner = async (req, res, next) => {
  const businessId = req.params._id,
    userId = req._id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate demand
    const business = await Business.findById(businessId, "interestedPartners");
    if (!business) {
      error.errorHandler(res, "demand not found", "demand");
      return;
    }

    // check if user is in interestedPartners array of demand
    const interestedPartner = business.interestedPartners.find(
      (user) => user.user._id.toString() === userId.toString()
    );
    if (!interestedPartner) {
      error.errorHandler(res, "user not a partner", "user");
      return;
    }

    // continue if there are no errors

    // pull user from interestedPartners array
    await business.interestedPartners.pull({ user: userId });

    // save changes
    await business.save();

    io.getIO().emit("business", { action: "user removed", business });

    res.status(200).json({ message: "partner removed successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/************************
 * Change Business Status *
 ************************/
module.exports.changeBusinessStatus = async (req, res, next) => {
  const businessId = req.params._id,
    userId = req._id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate demand
    const business = await Business.findById(businessId, "status").populate(
      "creator",
      "firstName lastName profileImage"
    );
    if (!business) {
      error.errorHandler(res, "demand not found", "demand");
      return;
    }

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // check if user is demand creator
    if (business.creator._id.toString() !== userId.toString()) {
      error.errorHandler(res, "not authorized", "creator");
      return;
    }

    business.status = true;

    //  save changes
    business.save();

    io.getIO().emit("business", { action: "demand status updated", business });

    res.status(200).json({ message: "demand status updated successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/*******************************
 * Create Joint Purchase Group *
 *******************************/
module.exports.createJointPurchaseGroup = async (req, res, next) => {
  const businessId = req.params._id,
    userId = req._id,
    title = req.body.title;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate joint purchase
    const business = await Business.findById(
      businessId,
      "interestedPartners.user"
    ).populate("creator");
    if (!business) {
      error.errorHandler(res, "joint purchase not found", "joint purchase");
      return;
    }

    // check if current user is the creator of the joint purchase
    if (business.creator._id.toString() !== userId.toString()) {
      error.errorHandler(res, "not authorized", "creator");
      return;
    }

    // create a group with all interested partners
    const interestedPartners = [];
    await business.interestedPartners.map((partner) =>
      interestedPartners.push(partner.user)
    );

    const existingRoom = await ChatRoom.findOne({ title });
    if (existingRoom) {
      error.errorHandler(res, "chat room exist already", "chatroom");
      return;
    }

    // continue if there are no errors

    // create new chat room
    const newChatRoom = new ChatRoom({
      title,
      admin: userId,
      users: interestedPartners,
    });

    // save chat room
    await newChatRoom.save();

    //   push new chat room to interested partners
    interestedPartners.map(async (partner) => {
      const user = await User.findById(partner, "messages");
      await user.messages.chatroomcontent.push(newChatRoom._id);

      await user.save();
    });

    res.status(200).json({
      message: "joint purchase group created successfully",
      newChatRoom,
    });
  } catch (err) {
    error.error(err, next);
  }
};

/*********************
 * Register Pharmacy *
 *********************/
module.exports.registerPharmacy = async (req, res, next) => {
  const userId = req._id,
    businessName = req.body.businessName,
    location = req.body.location,
    contactNumber = req.body.contactNumber,
    about = req.body.about;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId, "pharmacy");
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    let imageUrl, imageId;
    if (req.file) {
      const uploadedImage = await uploadImage(res, req.file.path);
      imageUrl = uploadedImage.imageUrl;
      imageId = uploadedImage.imageId;
    }

    // create new pharmacy
    const pharmacy = new Pharmacy({
      businessName,
      location,
      logo: { imageUrl, imageId },
      contactNumber: contactNumber,
      about,
      owner: userId,
    });

    // save changes
    await pharmacy.save();

    //   add pharmacy to user
    user.pharmacy.push(pharmacy._id);
    await user.save();

    res.status(200).json({ message: "pharmacy added successfully", pharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

/*******************
 * Update Pharmacy *
 *******************/
module.exports.updatePharmacy = async (req, res, next) => {
  const pharmacyId = req.params._id,
    businessName = req.body.businessName,
    location = req.body.location,
    contactNumber = req.body.contactNumber,
    about = req.body.about,
    userId = req._id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId, "pharmacy");
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate pharmacy
    let pharmacy = await Pharmacy.findById(pharmacyId);

    let imageUrl, imageId;
    if (req.file) {
      const uploadedImage = await uploadImage(res, req.file.path);
      imageUrl = uploadedImage.imageUrl;
      imageId = uploadedImage.imageId;

      pharmacy.logo.imageUrl = imageUrl;
      pharmacy.logo.imageId = imageId;
    }

    // update pharmacy
    pharmacy.businessName = businessName;
    pharmacy.location = location;
    pharmacy.contactNumber = contactNumber;
    pharmacy.about = about;

    // save changes
    await pharmacy.save();

    res
      .status(200)
      .json({ message: "pharmacy updated successfully", pharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

/***********************
 * Get Single Pharmacy *
 ***********************/
module.exports.getPharmacy = async (req, res, next) => {
  const pharmacyId = req.params.id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    const pharmacy = await Pharmacy.findById(pharmacyId)
      .populate("inventory")
      .populate("allTransactions");
    if (!pharmacy) {
      error.errorHandler(res, "pharmacy not found", "pharmacy");
    }

    res.status(200).json({ success: true, pharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

/***************************
 * Get All User Pharmacies *
 ***************************/
module.exports.getAllUserPharmacies = async (req, res, next) => {
  const userId = req._id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    const pharmacy = await Pharmacy.find({ owner: userId });

    res.status(200).json({ success: true, pharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

/*************************
 * Add Pharmacy Pictures *
 *************************/
// module.exports.addPharmacyImages = async (req, res, next) => {
//   const pharmacyId = req.params._id,
//     userId = req._id,
//     images = req.files;

//   try {
//     // validate user
//     const user = await User.findById(userId);
//     if (!user) {
//       error.errorHandler(res, "not authorized", "user");
//       return;
//     }

//     // validate pharmacy
//     const pharmacy = await Pharmacy.findById(pharmacyId, "images");
//     if (!pharmacy) {
//       error.errorHandler(res, "pharmacy not found", "pharmacy");
//       return;
//     }

//     // uploaded image
//     if (images) {
//       images.map(async (image) => {
//         const uploadedImage = await uploadImage(image.path);
//         pharmacy.logo = {
//           imageUrl: uploadedImage.imageUrl,
//           imageId: uploadedImage.imageId,
//         };
//         await pharmacy.save();
//       });
//     }

//     res.status(200).json({ message: "image uploaded successfully" });
//   } catch (err) {
//     error.error(err, next);
//   }
// };

/*******************
 * Delete Pharmacy *
 *******************/
module.exports.deletePharmacy = async (req, res, next) => {
  const pharmacyId = req.params._id,
    userId = req._id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate user
    const user = await User.findById(userId, "pharmacy");
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate pharmacy
    const pharmacy = await Pharmacy.findById(pharmacyId);
    if (!pharmacy) {
      error.errorHandler(res, "pharmacy not found", "pharmacy");
      return;
    }

    // check if user is the owner of the pharmacy
    if (pharmacy.owner._id.toString() !== userId.toString()) {
      error.errorHandler(res, "user not authorized", "user");
      return;
    }

    // continue if there are no errors

    // delete all inventories under pharmacy
    pharmacy.inventory.map(async (invent) => {
      await Inventory.findByIdAndDelete(invent._id);
    });

    // delete pharmacy from database
    await Pharmacy.findByIdAndDelete(pharmacyId);

    // pull pharmacy from user
    await user.pharmacy.pull(pharmacyId);
    await user.save();

    res.status(200).json({ message: "pharmacy deleted successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/********************************
 * Add New Product to Inventory *
 ********************************/
module.exports.addNewProduct = async (req, res, next) => {
  const brand = req.body.brand,
    strength = req.body.strength,
    manufacturer = req.body.manufacturer,
    expiryDate = req.body.expiryDate,
    dateIn = req.body.dateIn,
    quantity = req.body.quantity,
    product = req.body.product,
    pharmacyId = req.params.pharmacyId,
    transactionDate = Date.now(),
    remark = "added";

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    const transaction = new Transactions({
      product,
      brand,
      strength,
      manufacturer,
      dateIn,
      expiryDate,
      quantity,
      transactionDate,
      remark,
    });

    const newTransaction = await transaction.save();

    const inventory = new Inventory({
      product,
      inventory: {
        brand,
        strength,
        manufacturer,
        dateIn,
        expiryDate,
        quantity,
      },
      owner: pharmacyId,
    });
    inventory.total += quantity;
    inventory.transactions.push(newTransaction._id);

    const newInventory = await inventory.save();

    const pharmacy = await Pharmacy.findById(pharmacyId).populate("inventory");
    await pharmacy.inventory.push(newInventory._id);
    await pharmacy.allTransactions.push(newTransaction._id);

    const updatedPharmacy = await pharmacy.save();

    io.getIO().emit("product", {
      action: "product added to inventory",
      updatedPharmacy,
    });

    res.status(200).json({ success: true, updatedPharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

/********************************
 * Get Single Product Inventory *
 ********************************/
module.exports.getSingleProductInventory = async (req, res, next) => {
  const inventoryId = req.params.id;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate inventory
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      error.errorHandler(res, "inventory not found", "inventory");
      return;
    }

    // continue if no errors
    res.status(200).json({ success: true, inventory });
  } catch (err) {
    error.error(err, next);
  }
};

/********************************
 * Add More Stock for a Product *
 ********************************/
module.exports.addMoreStock = async (req, res, next) => {
  const inventoryId = req.params.inventoryId,
    brand = req.body.brand,
    strength = req.body.strength,
    manufacturer = req.body.manufacturer,
    expiryDate = req.body.expiryDate,
    dateIn = req.body.dateIn,
    quantity = req.body.quantity,
    transactionDate = Date.now(),
    remark = "added";

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate product
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      error.errorHandler(res, "inventory not found", "inventory");
      return;
    }

    // continue if no errors
    const transaction = new Transactions({
      brand,
      strength,
      manufacturer,
      dateIn,
      expiryDate,
      quantity,
      transactionDate,
      remark,
    });

    const newTransaction = await transaction.save();

    await inventory.inventory.push({
      brand,
      strength,
      manufacturer,
      dateIn,
      expiryDate,
      quantity,
    });

    inventory.total += Number(quantity);

    const addedInventory = await inventory.save();

    io.getIO().emit("inventory", {
      action: "stock added successfully",
      addedInventory,
    });

    res.status(200).json({ success: true, addedInventory });
  } catch (err) {
    error.error(err, next);
  }
};

/*******************************
 * Remove Stock from a Product *
 *******************************/
module.exports.removeStock = async (req, res, next) => {
  const inventoryId = req.params.inventoryId,
    quantity = req.body.quantity;

  try {
    // Check for validation errors
    //const validatorErrors = validationResult(req);
    //error.validationError(validatorErrors, res);

    // validate product
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      error.errorHandler(res, "inventory not found", "inventory");
      return;
    }

    // continue if no errors
    // const invent = await inventory.inventory.find(
    //   (invent) => invent._id.toString() === inventId.toString()
    // );

    // if (invent.quantity < quantity) {
    //   error.errorHandler(res, "quantity to large for category", "inventory");
    //   return;
    // }
    // invent.quantity -= quantity;
    inventory.total -= Number(quantity);

    const addedInventory = await inventory.save();

    io.getIO().emit("inventory", {
      action: "stock added successfully",
      addedInventory,
    });

    res.status(200).json({ success: true, addedInventory });
  } catch (err) {
    error.error(err, next);
  }
};

/**********************
 * Get All Businesses *
 **********************/
module.exports.getAllBusinesses = async (req, res, next) => {
  try {
    // continue if there are no errors

    // get all demand
    const business = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");

    const businesses = [...business].reverse();

    res
      .status(200)
      .json({ message: "all businesses fetched successfully", businesses });
  } catch (err) {
    error.error(err, next);
  }
};

/***********************
 * Get Single Business *
 ***********************/
module.exports.getSingleBusiness = async (req, res, next) => {
  const businessId = req.params._id;

  try {
    // get and validate business
    const business = await Business.findById(businessId)
      .populate("creator", "firstName lastName fullName profileImage")
      .populate(
        "interestedPartners.user",
        "firstName lastName fullName profileImage"
      )
      .populate("product");
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    res.status(200).json({
      message: "business fetched successfully",
      business,
      type: "business",
    });
  } catch (err) {
    error.error(err, next);
  }
};
