const nodemailer = require("nodemailer");

async function sendEmail(email, repoUrl, teamName) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER, // Ensure EMAIL_USER is loaded via dotenv
            pass: process.env.EMAIL_PASS, // Ensure EMAIL_PASS is loaded via dotenv
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

module.exports = { sendEmail };