const { validationResult } = require("express-validator");
const { forEach } = require("p-iteration");
const io = require("../util/socket");

// Models
const Post = require("../model/post"),
  User = require("../model/user"),
  Chat = require("../model/chat");

// Helper functions
const error = require("../util/error-handling/errorHandler");
const { userExist, getUser } = require("../util/user");
const { getPost, populatePost } = require("../util/post");
const { getChat, validChatUser } = require("../util/chat");
const { notifyFriend, notifyFriendRequest } = require("../util/notifications");



