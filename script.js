const borsh = window.borsh || {};
const { serialize, deserialize, BinaryWriter, BinaryReader } = borsh;

if (!serialize || !deserialize) {
    console.error("Borsh library not loaded correctly.");
}


// Check if borsh is loaded
if (typeof borsh === 'undefined') {
    console.error('Borsh library not loaded. Please ensure the @coral-xyz/borsh script is included.');
    alert('Failed to load required libraries. Please refresh the page or check your internet connection.');
    throw new Error('Borsh library not loaded');
}

// Use the borsh library
const { serialize, deserialize, BinaryWriter, BinaryReader } = borsh;

// Define Borsh schemas manually
const publicKeySchema = {
    serialize: (value, writer) => {
        writer.writeFixedArray(value.toBuffer(), 32);
    },
    deserialize: (reader) => {
        const buffer = reader.readFixedArray(32);
        return new solanaWeb3.PublicKey(buffer);
    }
};

const u64Schema = {
    serialize: (value, writer) => {
        writer.writeU64(value);
    },
    deserialize: (reader) => {
        return reader.readU64();
    }
};

const boolSchema = {
    serialize: (value, writer) => {
        writer.writeU8(value ? 1 : 0);
    },
    deserialize: (reader) => {
        return reader.readU8() === 1;
    }
};

const i64Schema = {
    serialize: (value, writer) => {
        writer.writeI64(value);
    },
    deserialize: (reader) => {
        return reader.readI64();
    }
};

// Lottery account schema
const LotterySchema = {
    serialize: (value) => {
        const writer = new BinaryWriter();
        publicKeySchema.serialize(value.owner, writer);
        u64Schema.serialize(value.netPool, writer);
        u64Schema.serialize(value.ticketCount, writer);
        i64Schema.serialize(value.lastDraw, writer);
        boolSchema.serialize(value.processing, writer);
        u64Schema.serialize(value.ticketPrice, writer);
        return writer.buffer;
    },
    deserialize: (buffer) => {
        const reader = new BinaryReader(buffer);
        return {
            owner: publicKeySchema.deserialize(reader),
            netPool: u64Schema.deserialize(reader),
            ticketCount: u64Schema.deserialize(reader),
            lastDraw: i64Schema.deserialize(reader),
            processing: boolSchema.deserialize(reader),
            ticketPrice: u64Schema.deserialize(reader),
        };
    }
};

// Referral account schema
const ReferralAccountSchema = {
    serialize: (value) => {
        const writer = new BinaryWriter();
        publicKeySchema.serialize(value.parent, writer);
        u64Schema.serialize(value.l1Count, writer);
        u64Schema.serialize(value.l2Count, writer);
        u64Schema.serialize(value.l1Sum, writer);
        u64Schema.serialize(value.l2Sum, writer);
        u64Schema.serialize(value.totalEarnings, writer);
        return writer.buffer;
    },
    deserialize: (buffer) => {
        const reader = new BinaryReader(buffer);
        return {
            parent: publicKeySchema.deserialize(reader),
            l1Count: u64Schema.deserialize(reader),
            l2Count: u64Schema.deserialize(reader),
            l1Sum: u64Schema.deserialize(reader),
            l2Sum: u64Schema.deserialize(reader),
            totalEarnings: u64Schema.deserialize(reader),
        };
    }
};

// User ticket account schema
const UserTicketSchema = {
    serialize: (value) => {
        const writer = new BinaryWriter();
        publicKeySchema.serialize(value.owner, writer);
        u64Schema.serialize(value.count, writer);
        return writer.buffer;
    },
    deserialize: (buffer) => {
        const reader = new BinaryReader(buffer);
        return {
            owner: publicKeySchema.deserialize(reader),
            count: u64Schema.deserialize(reader),
        };
    }
};

// UI Elements
const connectWalletButton = document.getElementById('connect-wallet');
const adminContent = document.getElementById('admin-content');
const generateTicketsButton = document.getElementById('generate-tickets');
const setTicketPriceButton = document.getElementById('set-ticket-price');
const drawLotteryButton = document.getElementById('draw-lottery');
const withdrawFundsButton = document.getElementById('withdraw-funds');

// Program ID
const PROGRAM_ID = new solanaWeb3.PublicKey('DfCSQQ6a3CTHf92X9YF7MiitMRbNaZZfbgFZ4yQrbcCd');

// Connection to Solana devnet
const connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');

// Derive the lottery account PDA
async function getLotteryAccount() {
    const [lotteryPDA, _] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('lottery')],
        PROGRAM_ID
    );
    return lotteryPDA;
}

