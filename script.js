// Check if Solana is available (e.g., through Phantom wallet)
const connectWalletButton = document.getElementById('connect-wallet');
const adminContent = document.getElementById('admin-content');

// Mock data (replace with actual Solana program calls)
const mockData = {
    totalParticipants: 1240,
    activeTickets: 5230,
    totalRevenue: 523.25,
    referralEarnings: 45.23,
    ticketPrice: 0.1,
    recentDraws: [
        { number: 256, date: '2024-03-15', l1Referrals: 15, l2Referrals: 32, l1Volume: 150.50, l2Volume: 275.00 }
    ]
};

// Function to populate the UI with data
function populateUI(data) {
    document.getElementById('total-participants').textContent = data.totalParticipants;
    document.getElementById('active-tickets').textContent = data.activeTickets;
    document.getElementById('total-revenue').textContent = `${data.totalRevenue} SOL`;
    document.getElementById('referral-earnings').textContent = `${data.referralEarnings} SOL`;
    document.getElementById('ticket-price').textContent = `${data.ticketPrice} SOL`;

    if (data.recentDraws.length > 0) {
        const draw = data.recentDraws[0];
        document.getElementById('draw-number-1').textContent = draw.number;
        document.getElementById('draw-date-1').textContent = draw.date;
        document.getElementById('l1-referrals-1').textContent = draw.l1Referrals;
        document.getElementById('l2-referrals-1').textContent = draw.l2Referrals;
        document.getElementById('l1-volume-1').textContent = `${draw.l1Volume} SOL`;
        document.getElementById('l2-volume-1').textContent = `${draw.l2Volume} SOL`;
    }
}

// Wallet connection
connectWalletButton.addEventListener('click', async () => {
    try {
        if (window.solana && window.solana.isPhantom) {
            // Connect to Phantom wallet
            await window.solana.connect();
            const publicKey = window.solana.publicKey.toString();
            console.log('Connected to wallet:', publicKey);

            // Show the admin content
            adminContent.classList.remove('hidden');
            connectWalletButton.textContent = 'Wallet Connected';

            // Populate the UI with mock data (replace with actual Solana program calls)
            populateUI(mockData);

            // In a real scenario, you would fetch data from the Solana program here
            // Example: Fetch lottery data using @solana/web3.js
            /*
            const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
            const programId = new solanaWeb3.PublicKey('DfCSQQ6a3CTHf92X9YF7MiitMRbNaZZfbgFZ4yQrbcCd');
            const lotteryAccount = ...; // Fetch the lottery account
            const data = await connection.getAccountInfo(lotteryAccount);
            // Parse and populate UI with real data
            */
        } else {
            alert('Please install Phantom wallet to connect.');
        }
    } catch (error) {
        console.error('Error connecting to wallet:', error);
        alert('Failed to connect wallet. Please try again.');
    }
});

// Handle ticket generation (mock for now)
document.getElementById('generate-tickets').addEventListener('click', () => {
    const ticketCount = document.getElementById('ticket-count').value;
    const referralAddress = document.getElementById('referral-address').value;

    if (!ticketCount || ticketCount <= 0) {
        alert('Please enter a valid number of tickets.');
        return;
    }

    console.log('Generating tickets:', ticketCount, 'Referral:', referralAddress);
    alert(`Generated ${ticketCount} tickets!`); // Mock action

    // In a real scenario, you would call the `buyTickets` function from the Solana program
    /*
    const transaction = new solanaWeb3.Transaction().add(
        // Call the buyTickets instruction
    );
    await window.solana.signAndSendTransaction(transaction);
    */
});
