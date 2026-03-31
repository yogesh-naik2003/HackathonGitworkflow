require("dotenv").config();
const DEADLINE = new Date(process.env.HACKATHON_DEADLINE || "2026-04-02T09:00:00"); // Use env var for deadline

const fs = require("fs").promises; // Import fs.promises for async file operations
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Queue } = require("bullmq");

const Team = require("./models/Team");
const githubService = require("./githubService"); // Import the new GitHub service
const emailService = require("./emailService"); // Import the new Email service
 
const app = express();

// Configure CORS for production: specify allowed origins
if (process.env.NODE_ENV === 'development') {
  // In development, allow all origins for flexibility
  app.use(cors());
  console.log("CORS: Allowing all origins in development mode.");
} else {
  // In production, use a more restrictive CORS policy
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL, // This should be your production frontend URL
          // Add any other specific production origins here if needed
        ].filter(Boolean); // Remove any undefined/null entries

        // Check if the origin is explicitly allowed
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true, // If you're using cookies/sessions
    }),
  );
}
app.use(express.json());

console.log("Mongo URI:", process.env.MONGO_URI);

// connect database
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

// Initialize BullMQ Queue
// Prioritize REDIS_URL for deployment, fall back to host/port for local Docker Compose
const redisConnectionOptions = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || "redis", // Use the service name 'redis' for local Docker Compose
      port: parseInt(process.env.REDIS_PORT || "6379"),
    };

const registrationQueue = new Queue("registrationQueue", {
  connection: redisConnectionOptions,
});

// Add an error listener to the BullMQ Queue instance
registrationQueue.on('error', (err) => {
  console.error('BullMQ Queue encountered a connection error:', err);
  // Implement additional error handling logic here, e.g., logging to a monitoring system or sending alerts.
});

// Environment variables needed directly in server.js
// const ORG = process.env.ORG_NAME; // ORG is used in githubService, not directly here
// Health check endpoint for Docker Compose
app.get("/health", (req, res) => {
  // You could add more sophisticated checks here, like database connectivity
  if (mongoose.connection.readyState === 1) {
    return res.status(200).send("OK");
  }
  res.status(500).send("Database not connected");
});

// team route
app.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find().select(
      "teamName members domain email repoUrl score status",
    );

    res.json(teams);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch teams",
    });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const teams = await Team.find()
      .sort({ score: -1 })
      .select("teamName score repoUrl -_id");

    res.json(teams);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch leaderboard",
    });
  }
});

// MAIN API
app.post("/create-repo", async (req, res) => {
  if (isDeadlinePassed()) {
    return res.status(403).json({
      error: "Submission deadline has passed",
    });
  }

  try {
    const { teamName, members, domain, email } = req.body;

    console.log("Request body:", { teamName, members, domain, email });

    // Deduplicate members to avoid redundant checks and operations
    const uniqueMembers = members ? [...new Set(members)] : [];

    if (!teamName) {
      return res.status(400).json({
        error: "teamName is required",
      });
    }

    const repoName = "team-" + teamName.toLowerCase().replace(/\s+/g, "-");

    // Parallelize all remote checks: GitHub Users, GitHub Repo (using uniqueMembers)
    const checks = [githubService.checkRepoExists(repoName)]; // 0: Repo Name Check

    // Add member checks if members exist
    if (uniqueMembers.length > 0) {
      uniqueMembers.forEach((m) => checks.push(githubService.validateGithubUser(m))); // 1+: Member GH Checks
    }

    // Execute all checks concurrently
    const results = await Promise.all(checks);

    const repoExists = results[0];

    if (repoExists) {
      return res.status(400).json({
        error:
          "Repository already exists on GitHub. Please contact admin or use a different team name.",
      });
    }

    if (uniqueMembers.length > 0) {
      // Validation results start at index 1
      const validationResults = results.slice(1);
      const invalidUserIndex = validationResults.findIndex(
        (isValid) => !isValid,
      );
      if (invalidUserIndex !== -1) {
        return res
          .status(400)
          .json({ // Use uniqueMembers for error message
            error: `GitHub user not found: ${uniqueMembers[invalidUserIndex]}`,
          });
      }
    }

    // Check if any member is already in another team.
    if (uniqueMembers.length > 0) {
      const existingTeam = await Team.findOne({ members: { $in: uniqueMembers } });
      if (existingTeam) {
        const existingMember = members.find((member) =>
          existingTeam.members.includes(member),
        );
        return res.status(400).json({
          error: `User '${existingMember}' is already registered under another team`,
        });
      }
    }

    // save team in MongoDB
    const team = new Team({
      teamName: teamName,
      members: uniqueMembers, // Save unique members
      domain: domain,
      email: email,
      // repoUrl will be updated by the worker after successful GitHub creation
      // For now, it can be null or an empty string, or derived later.
      // It's safer to not set it optimistically if it might fail.
      // We'll leave it out for now, worker will populate it.
    });

    try {
      await team.save();
    } catch (dbError) {
      // Handle duplicate key errors from MongoDB (error code 11000)
      if (dbError.code === 11000) {
        if (dbError.keyPattern?.teamName) {
          return res
            .status(400)
            .json({ error: `Team name '${teamName}' is already taken.` });
        }
        if (dbError.keyPattern?.members) {
          return res.status(400).json({
            error: `User '${dbError.keyValue.members}' is already registered under another team.`,
          });
        }
        return res
          .status(400)
          .json({
            error:
              "Team name or a member is already registered in another team.",
          });
      }
      throw dbError; // Re-throw other database errors
    }

    console.log("Team saved in MongoDB");

    // Respond to the user immediately. The rest of the setup will happen in the background.
    res.json({
      message:
        "Team registered successfully. Repo setup and email notification are in progress.",
      // repoUrl is now set by the worker and sent in email, not immediately known here.
    });

    // Add job to the queue for background processing
    await registrationQueue.add(
      "create-team-repo",
      { teamId: team._id },
      { attempts: 3, backoff: { type: "exponential", delay: 1000 } }, // Retry 3 times with exponential backoff
    );
  } catch (error) {
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 502) {
      return res.status(503).json({
        error:
          "GitHub API is temporarily unavailable. Please try again in a moment.",
      });
    }

    if (error.response?.status === 422) {
      return res.status(400).json({
        error: "Repository already exists for this team",
      });
    }

    res.status(500).json({
      error: error.message || "Repository creation failed",
    });
  }
});

