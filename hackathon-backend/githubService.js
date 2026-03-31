const axios = require("axios");
const fs = require("fs").promises; // Import fs.promises for async file operations

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Ensure GITHUB_TOKEN is loaded via dotenv
const ORG = process.env.ORG_NAME;

// Log environment variables at module load for debugging
console.log("githubService: GITHUB_TOKEN length:", GITHUB_TOKEN ? GITHUB_TOKEN.length : "undefined");
console.log("githubService: ORG_NAME:", ORG);

// Helper function to get common GitHub API headers
function getGitHubHeaders() {
    return {
        Authorization: `Bearer ${GITHUB_TOKEN}`, // Use Bearer token
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json", // Good practice for POST/PUT requests
        "X-GitHub-Api-Version": "2022-11-28", // Specify API version
    };
}

async function createRepo(repoName){
    try {
        const response = await axios.post(
            `https://api.github.com/orgs/${ORG}/repos`,
            {
                name: repoName,
                private: true,
            },
            { 
                timeout: 10000, // 10 second timeout for API calls
                headers: getGitHubHeaders(), // Combine headers into the same config object
            },
        );
        return response.data.html_url;
    } catch (error) {
        // Log the detailed GitHub error and re-throw it
        logGitHubErrorDetails(error, `Error creating GitHub repository ${repoName}`);
        throw error; // Re-throw to allow the worker's catch block to handle job failure/retries
    }
}

function logGitHubErrorDetails(error, contextMessage) {
    console.error(`${contextMessage}:`, {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        // Crucially, log the specific errors array from GitHub's response
        githubErrors: error.response?.data?.errors,
        documentation_url: error.response?.data?.documentation_url,
    });
    if (!error.response) {
        console.error("Full error object (no response):", error);
        console.error("Error code:", error.code); // e.g., 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'
    }
}

// check if repo exists on GitHub
async function checkRepoExists(repoName) {
    try {
        await axios.get(`https://api.github.com/repos/${ORG}/${repoName}`, {
            headers: getGitHubHeaders(), timeout: 10000,
        });
        return true;
    } catch (error) {
        if (error.response?.status === 404) {
            return false;
        }
        logGitHubErrorDetails(error, "checkRepoExists error");
        return false;
    }
}

// add collaborators
async function addCollaborator(repoName, username) {
    try {
        await axios.put(
            `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${username}`,
            { permission: "pull" }, // Explicitly set permission
            {
                timeout: 10000, // Combine timeout and headers into one config object
                headers: getGitHubHeaders(),
            },
        );
        console.log(`Successfully added collaborator ${username} to ${repoName}.`);
        return { success: true, username };
    } catch (error) {
        logGitHubErrorDetails(error, `Error adding collaborator ${username} to ${repoName}`);
        // Instead of re-throwing, return a failure object.
        // This allows Promise.allSettled to complete for other successful operations.
        return { success: false, username, error: error.response?.data?.message || error.message, githubErrors: error.response?.data?.errors };
    }
}

async function validateGithubUser(username) {
    try {
        await axios.get(`https://api.github.com/users/${username}`, { timeout: 10000 });
        return true;
    } catch (error) {
        // Log all errors during validation for debugging
        console.error("Full error object in validateGithubUser catch:", error); // Added for detailed debugging
        logGitHubErrorDetails(error, `validateGithubUser error for ${username}`);
        return false;
    }
}

async function createFile(repoName, fileName, content) {
    const encodedContent = Buffer.from(content).toString("base64");

    console.log(`GitHubService: Attempting PUT request for ${fileName} in ${repoName}`);

    try {
        const response = await axios.put(
            `https://api.github.com/repos/${ORG}/${repoName}/contents/${fileName}`,
            {
                message: `Add ${fileName}`,
                content: encodedContent,
                branch: 'main', // Explicitly specify the branch
            },
            { headers: getGitHubHeaders(), timeout: 10000 },
        );
        console.log(`Successfully created/updated file ${fileName} in ${repoName}. SHA: ${response.data.content.sha}`);
    } catch (error) {
        if (error.response?.status === 409) {
            console.warn(`File ${fileName} already exists in ${repoName}. Skipping creation.`);
            return; // Treat 409 as a non-fatal success for file creation
        }
        logGitHubErrorDetails(error, `Error creating file ${fileName} in ${repoName}`);
        throw error; // Re-throw other errors after logging
    }
}

async function lockRepository(repoName, members) {
    for (const user of members) {
        await axios.put(
            `https://api.github.com/repos/${ORG}/${repoName}/collaborators/${user}`,
            {
                permission: "pull",
            },
            { headers: getGitHubHeaders(), timeout: 10000 },
        );
    }
}

async function deleteRepo(repoName) {
    try {
        await axios.delete(
            `https://api.github.com/repos/${ORG}/${repoName}`,
            {
                headers: getGitHubHeaders(), timeout: 10000, // Correctly combine into one object
            },
        );
    } catch (error) {
        logGitHubErrorDetails(error, `Error deleting repo ${repoName}`);
        throw error;
    }
}

async function listRepoContents(repoName, path = '') {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${ORG}/${repoName}/contents/${path}`,
            { 
                timeout: 10000, 
                headers: getGitHubHeaders() 
            }
        );
        return response.data;
    } catch (error) {
        logGitHubErrorDetails(error, `Error listing contents for ${repoName}/${path}`);
        return []; // Return empty array on error
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
    listRepoContents,
};