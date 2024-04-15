// models
const Product = require("../model/product");
const Pharmacy = require("../model/pharmacy");
const User = require("../model/user");
const ChatRoom = require("../model/chatroom");
const Business = require("../model/business");

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
    userId = req.params._id,
    quantity = req.body.quantity,
    deadline = req.body.deadline,
    businessType = req.body.business;

  try {
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

    // save demand
    await business.save();

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
    userId = req.body.userId,
    amount = req.body.amount;

  try {
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

    // get all demand
    const businessMade = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");

    const businesses = [...businessMade].reverse();

    io.getIO().emit("business", { action: "partner added", businesses });

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
    userId = req.body.userId;

  try {
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
    userId = req.body.userId;

  try {
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
    userId = req.body.userId,
    title = req.body.title;

  try {
    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate joint purchase
    const business = await Business.findById(
      businessId,
      "interestedPartners"
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
    const interestedPartners = business.interestedPartners;
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

    res
      .status(200)
      .json({ message: "joint purchase group created successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/*********************
 * Register Pharmacy *
 *********************/
module.exports.registerPharmacy = async (req, res, next) => {
  const userId = req.params._id,
    businessName = req.body.businessName,
    location = req.body.location,
    contactNumber = req.body.contactNumber,
    about = req.body.about;

  try {
    // validate user
    const user = await User.findById(userId, "pharmacy");
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    let imageUrl, imageId;
    if (req.file) {
      const uploadedImage = await uploadImage(req.file.path);
      imageUrl = uploadedImage.imageUrl;
      imageId = uploadedImage.imageId;
    }

    // create new pharmacy
    const pharmacy = new Pharmacy({
      businessName,
      location,
      logo: { imageUrl, imageId },
      contactNumber: [contactNumber],
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

/*************************
 * Add Pharmacy Pictures *
 *************************/
module.exports.addPharmacyImages = async (req, res, next) => {
  const pharmacyId = req.params._id,
    userId = req.body.userId,
    images = req.files;

  try {
    // validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "not authorized", "user");
      return;
    }

    // validate pharmacy
    const pharmacy = await Pharmacy.findById(pharmacyId, "images");
    if (!pharmacy) {
      error.errorHandler(res, "pharmacy not found", "pharmacy");
      return;
    }

    // uploaded image
    if (images) {
      images.map(async (image) => {
        const uploadedImage = await uploadImage(image.path);
        await pharmacy.images.push({
          imageUrl: uploadedImage.imageUrl,
          imageId: uploadedImage.imageId,
        });
        await pharmacy.save();
      });
    }

    res.status(200).json({ message: "image uploaded successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

/*******************
 * Delete Pharmacy *
 *******************/
module.exports.deletePharmacy = async (req, res, next) => {
  const pharmacyId = req.params._id,
    userId = req.body.userId;

  try {
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

    res
      .status(200)
      .json({ message: "business fetched successfully", business });
  } catch (err) {
    error.error(err, next);
  }
};
