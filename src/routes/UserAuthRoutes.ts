import { Router } from "express";
import UserAuthController from "../controllers/UserAuthController";
import authentications from "../middleware/authentications";
import upload from "../middleware/multer";

const router = Router();

router.post("/Signup", UserAuthController.signupUser);
router.post("/Verify-email", UserAuthController.verifyEmailController)
router.post("/Login", UserAuthController.loginUser)
router.get("/Logout", authentications,UserAuthController.logoutUser)
router.put(
    "/Upload-avatar",
    authentications,
    upload.single('avatar'),
    UserAuthController.uploadAvatar
)
router.put("/Update-user",authentications,UserAuthController.updateUserDetails)
router.put("/Forgot-password",UserAuthController.forgotPassword)
router.put("/Verify-otp",UserAuthController.verifyForgotPasswordOtp)
router.put("/Reset-password",UserAuthController.resetpassword)
router.post('/refresh-token',UserAuthController.refreshToken)
router.get('/user-details',authentications,UserAuthController.userDetails)
router.post("/refresh-token",UserAuthController.refreshToken)

export default router;
