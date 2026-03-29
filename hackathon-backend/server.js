require("dotenv").config();
const DEADLINE = new Date("2026-04-02T11:00:00");

const fs = require("fs").promises; // Import fs.promises for async file operations
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");

const Team = require("./models/Team");

const app = express();

app.use(cors());
app.use(express.json());

console.log("Mongo URI:", process.env.MONGO_URI);

// connect database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

// environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.ORG_NAME;

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

// check if repo exists on GitHub
async function checkRepoExists(repoName) {
  try {
    await axios.get(`https://api.github.com/repos/${ORG}/${repoName}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });
    return true;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    console.log(
      "checkRepoExists error:",
      error.response?.status,
      error.message,
    );
    return false;
  }
}

// create GitHub repository
async function createRepo(repoName) {
  const response = await axios.post(
    `https://api.github.com/orgs/${ORG}/repos`,
    {
      name: repoName,
      private: true,
    },
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  return response.data.html_url;
}

// add collaborators
async function addCollaborator(repoName, username) {
  await axios.put(
    `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${username}`,
    {},
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
}

async function validateGithubUser(username) {
  try {
    await axios.get(`https://api.github.com/users/${username}`);

    return true;
  } catch (error) {
    return false;
  }
}

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

    if (!teamName) {
      return res.status(400).json({
        error: "teamName is required",
      });
    }

    const repoName = "team-" + teamName.toLowerCase().replace(/\s+/g, "-");

    // Parallelize all remote checks: GitHub Users, GitHub Repo
    const checks = [
      checkRepoExists(repoName), // 0: Repo Name Check
    ];

    // Add member checks if members exist
    if (members && members.length > 0) {
      members.forEach((m) => checks.push(validateGithubUser(m))); // 1+: Member GH Checks
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

    if (members && members.length > 0) {
      // Validation results start at index 1
      const validationResults = results.slice(1);
      const invalidUserIndex = validationResults.findIndex(
        (isValid) => !isValid,
      );
      if (invalidUserIndex !== -1) {
        return res
          .status(400)
          .json({
            error: `GitHub user not found: ${members[invalidUserIndex]}`,
          });
      }
    }

    // Check if any member is already in another team.
    if (members && members.length > 0) {
      const existingTeam = await Team.findOne({ members: { $in: members } });
      if (existingTeam) {
        const existingMember = members.find((member) =>
          existingTeam.members.includes(member),
        );
        return res.status(400).json({
          error: `User '${existingMember}' is already registered under another team`,
        });
      }
    }

    // Optimistically construct repoUrl
    const repoUrl = `https://github.com/${ORG}/${repoName}`;

    // save team in MongoDB
    const team = new Team({
      teamName: teamName,
      members: members,
      domain: domain,
      email: email,
      repoUrl: repoUrl,
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
      repoUrl: repoUrl,
    });

    // --- Background Tasks ---
    // Run the rest of the setup in the background without making the user wait.
    (async () => {
      try {
        console.log(`Starting background setup for team: ${teamName}`);

        // Read template files
        let readmeContent = await fs.readFile("./templates/README.md.template", "utf8");
        readmeContent = readmeContent.replace("{{TEAM_NAME}}", teamName); // Replace placeholder
        console.log(`Content of README.md.template (first 100 chars): ${readmeContent.substring(0, 100)}...`); // Log first 100 chars of README content
        const guidelines = await fs.readFile("./templates/submission-guidelines.md.template", "utf8");
        console.log(`Content of submission-guidelines.md.template: ${guidelines.substring(0, 100)}...`); // Log first 100 chars

        // Create the repo (moved to background)
        await createRepo(repoName);

        const setupPromises = [
          // Ensure content is not empty before attempting to create file.
          // If content is empty, explicitly reject the promise to make it visible in allSettled results.
          readmeContent ? createFile(repoName, "README.md", readmeContent) : Promise.reject(new Error("README.md content is empty or template not found")),
          // Similarly for guidelines, though user reports this is working.
          guidelines ? createFile(repoName, "submission-guidelines.md", guidelines) : Promise.reject(new Error("submission-guidelines.md content is empty or template not found")),

          // Added submission-guidelines.md to be created for each repo
        ];

        if (members && members.length > 0) {
          members.forEach((user) =>
            setupPromises.push(addCollaborator(repoName, user)),
          );
        }

        // Run file creation and collaborator additions in parallel
        const results = await Promise.allSettled(setupPromises);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Promise at index ${index} rejected:`, result.reason);
            }
        });
        console.log(
          `Background file and collaborator setup complete for ${teamName}.`,
        );

        // Send email notification
        if (email && repoUrl) {
          await sendEmail(email, repoUrl, teamName);
          console.log(`Background email sent successfully to ${email}`);
        } else {
          console.log(
            "Background task: Email not sent - missing email or repoUrl.",
          );
        }
      } catch (backgroundError) {
        console.error(
          `Error during background processing for team ${teamName}:`,
          backgroundError.message,
        );
      }
    })();
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

      await lockRepository(repoName);
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
    const repoName = team.repoUrl.split("/").pop();
    console.log("Deleting repo:", repoName);

    // Delete GitHub repository
    try {
      console.log(`Attempting to delete GitHub repo: ${ORG}/${repoName}`);

      const deleteResponse = await axios.delete(
        `https://api.github.com/repos/${ORG}/${repoName}`,
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          timeout: 10000, // 10 second timeout
        },
      );

      console.log("GitHub repo deleted successfully", deleteResponse.status);
    } catch (githubError) {
      const status = githubError.response?.status;
      const message =
        githubError.response?.data?.message || githubError.message;

      console.log(`GitHub repo deletion failed: ${status} - ${message}`);

      if (status === 403) {
        console.log(
          "Token may not have delete_repo permission or admin access to the organization",
        );
      } else if (status === 404) {
        console.log(
          "Repository may have already been deleted or doesn't exist",
        );
      } else if (
        githubError.code === "ECONNRESET" ||
        message.includes("socket hang up")
      ) {
        console.log("Network connection issue with GitHub API");
      }
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

async function lockRepository(repoName) {
  const team = await Team.findOne({ repoUrl: new RegExp(repoName) });

  if (!team) return;

  for (const user of team.members) {
    await axios.put(
      `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${user}`,
      {
        permission: "pull",
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      },
    );
  }
}

async function createFile(repoName, fileName, content) {
  const encodedContent = Buffer.from(content).toString("base64");

  await axios.put(
    `https://api.github.com/repos/${ORG}/${repoName}/contents/${fileName}`,
    {
      message: `Add ${fileName}`,
      content: encodedContent,
    },
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
}

const nodemailer = require("nodemailer");

async function sendEmail(email, repoUrl, teamName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Advaya Hackathon 2.0 – Your GitHub Repository is Ready 🚀",
    html: `
        <p>Hello Team <b>${teamName}</b>,</p>

        <p>Welcome to Advaya Hackathon 2.0 – 2026, organized by BGS College of Engineering and Technology (BGSCET).</p>

        <p>We are excited to have your team participate in this innovation-driven event. Your project workspace has been successfully created.</p>

        <p>Your GitHub repository has been successfully created for the hackathon.</p>

        <h3>Repository Link:</h3>
        <p><a href="${repoUrl}">${repoUrl}</a></p>

        <h3>Clone Command:</h3>
        <div style="background: #f4f4f4; padding: 10px; border-radius: 5px; color: #333;">
          <pre style="margin: 0;"><code>git clone ${repoUrl}</code></pre>
        </div>

        <p>All registered team members have been added as collaborators. Please check your GitHub notifications and accept the repository invitation.</p>

        <h3>Procedure to start working on your repository:</h3>
        <ul>
        <li>Accept the collaborator invitation on GitHub.</li>
        <li>Clone the repository to your system.</li>
        <li>Start developing your project inside the repository.</li>
        <li>Commit and push your changes regularly.</li>
        <li>Update the README.md file with your project details.</li>
        </ul>

        <h3>GitHub Guidelines:</h3>
        <ul>
        <li>Do not fork external projects as your main submission repository.</li>
        <li>All development must happen inside the provided repository.</li>
        <li>Commit your progress regularly.</li>
        <li>Avoid pushing unnecessary large files.</li>
        <li>Maintain proper commit messages for clarity.</li>
        </ul>

        <h3>Important Deadline:</h3>
        <p>All teams must push their final project code before</p>
        <p><b>2 April 2026 – 10:00 AM</b></p>
        <p>Any commits pushed after the deadline may not be considered for evaluation.</p>

        <h3>Your README.md must contain:</h3>
        <ul>
        <li>Project Title</li>
        <li>Problem Statement</li>
        <li>Proposed Solution</li>
        <li>Tech Stack Used</li>
        <li>Installation / Run Instructions</li>
        <li>Screenshots or Demo Links (if available)</li>
        <li>Team Members</li>
        </ul>
        <p>This will help judges understand your project quickly.</p>

        <h3>General Hackathon Guidelines:</h3>
        <ul>
        <li>Work only within your registered team.</li>
        <li>Follow ethical coding practices.</li>
        <li>Do not plagiarize existing projects.</li>
        <li>Ensure your project runs successfully.</li>
        <li>Keep your repository updated.</li>
        </ul>

        <h3>Evaluation Criteria</h3>
        <ul>
        <li>Innovation and originality</li>
        <li>Technical implementation</li>
        <li>Real-world impact</li>
        <li>User experience and design</li>
        <li>Project presentation and documentation</li>
        </ul>

        <p>If you face any issues related to the repository or hackathon process, please contact the organizing team.</p>
        <p><b>Yogesh Naik</b><br>
        9632635175</p><br>
        <p><b>Mayur M</b><br>
        9844218078</p>

        <p>We wish your team the very best for the hackathon.</p>

        <p>Innovate, collaborate, and build something amazing.</p>

        <p>Good luck and happy hacking!</p>

        <p>Advaya Hackathon 2.0 Organizing Team<br>
        BGS College of Engineering and Technology (BGSCET)</p>
        `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent:", info.messageId);
  return info;
}

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
