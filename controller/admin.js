const [
  Admin,
  Business,
  Chat,
  Chatroom,
  Inventory,
  Pharmacy,
  Post,
  Product,
  Transaction,
  User,
  Wallet,
] = [
  require("../model/admin"),
  require("../model/business"),
  require("../model/chat"),
  require("../model/chatroom"),
  require("../model/inventory"),
  require("../model/pharmacy"),
  require("../model/post"),
  require("../model/product"),
  require("../model/transactions"),
  require("../model/user"),
  require("../model/wallet"),
];

const [mailer, error, bcrypt, jwt, dotenv] = [
  require("../util/nodemailer"),
  require("../util/error-handling/errorHandler"),

  require("bcryptjs"),
  require("jsonwebtoken"),
  require("dotenv"),
];
const { generateOTP, verifyOTP } = require("../util/otp");

dotenv.config();

// Get all users
module.exports.getAllUsers = async (req, res, next) => {
  const adminId = req._id;
  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors
    const users = await User.find();

    res
      .status(200)
      .json({ success: true, message: "users fetched successfully", users });
  } catch (err) {
    error.error(err, next);
  }
};

// Get user
module.exports.getUser = async (req, res, next) => {
  const adminId = req._id,
    userId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // validate and get user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "user not found", "user");
      return;
    }

    // continue if there are no errors

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "user fetched successfully", user });
  } catch (err) {
    error.error(err, next);
  }
};

// suspend user
module.exports.suspendUser = async (req, res, next) => {};

// delete user
module.exports.deleteUser = async (req, res, next) => {
  const adminId = req._id,
    userId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // 1. Remove references to user in 'requests' field
    await User.updateMany(
      {},
      {
        $pull: {
          "requests.content": { user: userId },
          "requests.content": { friendId: userId },
        },
      }
    );

    // 2. Remove user from their own posts (likes, comments, replies)
    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await Post.updateMany(
      { "comments.user": userId },
      { $pull: { "comments.$[].user": userId } }
    );
    await Post.updateMany(
      { "comments.replies.user": userId },
      { $pull: { "comments.$[].replies.$[].user": userId } }
    );
    await Post.updateMany(
      { "comments.likes": userId },
      { $pull: { "comments.$[].likes": userId } }
    );

    // 3. Remove the user from all chats (single chats and chatrooms)
    await Chat.updateMany(
      { "users.userId": userId },
      { $pull: { users: { userId: userId } } }
    );
    await Chatroom.updateMany({ users: userId }, { $pull: { users: userId } });

    // 4. Remove the user's associated products
    await Product.deleteMany({ owner: userId });

    // 5. Remove the user's business (if exists)
    await Business.deleteMany({ creator: userId });

    // 6. Remove user from pharmacies
    await Pharmacy.updateMany({ owner: userId }, { $pull: { owner: userId } });

    // 7. Optionally, remove any inventory associated with the user
    await Inventory.updateMany({ owner: userId }, { $pull: { owner: userId } });

    // 8. Finally, remove the user from the database
    await User.findByIdAndDelete(userId);

    // get all users
    const users = await User.find();

    // send response to client
    res.status(200).json({
      success: true,
      message: "user deleted successfully",
      users,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// restore user
module.exports.restoreUser = async (req, res, next) => {};

// paid verification
module.exports.paidVerification = async (req, res, next) => {};

// get all posts
module.exports.getAllPosts = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors

    // get all posts
    const posts = await Post.find()
      .populate("likes", "firstName lastName fullName profileImage")
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate(
        "comments.replies.user",
        "firstName lastName fullName profileImage"
      )
      .populate("creator", "firstName lastName fullName profileImage");

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "posts fetched successfully", posts });
  } catch (err) {
    error.error(err, next);
  }
};

// get post
module.exports.getPost = async (req, res, next) => {
  const adminId = req._id,
    postId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "adminx");
      return;
    }

    // get and validate post
    const post = await Post.findById(postId)
      .populate("likes", "firstName lastName fullName profileImage")
      .populate("comments.user", "firstName lastName fullName profileImage")
      .populate(
        "comments.replies.user",
        "firstName lastName fullName profileImage"
      )
      .populate("creator", "firstName lastName fullName profileImage");
    if (!post) {
      error.errorHandler(res, "post not found", "post");
      return;
    }

    // continue if there are no errors

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "post fetched successfully", post });
  } catch (err) {
    error.error(err, next);
  }
};

