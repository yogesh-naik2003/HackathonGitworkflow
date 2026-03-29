const axios = require("axios");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.ORG_NAME;

async function createRepo(repoName){

    const response = await axios.post(
        `https://api.github.com/orgs/${ORG}/repos`,
        {
            name: repoName,
            private: true
        },
        {
            headers:{
                Authorization: `token ${GITHUB_TOKEN}`
            }
        }
    );

    return response.data.html_url;
}

module.exports = { createRepo };