document.addEventListener('DOMContentLoaded', () => {
    const teamForm = document.getElementById('teamForm');
    const submitButton = teamForm.querySelector('button[type="submit"]');
    const buttonText = document.getElementById('buttonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const popup = document.getElementById('popup');
    const popupTitle = document.getElementById('popupTitle');
    const repoLinkElement = document.getElementById('repoLink');

    teamForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Disable button and show loading message inside the button
        submitButton.disabled = true;
        buttonText.style.display = 'none';
        loadingSpinner.style.display = 'inline';

        const teamName = document.getElementById('teamName').value;
        const member1 = document.getElementById('member1').value;
        const member2 = document.getElementById('member2').value;
        const member3 = document.getElementById('member3').value;
        const member4 = document.getElementById('member4').value;
        const domain = document.getElementById('domain').value;
        const email = document.getElementById('email').value;

        const members = [member1, member2, member3, member4].filter(Boolean);

        const teamData = {
            teamName,
            members,
            domain,
            email
        };

        try {
            const response = await fetch('http://localhost:5000/create-repo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamData)
            });

            const result = await response.json();

            if (response.ok) {
                popupTitle.innerHTML = 'Repository Created Successfully🎉';
                repoLinkElement.innerHTML = `Check your registered mail to get the GitHub repository link.<br>Thank You!`;
                popup.style.display = 'flex'; // Display the popup
            } else {
                console.error('Server error response:', result); // Log the full error response
                popupTitle.innerHTML = 'Registration Failed!';
                repoLinkElement.innerHTML = `<span style="color: #ff6b6b;">${result.error || result.message || 'An unknown error occurred.'}</span>`;
                popup.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error during registration:', error);
            popupTitle.innerHTML = 'Error!';
            repoLinkElement.innerHTML = `<span style="color: #ff6b6b;">An error occurred during registration: ${error.message}</span>`;
            popup.style.display = 'flex';
        } finally {
            // Re-enable button and hide loading message
            submitButton.disabled = false; // Re-enable the button
            buttonText.style.display = 'inline'; // Show original text
            loadingSpinner.style.display = 'none'; // Hide loading spinner
        }
    });
});

function closePopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('teamForm').reset();
}