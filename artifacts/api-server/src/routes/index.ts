import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trainingRouter from "./training";
import storageRouter from "./storage";
import guestSharingRouter from "./guest-sharing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trainingRouter);
router.use(storageRouter);
router.use(guestSharingRouter);

export default router;
