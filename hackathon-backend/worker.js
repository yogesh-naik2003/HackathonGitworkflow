require("dotenv").config();
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const fs = require("fs").promises;

const Team = require("./models/Team");
const githubService = require("./githubService");
const emailService = require("./emailService");

// connect database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected for Worker");
  })
  .catch((err) => {
    console.log("MongoDB connection error for Worker:", err);
  });

// Prioritize REDIS_URL for deployment, fall back to host/port for local Docker Compose
const redisConnectionOptions = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || "redis", // Use the service name 'redis' for local Docker Compose
      port: parseInt(process.env.REDIS_PORT || "6379"),
    };

const worker = new Worker(
  "registrationQueue",
  async (job) => {
    const { teamId } = job.data;
    console.log(`Processing job for team ID: ${teamId}`);

    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error(`Team with ID ${teamId} not found.`);
    }

    console.log(`Worker: GITHUB_TOKEN is set: ${!!process.env.GITHUB_TOKEN}`);
    console.log(`Worker: ORG_NAME: ${process.env.ORG_NAME}`);


    // Generate a truly unique repoName by appending a timestamp
    // This prevents "name already exists" errors on GitHub for similar team names
    const uniqueSuffix = Date.now(); // or a short UUID
    const repoName = `team-${team.teamName.toLowerCase().replace(/\s+/g, "-")}-${uniqueSuffix}`;

    try {
      console.log(`Starting background setup for team: ${team.teamName}`);

      // Create the repo
      console.log(`Worker: Attempting to create GitHub repository with name: ${repoName}`);
      let repoUrl;
      try {
        repoUrl = await githubService.createRepo(repoName);
      } catch (repoError) {
        console.error(`Error creating GitHub repository ${repoName}:`, repoError);
        throw repoError; // Re-throw to fail the job
      }
      console.log(`GitHub repository created: ${repoUrl}`);

      // Read template files
      let readmeContent = '';
      let guidelines = '';
      try {
        readmeContent = await fs.readFile("./templates/README.md.template", "utf8");
        readmeContent = readmeContent.replace("{{TEAM_NAME}}", team.teamName); // Replace placeholder
        console.log(`Content of README.md.template (first 100 chars): ${readmeContent.substring(0, 100)}...`);
      } catch (fileError) {
        console.error(`Error reading template files: ${fileError.message}. Ensure 'templates/README.md.template' exists and is readable.`);
        throw fileError; // Re-throw to fail the job
      }

      // Create README.md first to ensure the default branch ('main') is fully established.
      // This helps avoid "Branch main not found" errors for subsequent file creations.
      console.log(`Worker: Attempting to create file: ${repoName}/README.md`);
      await githubService.createFile(repoName, "README.md", readmeContent);

      // Now, run other file creations and collaborator additions in parallel
      const setupPromises = [];
      
      if (team.members && team.members.length > 0) {
        // Using Promise.allSettled allows individual collaborator additions to fail
        // without stopping the entire job.
        const collaboratorPromises = team.members.map(async (user) => {
            const result = await githubService.addCollaborator(repoName, user);
            if (!result.success) {
                console.warn(`Collaborator ${user} could not be added. Reason: ${result.error}`);
            }
            return result; // Return the result to be collected by Promise.allSettled
        });
        setupPromises.push(...collaboratorPromises); // Add these promises to the overall setupPromises
      }

      // Run file creation and collaborator additions in parallel
      const results = await Promise.allSettled(setupPromises);
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Promise at index ${index} rejected:`, result.reason);
        }
      });

      // Explicitly list repository contents to verify
      const repoContents = await githubService.listRepoContents(repoName);
      console.log(`Repository ${repoName} contents after setup:`, repoContents.map(item => item.path));
      console.log(
        `Background file and collaborator setup complete for ${team.teamName}.`,
      );

      // Introduce a small delay to avoid hitting GitHub API rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send email notification
      await emailService.sendEmail(team.email, repoUrl, team.teamName);
      console.log(`Email sent successfully to ${team.email}`);

      // Update team in MongoDB with the repoUrl and potentially a status
      // This happens ONLY after the GitHub repo has been successfully created.
      team.repoUrl = repoUrl;
      await team.save();
      console.log(`Team ${team.teamName} updated with repoUrl.`);
    } catch (error) {
      console.error(`Error processing job for team ${team.teamName}:`, error);
      throw error; // Re-throw to allow BullMQ to handle retries
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5, // Process up to 5 jobs concurrently
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed for team ID: ${job.data.teamId}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job.id} failed for team ID: ${job.data.teamId} with error: ${err.message}`,
  );
});

// Add an error listener to the BullMQ Worker instance
worker.on('error', (err) => {
  console.error('BullMQ Worker encountered a connection error:', err);
  // Implement additional error handling logic here, e.g., logging to a monitoring system or sending alerts.
});

// Graceful shutdown for the worker process
const gracefulShutdown = async () => {
  console.log('SIGTERM/SIGINT received. Shutting down worker gracefully...');

  // 1. Close BullMQ worker
  await worker.close();
  console.log('BullMQ Worker closed.');

  // 2. Close MongoDB connection
  await mongoose.disconnect();
  console.log('MongoDB connection closed for Worker.');

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log("BullMQ Worker started.");