// Derive the user ticket account PDA
async function getUserTicketAccount(userPublicKey) {
    const [userTicketPDA, _] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('user_ticket'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userTicketPDA;
}

// Derive the user referral account PDA
async function getUserReferralAccount(userPublicKey) {
    const [userReferralPDA, _] = await solanaWeb3.PublicKey.findProgramAddress(
        [Buffer.from('user_referral'), userPublicKey.toBuffer()],
        PROGRAM_ID
    );
    return userReferralPDA;
}

// Fetch lottery data
async function fetchLotteryData() {
    try {
        const lotteryAccount = await getLotteryAccount();
        const accountInfo = await connection.getAccountInfo(lotteryAccount);
        if (!accountInfo) {
            throw new Error('Lottery account not found. Please initialize the lottery.');
        }

        const lotteryData = LotterySchema.deserialize(accountInfo.data);
        return {
            totalParticipants: Number(lotteryData.ticketCount), // Approximation
            activeTickets: Number(lotteryData.ticketCount),
            totalRevenue: Number(lotteryData.netPool) / 1_000_000_000, // Convert lamports to SOL
            ticketPrice: Number(lotteryData.ticketPrice) / 1_000_000_000, // Convert lamports to SOL
        };
    } catch (error) {
        console.error('Error fetching lottery data:', error);
        throw error;
    }
}

// Fetch referral earnings
async function fetchReferralEarnings(userPublicKey) {
    try {
        const referralAccount = await getUserReferralAccount(userPublicKey);
        const accountInfo = await connection.getAccountInfo(referralAccount);
        if (!accountInfo) {
            return 0;
        }

        const referralData = ReferralAccountSchema.deserialize(accountInfo.data);
        return Number(referralData.totalEarnings) / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
        console.error('Error fetching referral earnings:', error);
        return 0;
    }
}

// Mock recent draws
function fetchRecentDraws() {
    return [
        { number: 256, date: '2024-03-15', l1Referrals: 15, l2Referrals: 32, l1Volume: 150.50, l2Volume: 275.00 }
    ];
}

// Populate the UI
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
            await window.solana.connect();
            const userPublicKey = window.solana.publicKey;
            console.log('Connected to wallet:', userPublicKey.toString());

            adminContent.classList.remove('hidden');
            connectWalletButton.textContent = 'Wallet Connected';

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

        const accounts = [
            { pubkey: lotteryAccount, isSigner: false, isWritable: true },
            { pubkey: userTicketAccount, isSigner: false, isWritable: true },
            { pubkey: userReferralAccount, isSigner: false, isWritable: true },
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        let l1Referrer = null;
        let l1ReferralAccount = null;
        let l2Referrer = null;
        let l2ReferralAccount = null;

        if (referralAddress) {
            l1Referrer = new solanaWeb3.PublicKey(referralAddress);
            const [l1ReferralPDA, _] = await solanaWeb3.PublicKey.findProgramAddress(
                [Buffer.from('user_referral'), l1Referrer.toBuffer()],
                PROGRAM_ID
            );
            l1ReferralAccount = l1ReferralPDA;

            accounts.push({ pubkey: l1Referrer, isSigner: false, isWritable: false });
            accounts.push({ pubkey: l1ReferralAccount, isSigner: false, isWritable: true });

            const l1ReferralInfo = await connection.getAccountInfo(l1ReferralAccount);
            if (l1ReferralInfo) {
                const l1ReferralData = ReferralAccountSchema.deserialize(l1ReferralInfo.data);
                if (!l1ReferralData.parent.equals(solanaWeb3.PublicKey.default)) {
                    l2Referrer = l1ReferralData.parent;
                    const [l2ReferralPDA, _] = await solanaWeb3.PublicKey.findProgramAddress(
                        [Buffer.from('user_referral'), l2Referrer.toBuffer()],
                        PROGRAM_ID
                    );
                    l2ReferralAccount = l2ReferralPDA;

                    accounts.push({ pubkey: l2ReferralAccount, isSigner: false, isWritable: true });
                    accounts.push({ pubkey: l2Referrer, isSigner: false, isWritable: true });
                }
            }
        }

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

// Set ticket price
setTicketPriceButton.addEventListener('click', async () => {
    try {
        const newPriceSol = parseFloat(document.getElementById('new-ticket-price').value);
        if (!newPriceSol || newPriceSol < 0.001) {
            alert('Please enter a valid ticket price (minimum 0.001 SOL).');
            return;
        }

        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey;
        const lotteryAccount = await getLotteryAccount();

        const newPriceLamports = Math.round(newPriceSol * 1_000_000_000);

        const accounts = [
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
        console.error('Error setting ticket price:', error);
        alert('Failed to set ticket price. Please try again.');
    }
});

// Draw lottery
drawLotteryButton.addEventListener('click', async () => {
    try {
        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey;
        const lotteryAccount = await getLotteryAccount();

        // Placeholder winner accounts (implement winner selection logic in a real scenario)
        const winner1 = new solanaWeb3.PublicKey('11111111111111111111111111111111');
        const winner2 = new solanaWeb3.PublicKey('22222222222222222222222222222222');
        const winner3 = new solanaWeb3.PublicKey('33333333333333333333333333333333');

        const accounts = [
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
        console.error('Error drawing lottery:', error);
        alert('Failed to draw lottery. Please try again.');
    }
});

// Withdraw funds
withdrawFundsButton.addEventListener('click', async () => {
    try {
        const amountSol = parseFloat(document.getElementById('withdraw-amount').value);
        if (!amountSol || amountSol <= 0) {
            alert('Please enter a valid amount to withdraw.');
            return;
        }

        if (!window.solana || !window.solana.publicKey) {
            alert('Please connect your wallet first.');
            return;
        }

        const userPublicKey = window.solana.publicKey;
        const lotteryAccount = await getLotteryAccount();

        const amountLamports = Math.round(amountSol * 1_000_000_000);

        const accounts = [
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
        console.error('Error withdrawing funds:', error);
        alert('Failed to withdraw funds. Please try again.');
    }
});
