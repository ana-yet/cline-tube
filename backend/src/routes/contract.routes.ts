import { Router } from "express";
import * as contractController from "../controllers/contract.controller";

const router = Router();

router.get("/openapi.json", contractController.openApi);

export const contractRouter = router;