app.post("/lock-repos", async (req, res) => {
  try {
    const teams = await Team.find();

    for (const team of teams) {
      const repoName = team.repoUrl.split("/").pop();

      await githubService.lockRepository(repoName, team.members); // Pass members
    }

    res.json({
      message: "All repositories locked",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to lock repositories",
    });
  }
});

app.patch("/teams/:id/score", async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    console.log(
      `Received score update for team ${id}: ${score} (type: ${typeof score})`,
    );

    // Using findByIdAndUpdate to avoid validation on other fields like 'domain'
    // which might be missing in older documents.
    const team = await Team.findByIdAndUpdate(
      id,
      { score: score },
      // { returnDocument: 'after' } returns the updated document.
      { returnDocument: "after", runValidators: true },
    );

    if (!team) {
      console.log(`Team not found: ${id}`);
      return res.status(404).json({ error: "Team not found" });
    }

    res.json(team);
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({
      error: "Failed to update score",
    });
  }
});

app.delete("/teams/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting team with ID:", id);

    // Find the team first
    const team = await Team.findById(id);
    if (!team) {
      console.log("Team not found with ID:", id);
      return res.status(404).json({ error: "Team not found" });
    }

    console.log("Found team:", team.teamName);

    // Extract repo name from URL
    const repoName = team.repoUrl ? team.repoUrl.split("/").pop() : null;

    // Delete GitHub repository
    try {
      if (repoName) {
        await githubService.deleteRepo(repoName);
        console.log(`GitHub repo ${repoName} deleted successfully.`);
      } else {
        console.log("No repoUrl found for team, skipping GitHub repo deletion.");
      }
    } catch (githubError) {
      console.error(
        `Error deleting GitHub repo ${repoName}:`,
        githubError.response?.status,
        githubError.response?.data?.message || githubError.message,
      );
    }

    // Delete team from database
    await Team.findByIdAndDelete(id);
    console.log("Team deleted from database");

    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

app.patch("/teams/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const update = { status };
    if (status === "Active") {
      update.eliminatedInRound = null;
    } else if (status === "Eliminated") {
      update.eliminatedInRound = 1; // You can make this dynamic
    }

    const team = await Team.findByIdAndUpdate(id, update, {
      returnDocument: "after",
    });

    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

function isDeadlinePassed() {
  const now = new Date();

  return now > DEADLINE;
}

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000} (PID: ${process.pid})`);
});

// Graceful shutdown for the backend server
const gracefulShutdown = async () => {
  console.log('SIGTERM/SIGINT received. Shutting down backend gracefully...');

  // 1. Close HTTP server
  server.close(() => {
    console.log('HTTP server closed.');
  });

  // 2. Close MongoDB connection
  await mongoose.disconnect();
  console.log('MongoDB connection closed.');

  // 3. Close BullMQ queue connection (if any operations are pending)
  await registrationQueue.close();
  console.log('BullMQ Queue connection closed.');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
