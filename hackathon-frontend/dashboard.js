let teamsData = [];

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000'; // Default to localhost for dev

// Modern Modal Functions
function showModal(type, title, message, buttons = []) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalIcon = document.getElementById('modalIcon');
    const modalIconSymbol = document.getElementById('modalIconSymbol');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalButtons = document.getElementById('modalButtons');

    // Reset classes
    modalIcon.className = 'modal-icon';
    
    // Set icon based on type
    if (type === 'success') {
        modalIcon.classList.add('success');
        modalIconSymbol.textContent = '✓';
    } else if (type === 'error') {
        modalIcon.classList.add('error');
        modalIconSymbol.textContent = '✕';
    } else if (type === 'confirm') {
        modalIcon.classList.add('confirm');
        modalIconSymbol.textContent = '?';
    }

    // Set content
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Clear and add buttons
    modalButtons.innerHTML = '';
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `modal-btn ${btn.class}`;
        button.innerHTML = `<span>${btn.text}</span>`;
        button.onclick = () => {
            closeModal();
            if (btn.action) btn.action();
        };
        modalButtons.appendChild(button);
    });

    // Show modal
    modalOverlay.classList.add('active');
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
});

// Fetch teams from backend
async function fetchTeams() {
    try {
        const response = await fetch(`${API_BASE_URL}/teams`);
        if (!response.ok) throw new Error('Failed to fetch teams');
        teamsData = await response.json();
        renderTable(teamsData);
    } catch (error) {
        console.error('Error fetching teams:', error);
        document.getElementById('teamTable').innerHTML = '<tr><td colspan="7">Error loading data</td></tr>';
    }
}

