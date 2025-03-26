const {
  createUser,
  getUserById,
  getUsers,
  login,
  checkEmailQuery,
  VerifyOTP,
  forgotPassword,
  forgotPasswordVerifyOTP,
  updatePassword,
  Verification,
  sendOTPPhone,
  verifyOTPPhone,
  sendWAOTP,
  verifyWAOTP,
  deleteAccountRequest,
} = require("./user.controller");
const router = require("express").Router();
const { verifyToken } = require("../../middleware/token_verification");
const cookieParser = require("cookie-parser");

router.use(cookieParser());

router.post("/create", createUser);
router.get("/:id", verifyToken, getUserById);
router.get("/", verifyToken, getUsers);

router.post("/login", login);

router.post("/verify-email", checkEmailQuery);

router.post("/verify-otp", VerifyOTP);

router.post("/verified", Verification);

router.post("/forgot-password", forgotPassword);

router.post("/verify-forgot-otp", forgotPasswordVerifyOTP);

router.post("/update-password", updatePassword);

router.post("/send-sms", sendOTPPhone);

router.post("/verify-sms-otp", verifyOTPPhone);

router.post("/send-wa-otp", sendWAOTP);

router.post("/verify-wa-otp", verifyWAOTP);

router.post("/delete-account", deleteAccountRequest);

router.post("/logout", (req, res) => {
  try {
    const jwtCookie = req.cookies.jwt;

    if (!jwtCookie) {
      return res.status(200).json({ message: "Already logged out" });
    }
    res.clearCookie("jwt");
    return res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error logging out" });
  }
});

module.exports = router;
