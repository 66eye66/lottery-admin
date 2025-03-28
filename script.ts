// src/script.ts

// Connection to Solana devnet
const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');

// Program ID
const PROGRAM_ID = new solanaWeb3.PublicKey('DfCSQQ6a3CTHf92X9YF7MiitMRbNaZZfbgFZ4yQrbcCd');

// Derive the lottery account PDA
async function getLotteryAccount(): Promise<solanaWeb3.PublicKey> {
    const [lotteryPDA] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('lottery')],
        PROGRAM_ID
    );
    return lotteryPDA;
}

// Derive the user ticket account PDA
async function getUserTicketAccount(userPublicKey: solanaWeb3.PublicKey): Promise<solanaWeb3.PublicKey> {
    const [userTicketPDA] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('user_ticket'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userTicketPDA;
}

// Derive the user referral account PDA
async function getUserReferralAccount(userPublicKey: solanaWeb3.PublicKey): Promise<solanaWeb3.PublicKey> {
    const [userReferralPDA] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('user_referral'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userReferralPDA;
}

// Interface for lottery data
interface LotteryData {
    totalParticipants: number;
    activeTickets: number;
    totalRevenue: number;
    ticketPrice: number;
}

// Fetch lottery data
async function fetchLotteryData(): Promise<LotteryData> {
    try {
        const lotteryAccount = await getLotteryAccount();
        const accountInfo = await connection.getAccountInfo(lotteryAccount);
        if (!accountInfo) {
            throw new Error('Lottery account not found. Please initialize the lottery.');
        }
        const data = accountInfo.data;

        // Parse account data
        const owner = new solanaWeb3.PublicKey(data.slice(0, 32));
        const netPool = new solanaWeb3.u64(data.slice(32, 40), 10, 'le').toNumber();
        const ticketCount = new solanaWeb3.u64(data.slice(40, 48), 10, 'le').toNumber();
        const lastDraw = new solanaWeb3.BN(data.slice(48, 56), 10, 'le').toNumber();
        const processing = Boolean(data[56]);
        const ticketPrice = new solanaWeb3.u64(data.slice(57, 65), 10, 'le').toNumber();

        return {
            totalParticipants: ticketCount,
            activeTickets: ticketCount,
            totalRevenue: netPool / 1_000_000_000, // Convert lamports to SOL
            ticketPrice: ticketPrice / 1_000_000_000, // Convert lamports to SOL
        };
    } catch (error) {
        console.error('Error fetching lottery data:', error);
        throw error;
    }
}

// Fetch referral earnings
async function fetchReferralEarnings(userPublicKey: solanaWeb3.PublicKey): Promise<number> {
    try {
        const referralAccount = await getUserReferralAccount(userPublicKey);
        const accountInfo = await connection.getAccountInfo(referralAccount);
        if (!accountInfo) {
            return 0;
        }
        const data = accountInfo.data;

        // Parse referral account data
        const totalEarnings = new solanaWeb3.u64(data.slice(160, 168), 10, 'le').toNumber();
        return totalEarnings / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
        console.error('Error fetching referral earnings:', error);
        return 0;
    }
}

// Interface for recent draw data
interface RecentDraw {
    number: number;
    date: string;
    l1Referrals: number;
    l2Referrals: number;
    l1Volume: number;
    l2Volume: number;
}

// Mock recent draws
function fetchRecentDraws(): RecentDraw[] {
    return [
        { number: 256, date: '2024-03-15', l1Referrals: 15, l2Referrals: 32, l1Volume: 150.50, l2Volume: 275.00 }
    ];
}

// Interface for UI data
interface UIData {
    totalParticipants: number;
    activeTickets: number;
    totalRevenue: number;
    referralEarnings: number;
    ticketPrice: number;
    recentDraws: RecentDraw[];
}

// Populate the UI
function populateUI(data: UIData): void {
    document.getElementById('total-participants')!.textContent = data.totalParticipants.toString();
    document.getElementById('active-tickets')!.textContent = data.activeTickets.toString();
    document.getElementById('total-revenue')!.textContent = `${data.totalRevenue.toFixed(2)} SOL`;
    document.getElementById('referral-earnings')!.textContent = `${data.referralEarnings.toFixed(2)} SOL`;
    document.getElementById('ticket-price')!.textContent = `${data.ticketPrice.toFixed(2)} SOL`;
    if (data.recentDraws.length > 0) {
        const draw = data.recentDraws[0];
        document.getElementById('draw-number-1')!.textContent = draw.number.toString();
        document.getElementById('draw-date-1')!.textContent = draw.date;
        document.getElementById('l1-referrals-1')!.textContent = draw.l1Referrals.toString();
        document.getElementById('l2-referrals-1')!.textContent = draw.l2Referrals.toString();
        document.getElementById('l1-volume-1')!.textContent = `${draw.l1Volume.toFixed(2)} SOL`;
        document.getElementById('l2-volume-1')!.textContent = `${draw.l2Volume.toFixed(2)} SOL`;
    }
}

// Wallet connection
document.getElementById('connect-wallet')!.addEventListener('click', async () => {
    try {
        if (window.solana && window.solana.isPhantom) {
            await window.solana.connect();
            const userPublicKey = window.solana.publicKey as solanaWeb3.PublicKey;
            console.log('Connected to wallet:', userPublicKey.toString());
            document.getElementById('admin-content')!.classList.remove('hidden');
            document.getElementById('connect-wallet')!.textContent = 'Wallet Connected';

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
        alert('Failed to connect wallet or fetch data. Please ensure the lottery is initialized and try again.');
    }
});

// Generate tickets
document.getElementById('generate-tickets')!.addEventListener('click', async () => {
    try {
        const ticketCountInput = document.getElementById('ticket-count') as HTMLInputElement;
        const referralAddressInput = document.getElementById('referral-address') as HTMLInputElement;
        const ticketCount = parseInt(ticketCountInput.value);
        const referralAddress = referralAddressInput.value;
        if (!ticketCount || ticketCount <= 0) {
            alert('Please enter a valid number of tickets.');
            return;
        }
        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey as solanaWeb3.PublicKey;
        const lotteryAccount = await getLotteryAccount();
        const userTicketAccount = await getUserTicketAccount(userPublicKey);
        const userReferralAccount = await getUserReferralAccount(userPublicKey);

        const accounts: solanaWeb3.AccountMeta[] = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userTicketAccount, isSigner: false, isWritable: true },
            { pubkey: userReferralAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        const instructionData = Buffer.alloc(9);
        instructionData.writeUInt8(1, 0); // buyTickets instruction index
        instructionData.writeBigUInt64LE(BigInt(ticketCount), 1);

        const transaction = new solanaWeb3.Transaction().add({
            programId: PROGRAM_ID,
            keys: accounts,
            data: instructionData,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signedTransaction = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signedTransaction.signature);

        alert(`Successfully generated ${ticketCount} tickets! Transaction signature: ${signedTransaction.signature}`);
        location.reload(); // Refresh the page to update data
    } catch (error) {
        console.error('Error generating tickets:', error);
        alert('Failed to generate tickets. Please try again.');
    }
});

// Set ticket price
document.getElementById('set-ticket-price')!.addEventListener('click', async () => {
    try {
        const newPriceInput = document.getElementById('new-ticket-price') as HTMLInputElement;
        const newPriceSol = parseFloat(newPriceInput.value);
        if (!newPriceSol || newPriceSol < 0.001) {
            alert('Please enter a valid ticket price (minimum 0.001 SOL).');
            return;
        }
        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey as solanaWeb3.PublicKey;
        const lotteryAccount = await getLotteryAccount();
        const newPriceLamports = Math.round(newPriceSol * 1_000_000_000);

        const accounts: solanaWeb3.AccountMeta[] = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: false },
        ];

        const instructionData = Buffer.alloc(9);
        instructionData.writeUInt8(4, 0); // setTicketPrice instruction index
        instructionData.writeBigUInt64LE(BigInt(newPriceLamports), 1);

        const transaction = new solanaWeb3.Transaction().add({
            programId: PROGRAM_ID,
            keys: accounts,
            data: instructionData,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signedTransaction = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signedTransaction.signature);

        alert(`Successfully set ticket price to ${newPriceSol} SOL! Transaction signature: ${signedTransaction.signature}`);
        location.reload(); // Refresh the page to update data
    } catch (error) {
        console.error('Error setting ticket price:', error);
        alert('Failed to set ticket price. Please try again.');
    }
});

// Draw lottery
document.getElementById('draw-lottery')!.addEventListener('click', async () => {
    try {
        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey as solanaWeb3.PublicKey;
        const lotteryAccount = await getLotteryAccount();

        // Placeholder winner accounts (implement winner selection logic in a real scenario)
        const winner1 = new solanaWeb3.PublicKey('11111111111111111111111111111111');
        const winner2 = new solanaWeb3.PublicKey('22222222222222222222222222222222');
        const winner3 = new solanaWeb3.PublicKey('33333333333333333333333333333333');

        const accounts: solanaWeb3.AccountMeta[] = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: false },
            { pubkey: winner1, isSigner: false, isWritable: true },
            { pubkey: winner2, isSigner: false, isWritable: true },
            { pubkey: winner3, isSigner: false, isWritable: true },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        const instructionData = Buffer.alloc(1);
        instructionData.writeUInt8(2, 0); // draw instruction index

        const transaction = new solanaWeb3.Transaction().add({
            programId: PROGRAM_ID,
            keys: accounts,
            data: instructionData,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signedTransaction = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signedTransaction.signature);

        alert(`Successfully drew the lottery! Transaction signature: ${signedTransaction.signature}`);
        location.reload(); // Refresh the page to update data
    } catch (error) {
        console.error('Error drawing lottery:', error);
        alert('Failed to draw lottery. Please try again.');
    }
});

// Withdraw funds
document.getElementById('withdraw-funds')!.addEventListener('click', async () => {
    try {
        const amountInput = document.getElementById('withdraw-amount') as HTMLInputElement;
        const amountSol = parseFloat(amountInput.value);
        if (!amountSol || amountSol <= 0) {
            alert('Please enter a valid amount to withdraw.');
            return;
        }
        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey as solanaWeb3.PublicKey;
        const lotteryAccount = await getLotteryAccount();
        const amountLamports = Math.round(amountSol * 1_000_000_000);

        const accounts: solanaWeb3.AccountMeta[] = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
        ];

        const instructionData = Buffer.alloc(9);
        instructionData.writeUInt8(3, 0); // withdraw instruction index
        instructionData.writeBigUInt64LE(BigInt(amountLamports), 1);

        const transaction = new solanaWeb3.Transaction().add({
            programId: PROGRAM_ID,
            keys: accounts,
            data: instructionData,
        });

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = userPublicKey;

        const signedTransaction = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signedTransaction.signature);

        alert(`Successfully withdrew ${amountSol} SOL! Transaction signature: ${signedTransaction.signature}`);
        location.reload(); // Refresh the page to update data
    } catch (error) {
        console.error('Error withdrawing funds:', error);
        alert('Failed to withdraw funds. Please try again.');
    }
});