// Render table rows
function renderTable(teams) {
    const tbody = document.getElementById('teamTable');
    const statusFilter = document.getElementById('statusFilter').value;
    tbody.innerHTML = '';

    if (teams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No teams found</td></tr>';
        return;
    }

    teams.forEach(team => {
        const row = document.createElement('tr');
        
        // Handle members display
        let members = team.members;
        if (Array.isArray(members)) {
            members = members.join(', ');
        } else if (!members && (team.member1)) {
             members = [team.member1, team.member2, team.member3, team.member4].filter(Boolean).join(', ');
        }

        const isEliminated = team.status === 'Eliminated';
        const nextStatus = isEliminated ? 'Active' : 'Eliminated';
        const buttonText = isEliminated ? 'Restore' : 'Eliminate';

        let eliminateBtn = '';
        if (statusFilter !== "") {
            eliminateBtn = `<button class="eliminate-btn" onclick="updateStatus('${team._id}', '${nextStatus}')">${buttonText}</button>`;
        }

        row.innerHTML = `
            <td>${team.teamName || 'N/A'}</td>
            <td>${members || 'N/A'}</td>
            <td>${team.domain || 'N/A'}</td>
            <td>${team.email || 'N/A'}</td>
            <td><a href="${team.repoUrl || '#'}" target="_blank">Repo</a></td>
            <td>
                <input type="number" class="score-input" value="${team.score || 0}" id="score-${team._id}">
            </td>
            <td class="action-buttons">
                <button class="save-btn" onclick="updateScore('${team._id}')">Save</button>
                ${eliminateBtn}
                <button class="delete-btn" onclick="deleteTeam('${team._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter function
function filterTeams() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const minScore = parseFloat(document.getElementById('minScore').value) || 0;
    const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;

    const filtered = teamsData.filter(team => {
        // Search filter
        const matchesSearch = (team.teamName || '').toLowerCase().includes(searchTerm);

        // Status filter
        const teamStatus = team.status || 'Active'; 
        const matchesStatus = statusFilter ? teamStatus === statusFilter : true;

        // Domain filter
        const matchesDomain = domainFilter ? (team.domain === domainFilter) : true;

        // Score filter
        const score = team.score || 0;
        const matchesScore = score >= minScore && score <= maxScore;

        return matchesSearch && matchesStatus && matchesDomain && matchesScore;
    });

    renderTable(filtered);
}

// Update Score
async function updateScore(id) {
    const scoreInput = document.getElementById(`score-${id}`);
    const newScoreValue = scoreInput.value;

    // Ensure the score is a number.
    const newScore = parseFloat(newScoreValue);

    if (isNaN(newScore)) {
        return showModal('error', 'Invalid Input', 'Please enter a valid number for the score.', [
            { text: 'OK', class: 'modal-btn-primary' }
        ]);
    }

    try {
        await fetch(`${API_BASE_URL}/teams/${id}/score`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: newScore }) // Send as a number
        });
        const team = teamsData.find(t => t._id === id);
        if (team) {
            team.score = newScore;
            showModal('success', 'Score Updated', `Score updated for team '${team.teamName}' successfully.`, [
                { text: 'Great!', class: 'modal-btn-primary' }
            ]);
        } else {
            showModal('success', 'Score Updated', 'Score updated successfully.', [
                { text: 'Great!', class: 'modal-btn-primary' }
            ]);
        }
    } catch (error) {
        console.error('Error updating score:', error);
        showModal('error', 'Update Failed', 'Failed to update score. Please try again.', [
            { text: 'OK', class: 'modal-btn-primary' }
        ]);
    }
}

// Update Status
async function updateStatus(id, status) {
    try {
        await fetch(`http://localhost:5000/teams/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const team = teamsData.find(t => t._id === id);
        const actionText = status === 'Active' ? 'restored' : 'eliminated';
        const actionTitle = status === 'Active' ? 'Team Restored' : 'Team Eliminated';
        if (team) {
            team.status = status;
            showModal('success', actionTitle, `Team '${team.teamName}' ${actionText} successfully.`, [
                { text: 'OK', class: 'modal-btn-primary' }
            ]);
        } else {
            showModal('success', actionTitle, `Team ${actionText} successfully.`, [
                { text: 'OK', class: 'modal-btn-primary' }
            ]);
        }
        filterTeams(); 
    } catch (error) {
        console.error('Error updating status:', error);
        showModal('error', 'Update Failed', 'Failed to update team status. Please try again.', [
            { text: 'OK', class: 'modal-btn-primary' }
        ]);
    }
}

// Delete Team
async function deleteTeam(id) {
    const team = teamsData.find(t => t._id === id);
    const teamName = team ? team.teamName : 'this team';
    
    showModal('confirm', 'Confirm Deletion', `Are you sure you want to delete ${teamName}? This action cannot be undone.`, [
        {
            text: 'Delete',
            class: 'modal-btn-danger',
            action: async () => {
                try {
                    await fetch(`${API_BASE_URL}/teams/${id}`, {
                        method: 'DELETE'
                    });
                    teamsData = teamsData.filter(t => t._id !== id);
                    filterTeams();
                    showModal('success', 'Team Deleted', `Team ${teamName} has been successfully deleted.`, [
                        { text: 'OK', class: 'modal-btn-primary' }
                    ]);
                } catch (error) {
                    console.error('Error deleting team:', error);
                    showModal('error', 'Delete Failed', 'Failed to delete team. Please try again.', [
                        { text: 'OK', class: 'modal-btn-primary' }
                    ]);
                }
            }
        },
        {
            text: 'Cancel',
            class: 'modal-btn-secondary'
        }
    ]);
}

// Download PDF
function downloadPDF() {
    const { jsPDF } = window.jspdf; // Destructure jsPDF from window
    const doc = new jsPDF(); // Create a new jsPDF instance
    // Re-apply filtering logic to get the currently displayed teams
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const minScore = parseFloat(document.getElementById('minScore').value) || 0;
    const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;

    const filteredTeams = teamsData.filter(team => {
        const matchesSearch = (team.teamName || '').toLowerCase().includes(searchTerm);
        const teamStatus = team.status || 'Active'; 
        const matchesStatus = statusFilter ? teamStatus === statusFilter : true;
        const matchesDomain = domainFilter ? (team.domain === domainFilter) : true;
        const score = team.score || 0;
        const matchesScore = score >= minScore && score <= maxScore;
        return matchesSearch && matchesStatus && matchesDomain && matchesScore;
    });

    // Define table headers for the PDF
    const head = [['Sl. No.', 'Team Name', 'Members', 'Domain', 'Email', 'Repository', 'Score', 'Status']];

    // Map filtered team data to the format required by jspdf-autotable
    const body = filteredTeams.map((team, index) => {
        let members = team.members;
        if (Array.isArray(members)) {
            members = members.join(', ');
        } else if (!members && (team.member1)) {
             members = [team.member1, team.member2, team.member3, team.member4].filter(Boolean).join(', ');
        }
        return [
            index + 1, // Sl. No.
            team.teamName || 'N/A',
            members || 'N/A',
            team.domain || 'N/A',
            team.email || 'N/A',
            team.repoUrl || '#',
            team.score || 0,
            team.status || 'N/A'
        ];
    });

    doc.text("Hackathon Teams", 14, 10); // Title for the PDF
    doc.autoTable({
        head: head,
        body: body,
        margin: { top: 20, right: 10, bottom: 10, left: 10 }, // Add margins for better spacing
        startY: 20, // Start table below the title
        tableWidth: 'auto', // Adjust table width automatically
        pageBreak: 'auto', // Handle page breaks automatically for long tables
        didDrawPage: function (data) {
            // Add page number to footer
            doc.text('Page ' + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
        styles: {
            font: 'helvetica', // Use a standard font
            fontSize: 10,
            cellPadding: 3,
            valign: 'middle',
            halign: 'center'
        },
        headStyles: {
            fillColor: [102, 126, 234], // Matching dashboard header color
            textColor: [0, 0, 0], // Black text for header
            fontStyle: 'bold'
        },
        bodyStyles: {
            fillColor: [255, 255, 255], // White background for body rows
            textColor: [0, 0, 0] // Black text for body rows
        },
        alternateRowStyles: {
            fillColor: [240, 240, 240], // Light gray for alternate rows
            textColor: [0, 0, 0] // Black text for alternate rows
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' }, // Sl. No. column
            1: { cellWidth: 'auto' }, // Team Name
            2: { cellWidth: 'auto' }, // Members
            5: { cellWidth: 20, halign: 'center' }, // Score
        },
    });
    doc.save('hackathon-teams.pdf');
}

// Download Excel
function downloadExcel() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const domainFilter = document.getElementById('domainFilter').value;
    const minScore = parseFloat(document.getElementById('minScore').value) || 0;
    const maxScore = parseFloat(document.getElementById('maxScore').value) || 100;

    const filteredTeams = teamsData.filter(team => {
        const matchesSearch = (team.teamName || '').toLowerCase().includes(searchTerm);
        const teamStatus = team.status || 'Active'; 
        const matchesStatus = statusFilter ? teamStatus === statusFilter : true;
        const matchesDomain = domainFilter ? (team.domain === domainFilter) : true;
        const score = team.score || 0;
        const matchesScore = score >= minScore && score <= maxScore;
        return matchesSearch && matchesStatus && matchesDomain && matchesScore;
    });

    // Fix: Ensure 'index' is passed correctly to the map callback
    const dataToExport = filteredTeams.map((team, index) => { 
        let members = team.members;
        if (Array.isArray(members)) {
            members = members.join(', ');
        } else if (!members && (team.member1)) {
             members = [team.member1, team.member2, team.member3, team.member4].filter(Boolean).join(', ');
        }
        return {
            'Sl. No.': index + 1, // Add Sl. No.
            'Team Name': team.teamName || 'N/A',
            'Members': members || 'N/A',
            'Domain': team.domain || 'N/A',
            'Email': team.email || 'N/A',
            'Repo': team.repoUrl || '#',
            'Score': team.score || 0,
            'Status': team.status || 'N/A'
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teams");
    XLSX.writeFile(wb, "hackathon-teams.xlsx");
}

// Event Listeners
document.getElementById('search').addEventListener('input', filterTeams);
document.getElementById('statusFilter').addEventListener('change', filterTeams);
document.getElementById('domainFilter').addEventListener('change', filterTeams);
document.getElementById('minScore').addEventListener('input', filterTeams);
document.getElementById('maxScore').addEventListener('input', filterTeams);

// Initial fetch
fetchTeams();