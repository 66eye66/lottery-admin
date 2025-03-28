// Import Solana web3.js (already included in index.html via CDN)
const { Connection, PublicKey, Transaction, SystemProgram, AccountMeta } = window.solanaWeb3;
const { struct, u64, bool, i64, publicKey } = window.Borsh; // For Borsh serialization (you may need to include a Borsh library)

// UI Elements
const connectWalletButton = document.getElementById('connect-wallet');
const adminContent = document.getElementById('admin-content');
const generateTicketsButton = document.getElementById('generate-tickets');

// Program ID from your code
const PROGRAM_ID = new PublicKey('DfCSQQ6a3CTHf92X9YF7MiitMRbNaZZfbgFZ4yQrbcCd');

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Lottery account structure (based on your program's Lottery struct)
const LotterySchema = struct({
    owner: publicKey(),
    netPool: u64(),
    ticketCount: u64(),
    lastDraw: i64(),
    processing: bool(),
    ticketPrice: u64(),
});

// Referral account structure (based on your program's ReferralAccount struct)
const ReferralAccountSchema = struct({
    parent: publicKey(),
    l1Count: u64(),
    l2Count: u64(),
    l1Sum: u64(),
    l2Sum: u64(),
    totalEarnings: u64(),
});

// User ticket account structure (based on your program's UserTicket struct)
const UserTicketSchema = struct({
    owner: publicKey(),
    count: u64(),
});

// Function to derive the lottery account PDA (assuming the lottery account is a PDA)
async function getLotteryAccount() {
    // In a real scenario, you need to know the seed used to create the lottery account.
    // For simplicity, let's assume the lottery account is a PDA with a known seed (e.g., "lottery").
    const [lotteryPDA, _] = await PublicKey.findProgramAddress(
        [Buffer.from('lottery')],
        PROGRAM_ID
    );
    return lotteryPDA;
}

// Function to derive the user ticket account PDA
async function getUserTicketAccount(userPublicKey) {
    const [userTicketPDA, _] = await PublicKey.findProgramAddress(
        [Buffer.from('user_ticket'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userTicketPDA;
}

// Function to derive the user referral account PDA
async function getUserReferralAccount(userPublicKey) {
    const [userReferralPDA, _] = await PublicKey.findProgramAddress(
        [Buffer.from('user_referral'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userReferralPDA;
}

// Function to fetch lottery data
async function fetchLotteryData() {
    const lotteryAccount = await getLotteryAccount();
    const accountInfo = await connection.getAccountInfo(lotteryAccount);
    if (!accountInfo) {
        throw new Error('Lottery account not found');
    }

    // Deserialize the lottery account data
    const lotteryData = LotterySchema.deserialize(accountInfo.data);
    return {
        totalParticipants: lotteryData.ticketCount, // Approximation (you may need a separate counter for unique participants)
        activeTickets: lotteryData.ticketCount,
        totalRevenue: lotteryData.netPool / 1_000_000_000, // Convert lamports to SOL
        ticketPrice: lotteryData.ticketPrice / 1_000_000_000, // Convert lamports to SOL
    };
}

// Function to fetch referral earnings for the connected user
async function fetchReferralEarnings(userPublicKey) {
    const referralAccount = await getUserReferralAccount(userPublicKey);
    const accountInfo = await connection.getAccountInfo(referralAccount);
    if (!accountInfo) {
        return 0; // No referral account yet
    }

    // Deserialize the referral account data
    const referralData = ReferralAccountSchema.deserialize(accountInfo.data);
    return referralData.totalEarnings / 1_000_000_000; // Convert lamports to SOL
}

// Function to fetch recent draws (mocked for now, as the program doesn't store historical draws)
function fetchRecentDraws() {
    // In a real scenario, you would need to store draw history in the program or off-chain
    return [
        { number: 256, date: '2024-03-15', l1Referrals: 15, l2Referrals: 32, l1Volume: 150.50, l2Volume: 275.00 }
    ];
}

// Function to populate the UI with data
function populateUI(data) {
    document.getElementById('total-participants').textContent = data.totalParticipants;
    document.getElementById('active-tickets').textContent = data.activeTickets;
    document.getElementById('total-revenue').textContent = `${data.totalRevenue.toFixed(2)} SOL`;
    document.getElementById('referral-earnings').textContent = `${data.referralEarnings.toFixed(2)} SOL`;
    document.getElementById('ticket-price').textContent = `${data.ticketPrice.toFixed(2)} SOL`;

    if (data.recentDraws.length > 0) {
        const draw = data.recentDraws[0];
        document.getElementById('draw-number-1').textContent = draw.number;
        document.getElementById('draw-date-1').textContent = draw.date;
        document.getElementById('l1-referrals-1').textContent = draw.l1Referrals;
        document.getElementById('l2-referrals-1').textContent = draw.l2Referrals;
        document.getElementById('l1-volume-1').textContent = `${draw.l1Volume.toFixed(2)} SOL`;
        document.getElementById('l2-volume-1').textContent = `${draw.l2Volume.toFixed(2)} SOL`;
    }
}

// Wallet connection
connectWalletButton.addEventListener('click', async () => {
    try {
        if (window.solana && window.solana.isPhantom) {
            // Connect to Phantom wallet
            await window.solana.connect();
            const userPublicKey = window.solana.publicKey;
            console.log('Connected to wallet:', userPublicKey.toString());

            // Show the admin content
            adminContent.classList.remove('hidden');
            connectWalletButton.textContent = 'Wallet Connected';

            // Fetch and populate data
            const lotteryData = await fetchLotteryData();
            const referralEarnings = await fetchReferralEarnings(userPublicKey);
            const recentDraws = fetchRecentDraws();

            populateUI({
                totalParticipants: lotteryData.totalParticipants,
                activeTickets: lotteryData.activeTickets,
                totalRevenue: lotteryData.totalRevenue,
                referralEarnings: referralEarnings,
                ticketPrice: lotteryData.ticketPrice,
                recentDraws: recentDraws,
            });
        } else {
            alert('Please install Phantom wallet to connect.');
        }
    } catch (error) {
        console.error('Error connecting to wallet or fetching data:', error);
        alert('Failed to connect wallet or fetch data. Please try again.');
    }
});

// Handle ticket generation
generateTicketsButton.addEventListener('click', async () => {
    try {
        const ticketCount = parseInt(document.getElementById('ticket-count').value);
        const referralAddress = document.getElementById('referral-address').value;

        if (!ticketCount || ticketCount <= 0) {
            alert('Please enter a valid number of tickets.');
            return;
        }

        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey;
        const lotteryAccount = await getLotteryAccount();
        const userTicketAccount = await getUserTicketAccount(userPublicKey);
        const userReferralAccount = await getUserReferralAccount(userPublicKey);

        // Prepare accounts for the buyTickets instruction
        const accounts = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userTicketAccount, isSigner: false, isWritable: true },
            { pubkey: userReferralAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        // Add referral accounts if a referral address is provided
        let l1Referrer = null;
        let l1ReferralAccount = null;
        let l2Referrer = null;
        let l2ReferralAccount = null;

        if (referralAddress) {
            l1Referrer = new PublicKey(referralAddress);
            const [l1ReferralPDA, _] = await PublicKey.findProgramAddress(
                [Buffer.from('user_referral'), l1Referrer.toBuffer()],
                PROGRAM_ID
            );
            l1ReferralAccount = l1ReferralPDA;

            accounts.push({ pubkey: l1Referrer, isSigner: false, isWritable: false });
            accounts.push({ pubkey: l1ReferralAccount, isSigner: false, isWritable: true });

            // Fetch L1 referral account to get L2 referrer
            const l1ReferralInfo = await connection.getAccountInfo(l1ReferralAccount);
            if (l1ReferralInfo) {
                const l1ReferralData = ReferralAccountSchema.deserialize(l1ReferralInfo.data);
                if (!l1ReferralData.parent.equals(PublicKey.default)) {
                    l2Referrer = l1ReferralData.parent;
                    const [l2ReferralPDA, _] = await PublicKey.findProgramAddress(
                        [Buffer.from('user_referral'), l2Referrer.toBuffer()],
                        PROGRAM_ID
                    );
                    l2ReferralAccount = l2ReferralPDA;

                    accounts.push({ pubkey: l2ReferralAccount, isSigner: false, isWritable: true });
                    accounts.push({ pubkey: l2Referrer, isSigner: false, isWritable: true });
                }
            }
        }

        // Create the buyTickets instruction
        const instructionData = Buffer.alloc(9); // 1 byte for instruction index, 8 bytes for ticketCount (u64)
        instructionData.writeUInt8(1, 0); // Instruction index for buyTickets (from your program: 1)
        instructionData.writeBigUInt64LE(BigInt(ticketCount), 1); // ticketCount as u64

        const transaction = new Transaction().add({
            programId: PROGRAM_ID,
            keys: accounts,
            data: instructionData,
        });

        // Sign and send the transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signedTransaction = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signedTransaction.signature);

        alert(`Successfully generated ${ticketCount} tickets! Transaction signature: ${signedTransaction.signature}`);

        // Refresh the UI after generating tickets
        const updatedLotteryData = await fetchLotteryData();
        const updatedReferralEarnings = await fetchReferralEarnings(userPublicKey);
        const recentDraws = fetchRecentDraws();

        populateUI({
            totalParticipants: updatedLotteryData.totalParticipants,
            activeTickets: updatedLotteryData.activeTickets,
            totalRevenue: updatedLotteryData.totalRevenue,
            referralEarnings: updatedReferralEarnings,
            ticketPrice: updatedLotteryData.ticketPrice,
            recentDraws: recentDraws,
        });
    } catch (error) {
        console.error('Error generating tickets:', error);
        alert('Failed to generate tickets. Please try again.');
    }
});
