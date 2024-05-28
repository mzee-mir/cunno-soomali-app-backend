import express from 'express';
import myUserControllers from '../controllers/myUserControllers';
import { jwtCheck, jwtParse } from '../middleware/auth';
import { validateMyUserRequest } from '../middleware/validation';

const router = express.Router();

router.get("/", jwtCheck, jwtParse, myUserControllers.getCurrentUser);
router.post("/", jwtCheck, myUserControllers.createCurrentUser);
router.put(
  "/",
  jwtCheck,
  jwtParse,
  validateMyUserRequest,
  myUserControllers.updateCurrentUser
);
export default router;