import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { serve } from "inngest/express";

import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { connectDB } from "./utils/db";

// --> Import Inngest client and functions
import { inngest } from "./inngest/client";
import { functions as inngestFunctions } from "./inngest/functions";

// --> Import routers
import authRouter from "./routes/auth";
import chatRouter from "./routes/chat";
import moodRouter from "./routes/mood";
import activityRouter from "./routes/activity";

// --> Best practice: Load environment variables at the very top
dotenv.config();

// --> Essential: Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "PORT"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is not set.`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";
const API_BASE_PATH = "/api/v1";

// --- Middleware Setup ---

// --> Security: More specific CORS policy for production
const corsOptions = {
  origin: NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(helmet()); // Set essential security headers

app.use(express.json()); // Parse JSON bodies

// --> Logging: Use a production-friendly format when not in development
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// --- Public & API Routes ---

// Health check endpoint (useful for load balancers, etc.)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// --> API routes are now consistently namespaced and versioned
app.use(`${API_BASE_PATH}/auth`, authRouter);
app.use(`${API_BASE_PATH}/chat`, chatRouter);
app.use(`${API_BASE_PATH}/mood`, moodRouter);
app.use(`${API_BASE_PATH}/activity`, activityRouter);

// --> Set up Inngest endpoint under the same API namespace
app.use(
  `${API_BASE_PATH}/inngest`,
  serve({ client: inngest, functions: inngestFunctions })
);

// --- Error Handling ---
// This should be the last middleware added
app.use(errorHandler);

// --- Server Startup ---
const startServer = async () => {
  try {
    await connectDB();
    logger.info("MongoDB connected successfully.");

    app.listen(PORT, () => {
      logger.info(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(
        `Inngest UI available at http://localhost:${PORT}/api/inngest`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();