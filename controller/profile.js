const User = require("../model/user");

const { getUser } = require("../util/user");
const error = require("../util/error-handling/errorHandler");
const { uploadImage, removeImage } = require("../util/images/images");

/*****************************
 * Get Current User Timeline *
 *****************************/
module.exports.getUserTImeline = async (req, res, next) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId, { password: 0 })
      .populate("friends posts")
      .populate({
        path: "posts",
        populate: [
          {
            path: "creator",
            select: "firstName lastName fullName profileImage",
          },
          {
            path: "like",
            select: "firstName lastName fullName profileImage",
          },
        ],
      });

    //   Check if user is undefined
    if (!user) error.errorHandler(res, "User not found", "user");

    res.status(200).json({ ...user._doc, name: user.fullName });
  } catch (err) {
    error.error(err, next);
  }
};

/***********************
 * Get Profile Details *
 ***********************/
module.exports.getProfileDetails = async (req, res, next) => {
  const userId = req.params.userId;

  try {
    // Get and validate user
    const user = await User.findById(userId).populate("friends requests");

    if (!user) error.errorHandler(res, "user not found", "user");

    res
      .status(200)
      .json({ message: "user details fetched successfully", user });
  } catch (err) {
    error.error(err, next);
  }
};
