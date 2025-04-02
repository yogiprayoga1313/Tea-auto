const { ethers } = require("ethers");
require("dotenv").config();
const readline = require("readline");

// Konfigurasi
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ABI untuk ERC-20
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

// Fungsi untuk meminta input dari user
const askQuestion = (query) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(query, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Fungsi untuk mengecek apakah kontrak token valid
const getTokenDetails = async (contractAddress) => {
    try {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Alamat kontrak tidak valid.");
        }

        const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const balance = await contract.balanceOf(wallet.address);
        const formattedBalance = ethers.formatUnits(balance, decimals);

        return { symbol, decimals, balance: formattedBalance, contract };
    } catch (error) {
        console.error("❌ Token tidak ditemukan atau bukan kontrak ERC-20 yang valid.");
        process.exit(1);
    }
};

// Fungsi untuk mengirim token
const sendToken = async (contract, symbol, decimals, toAddress, amount, nonce) => {
    try {
        // Update the nonce for each transaction
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei"); // Fallback if gasPrice is not available
        const gasLimit = 50000; // Set a suitable gas limit

        // Send transaction with the correct nonce
        const tx = await contract.transfer(toAddress, ethers.parseUnits(amount, decimals), {
            gasLimit: gasLimit,
            gasPrice: gasPrice,
            nonce: nonce, // Use the correct nonce
        });

        console.log(`✅ Berhasil mengirim ${amount} ${symbol} ke ${toAddress}. Tx Hash: ${tx.hash}`);
    } catch (error) {
        console.error(`❌ Gagal mengirim ${symbol} ke ${toAddress}:`, error.message);
    }
};

const sendTransactions = async (recipientAddresses, amount) => {
    let nonce = await provider.getTransactionCount(wallet.address); // Get the current nonce

    for (const recipientAddress of recipientAddresses) {
        await sendToken(token.contract, token.symbol, token.decimals, recipientAddress, amount, nonce);
        
        // Increment the nonce after each transaction
        nonce += 1;

        // Add a delay of 3 seconds between each transfer
        await delay(3000); // 3-second delay
    }
};


// Fungsi untuk memvalidasi dan memecah alamat-alamat tujuan
const parseRecipientAddresses = (addresses) => {
    return addresses.split(/[ ,\n]+/).filter((address) => ethers.isAddress(address));
};

// Fungsi untuk generate random address
const generateRandomAddress = () => {
    return ethers.Wallet.createRandom().address;
};

// Fungsi untuk meminta pilihan metode input alamat tujuan
const askAddressMethod = async () => {
    const choice = await askQuestion("Pilih metode pengisian alamat tujuan:\n1. Masukkan alamat tujuan secara manual\n2. Generate alamat tujuan secara acak\nPilihan (1/2): ");
    return choice;
};

// Fungsi untuk memberikan jeda waktu
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
(async () => {
    const walletAddress = wallet.address;
    const visiblePart = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
    console.log("Wallet Address (partially visible):", visiblePart);
    

    // Minta input alamat kontrak token
    const contractAddress = await askQuestion("\nMasukkan alamat kontrak token ERC-20 di wallet anda: ");
    const token = await getTokenDetails(contractAddress);
    console.log(`\n💰 Token Ditemukan: ${token.symbol} - Saldo: ${token.balance}`);

    // Minta pilihan metode pengisian alamat tujuan
    const addressMethod = await askAddressMethod();

    let recipientAddresses = [];

    if (addressMethod === "1") {
        // Minta input untuk beberapa alamat tujuan secara manual
        const recipientInput = await askQuestion("\nMasukkan alamat tujuan (pisahkan dengan koma, spasi, atau newline): ");
        recipientAddresses = parseRecipientAddresses(recipientInput);
    } else if (addressMethod === "2") {
        // Generate beberapa alamat tujuan secara acak
        const numAddresses = await askQuestion("\nBerapa banyak alamat tujuan yang ingin digenerate? ");
        if (isNaN(numAddresses) || parseInt(numAddresses) <= 0) {
            console.error("❌ Jumlah tidak valid.");
            process.exit(1);
        }

        for (let i = 0; i < numAddresses; i++) {
            recipientAddresses.push(generateRandomAddress());
        }
    } else {
        console.error("❌ Pilihan tidak valid.");
        process.exit(1);
    }

    if (recipientAddresses.length === 0) {
        console.error("❌ Tidak ada alamat tujuan yang valid.");
        process.exit(1);
    }

    // Masukkan jumlah token yang akan dikirim
    const amount = await askQuestion(`\nMasukkan jumlah ${token.symbol} yang ingin dikirim: `);
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        console.error("❌ Jumlah tidak valid.");
        process.exit(1);
    }

    // Konfirmasi pengiriman ke semua alamat
    console.log(`\n🚀 Mengirim ${amount} ${token.symbol} ke ${recipientAddresses.length} alamat...`);
    for (const recipientAddress of recipientAddresses) {
        await sendToken(token.contract, token.symbol, token.decimals, recipientAddress, amount);
        
        // Tambahkan delay 3 detik antara setiap pengiriman
        await delay(3000); // Delay 3000 ms (3 detik)
    }
})();
