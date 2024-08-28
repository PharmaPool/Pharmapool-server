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
  require("../model/admin"),
];

const [mailer, error, { generateAdminCode }, bcrypt, jwt, dotenv] = [
  require("../util/nodemailer"),
  require("../util/error-handling/errorHandler"),
  require("../util/idGenerator"),
  require("bcryptjs"),
  require("jsonwebtoken"),
  require("dotenv"),
];

dotenv.config();

// Register admin
module.exports.registerAdmin = async (req, res, next) => {
  const email = req.body.email;

  try {
    // validate user
    const emailExists = await Admin.findOne({ email });
    if (emailExists) {
      error.errorHandler(res, "email already exists", "admin");
      return;
    }

    // continue if there are no errors
    const admin = new Admin({ email });
    await admin.save();

    res
      .status(200)
      .json({ message: "admin registered successfully", type: "admin" });
  } catch (err) {
    error.error(err, next);
  }
};

// Admin login
module.exports.adminEmailLogin = async (req, res, next) => {
  const email = req.body.email;

  try {
    // validate user
    const admin = await Admin.findOne({ email });
    if (!admin) {
      error.errorHandler(res, "admin not found", "admin");
      return;
    }

    // continue if there are no errors
    const adminCode = generateAdminCode();
    const hashedCode = bcrypt.hash(adminCode, 12);

    admin.passkey = hashedCode;
    await admin.save();

    await mailer(
      email,
      "admin verification",
      "Use this one time passkey to login",
      "admin",
      code
    );

    res
      .status(200)
      .json({ message: "an OTP has been sent to your mail", type: "admin" });
  } catch (err) {
    error.error(err, next);
  }
};

// Admin passkey login
module.exports.adminPasskeyLogin = async (req, res, next) => {
  const email = req.body.email,
    passkey = req.body.passkey;

  try {
    // validate user
    const admin = await Admin.findOne({ email });
    if (!admin) {
      error.errorHandler(res, "admin not found", "admin");
      return;
    }

    // validate passkey
    const passkeyMatch = await bcrypt.compare(passkey, admin.passkey);
    if (!passkeyMatch) {
      error.errorHandler(res, "invalid admin", "admin");
      return;
    }

    // continue if there are no errors

    // Create jsonwebtoken
    const token = jwt.sign(
      { user: admin, email: admin.email },
      process.env.jwtKey,
      { algorithm: "HS256", expiresIn: process.env.jwtExpirySeconds }
    );

    res
      .status(200)
      .json({ success: true, message: "admin signin successful", token });
  } catch (err) {
    error.error(err, next);
  }
};

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
    userId = req.params._id;

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
    userId = req.params._id;

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

    // continue if there are no errors

    // get all users
    const users = await User.find();

    // pull user from users
    users.pull(userId);

    // save changes
    const updatedUsers = await users.save();

    // send response to client
    res.status(200).json({
      success: true,
      message: "user deleted successfully",
      updatedUsers,
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
    const posts = await Post.find();

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
    postId = req.params._id;

  try {
    // validate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid admin", "adminx");
      return;
    }

    // get and validate post
    const post = await Post.findById(postId);
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
    postId = req.params._id,
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
    const post = await Post.findById(postId);
    if (!post) {
      error.errorHandler(res, "post not found", "post");
      return;
    }

    // get all posts
    const posts = await Post.find();

    // pull post from posts and from user post array
    await posts.pull(postId);
    await user.posts.pull(postId);

    // save changes
    posts.save();
    user.save();

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "post deleted successfully" });
  } catch (err) {
    error.error(err, next);
  }
};

// get all wallets
module.exports.getAllWallets = async (req, res, next) => {};

// verify wallet transaction
module.exports.verifyWalletTransaction = async (req, res, next) => {};

// get business
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
    const businesses = await Business.find();

    // send response to client
    res
      .status(200)
      .json({ success: true, message: "all businesses fetched successfully" });
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
    const business = await Business.findById(businessId);
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
    businessId = req.params._id;

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
    const business = await Business.findById(businessId);
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    // get all businesses
    const businesses = await Business.find();

    // continue if there are no errors

    // pull business from businesses and user businesses array
    await businesses.pull(businessId);
    await user.businesses.pull(businessId);

    // save changes
    await businesses.save();
    await user.save();

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
    businessId = req.params._id;

  try {
    // vallidate admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      error.errorHandler(res, "invalid addmin", "admin");
      return;
    }

    // get and validate business
    const business = await Business.findById(businessId);
    if (!business) {
      error.errorHandler(res, "business not found", "business");
      return;
    }

    // continue if there are no errors
    business.status = false;

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
    res
      .status(200)
      .json({
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
  
};

module.exports.deletePharmacy = async (req, res, next) => {};

module.exports.getInventories = async (req, res, next) => {};

module.exports.getInventory = async (req, res, next) => {};