// delete post
module.exports.deletePost = async (req, res, next) => {
  const adminId = req._id,
    postId = req.params.id,
    userId = req.body._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // get and validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "user not found", "user");
      return;
    }

    // get and validate post
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      error.errorHandler(res, "post not found", "post");
      return;
    }

    user.posts.pull(postId);
    user.save();

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "post deleted successfully", post });
  } catch (err) {
    error.error(err, next);
  }
};

// get all wallets
module.exports.getAllWallets = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // get all wallets
    const wallets = await Wallet.find()
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });
    if (!wallets) {
      error.errorHandler(res, "wallets not found", "wallets");
      return;
    }

    // continue if there are no errors

    res.status(200).json({ wallets });
  } catch (err) {
    error.error(err, next);
  }
};

// get wallet
module.exports.getWallet = async (req, res, next) => {
  const adminId = req._id,
    walletId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // get all wallets
    const wallet = await Wallet.findById(walletId)
      .populate({
        path: "referenceCodes",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      })
      .populate({
        path: "supplier",
        populate: {
          path: "user",
          select: "firstName lastName fullName profileImage",
        },
      });
    if (!wallet) {
      error.errorHandler(res, "wallets not found", "wallets");
      return;
    }

    // continue if there are no errors

    res.status(200).json({ wallet });
  } catch (err) {
    error.error(err, next);
  }
};

// verify wallet transaction
module.exports.verifyWalletTransaction = async (req, res, next) => {};

// get businesses
module.exports.getBusinesses = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors

    // get all businesses
    const businesses = await Business.find()
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners.user");

    // send response to client
    res.status(200).json({
      success: true,
      message: "all businesses fetched successfully",
      businesses,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// get business
module.exports.getBusiness = async (req, res, next) => {
  const adminId = req._id,
    businessId = req.params._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // get and validate business
    const business = await Business.findById(businessId)
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    // continue if there are no errors

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "business fetched successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

// delete business
module.exports.deleteBusiness = async (req, res, next) => {
  const adminId = req._id,
    userId = req.body._id,
    businessId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // get and validate user
    const user = await User.findById(userId);
    if (!user) {
      error.errorHandler(res, "user not found", "user");
      return;
    }

    // get and validate business
    const business = await Business.findOneAndDelete(businessId);
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    // get all businesses
    // const businesses = await Business.findOneAndDelete(businessId);

    // continue if there are no errors

    // save changes
    // await businesses.save();

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "business deleted successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

// close business
module.exports.closeBusiness = async (req, res, next) => {
  const adminId = req._id,
    businessId = req.params.id;

  try {
    // vallidate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid addmin", "admin");
      return;
    }

    // get and validate business
    const business = await Business.findById(businessId)
      .populate("creator", "firstName lastName profileImage")
      .populate("product")
      .populate("interestedPartners");
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    // continue if there are no errors
    business.status = true;

    // save changes
    business.save();

    // send response to client
    res.status(200).json({
      success: true,
      message: "business closed successfully",
      business,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// get transactions
module.exports.getTransactions = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors
    const allTransactions = await Transaction.find();

    // send response to client
    res.status(200).json({
      success: true,
      message: "transactions fetched successfully",
      allTransactions,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// get all pharmacies
module.exports.getPharmacies = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors
    const pharmacies = await Pharmacy.find();

    // send response to client
    res.status(200).json({
      success: true,
      message: "pharmacies fetched successfully",
      pharmacies,
    });
  } catch (err) {
    error.error(err, next);
  }
};

// get single pharmacy
module.exports.getPharmacy = async (req, res, next) => {
  const adminId = req._id,
    pharmacyId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // validate
    const pharmacy = await Pharmacy.findById(pharmacyId).populate("inventory");
    if (!pharmacy) {
      error.errorHandler(res, "pharmacy not found", "pharmacy");
      return;
    }

    // continue if no error

    // send response to client
    res.status(200).json({ pharmacy });
  } catch (err) {
    error.error(err, next);
  }
};

module.exports.deletePharmacy = async (req, res, next) => {};

module.exports.getInventories = async (req, res, next) => {
  const adminId = req._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // validate inventories
    const inventories = await Inventory.find();
    if (!inventories) {
      error.errorHandler(res, "inventories not found", "inventories");
      return;
    }

    // continue if there are no errors

    res.status(200).json({ inventories });
  } catch (err) {
    error.error(err, next);
  }
};

// get inventory
module.exports.getInventory = async (req, res, next) => {
  const adminId = req._id,
    inventoryId = req.params.id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // validate inventories
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      error.errorHandler(res, "inventory not found", "inventory");
      return;
    }

    // continue if there are no errors

    res.status(200).json({ inventory });
  } catch (err) {
    error.error(err, next);
  }
};
