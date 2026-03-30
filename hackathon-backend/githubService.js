const axios = require("axios");
const fs = require("fs").promises; // Import fs.promises for async file operations

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Ensure GITHUB_TOKEN is loaded via dotenv
const ORG = process.env.ORG_NAME;

// Helper function to get common GitHub API headers
function getGitHubHeaders() {
    return {
        Authorization: `Bearer ${GITHUB_TOKEN}`, // Use Bearer token
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28", // Specify API version
    };
}

async function createRepo(repoName){

    const response = await axios.post(
        `https://api.github.com/orgs/${ORG}/repos`,
        {
            name: repoName,
            private: true,
        },
        {
            headers: getGitHubHeaders(),
        },
    );

    return response.data.html_url;
}

// check if repo exists on GitHub
async function checkRepoExists(repoName) {
    try {
        await axios.get(`https://api.github.com/repos/${ORG}/${repoName}`, {
            headers: getGitHubHeaders(),
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

// add collaborators
async function addCollaborator(repoName, username) {
    await axios.put(
        `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${username}`,
        {},
        {
            headers: getGitHubHeaders(),
        },
    );
}

async function validateGithubUser(username) {
    try {
        await axios.get(`https://api.github.com/users/${username}`);
        return true;
    } catch (error) {
        // Log unexpected errors for debugging, but still return false for invalid user
        if (error.response?.status !== 404) {
            console.error("validateGithubUser error:", error.response?.status, error.message);
        }
        return false;
    }
}

async function createFile(repoName, fileName, content) {
    const encodedContent = Buffer.from(content).toString("base64");

    try {
        await axios.put(
            `https://api.github.com/repos/${ORG}/${repoName}/contents/${fileName}`,
            {
                message: `Add ${fileName}`,
                content: encodedContent,
            },
            { headers: getGitHubHeaders() },
        );
    } catch (error) {
        if (error.response?.status === 409) {
            console.warn(`File ${fileName} already exists in ${repoName}. Skipping creation.`);
            return; // Treat 409 as a non-fatal success for file creation
        }
        throw error; // Re-throw other errors
    }
}

async function lockRepository(repoName, members) {
    for (const user of members) {
        await axios.put(
            `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${user}`,
            {
                permission: "pull",
            },
            { headers: getGitHubHeaders() },
        );
    }
}

async function deleteRepo(repoName) {
    try {
        await axios.delete(
            `https://api.github.com/repos/${ORG}/${repoName}`,
            {
                headers: getGitHubHeaders(),
                timeout: 10000, // 10 second timeout
            },
        );
    } catch (error) {
        throw error; // Re-throw to be handled by the caller
    }
}

module.exports = {
    createRepo,
    checkRepoExists,
    addCollaborator,
    validateGithubUser,
    createFile,
    lockRepository,
    deleteRepo,
};