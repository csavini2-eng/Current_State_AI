import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trainingRouter from "./training";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trainingRouter);
router.use(storageRouter);

export default router;
