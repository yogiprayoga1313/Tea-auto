const { ethers } = require("ethers");
require("dotenv").config();
const readline = require("readline");

const PRIVATE_KEYS = process.env.PRIVATE_KEY.split(","); 
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);

// Create a wallet for each private key
const wallets = PRIVATE_KEYS.map((privateKey) => new ethers.Wallet(privateKey.trim(), provider));

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

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

// Fungsi untuk mendapatkan detail token
const getTokenDetails = async (contractAddress) => {
    try {
        if (!ethers.isAddress(contractAddress)) {
            throw new Error("Alamat kontrak tidak valid.");
        }

        const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallets[0]);  // Use first wallet

        const [symbol, decimals, balance] = await Promise.all([
            contract.symbol().catch(() => null),
            contract.decimals().catch(() => null),
            contract.balanceOf(wallets[0].address).catch(() => null)
        ]);

        if (!symbol || !decimals || balance === null) {
            throw new Error("Kontrak ini bukan token ERC-20 yang valid.");
        }

        console.log(`\n✅ Token Ditemukan: ${symbol}`);
        console.log(`💰 Saldo Anda: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

        return { symbol, decimals, balance, contract };
    } catch (error) {
        console.error("❌ Error: ", error.message);
        process.exit(1);
    }
};

// Fungsi untuk menghasilkan banyak alamat random
const generateRandomAddresses = (count) => {
    const addresses = [];
    for (let i = 0; i < count; i++) {
        const randomWallet = ethers.Wallet.createRandom();
        addresses.push(randomWallet.address);
    }
    return addresses;
};

// Fungsi untuk mengirim token
const sendToken = async (contract, symbol, decimals, toAddress, amount, wallet) => {
    try {
        if (!contract || !contract.transfer) {
            throw new Error(`Kontrak tidak memiliki metode transfer!`);
        }

        const amountInWei = ethers.parseUnits(amount, decimals);
        const walletBalance = await contract.balanceOf(wallet.address);

        if (walletBalance < amountInWei) {
            throw new Error(`Saldo tidak mencukupi untuk mengirim ${amount} ${symbol}.`);
        }

        console.log(`🚀 Mengirim ${amount} ${symbol} ke ${toAddress}...`);

        const tx = await contract.transfer(toAddress, amountInWei);
        console.log(`✅ Transaksi dikirim! Hash: ${tx.hash}`);

        await tx.wait();
        console.log(`🎉 Transaksi berhasil ke ${toAddress}.\n`);
    } catch (error) {
        console.error(`❌ Gagal mengirim ${symbol} ke ${toAddress}:`, error.message);
    }
};

// Main function
(async () => {
    const contractAddress = await askQuestion("\nMasukkan alamat kontrak token ERC-20: ");
    const token = await getTokenDetails(contractAddress);

    let recipientAddresses = [];
    let recipientOption = await askQuestion("\nMasukkan alamat tujuan pisah dengan spasi atau koma (ketik 'random' untuk alamat acak): ");

    if (recipientOption.toLowerCase() === "random") {
        const numAddresses = parseInt(await askQuestion("\nMasukkan jumlah alamat random yang ingin dibuat: "), 10);
        if (isNaN(numAddresses) || numAddresses <= 0) {
            console.error("❌ Jumlah alamat tidak valid.");
            process.exit(1);
        }

        recipientAddresses = generateRandomAddresses(numAddresses);
        console.log("\n🔀 Alamat random yang dihasilkan:");
        recipientAddresses.forEach((addr, index) => console.log(`[${index + 1}] ${addr}`));

        let addressChoice = await askQuestion("\nKetik nomor alamat tujuan atau ketik 'all' untuk memilih semua: ");
        if (addressChoice.toLowerCase() === "all") {
            console.log("\n📌 Menggunakan semua alamat yang dihasilkan.");
        } else {
            const index = parseInt(addressChoice, 10);
            if (isNaN(index) || index < 1 || index > recipientAddresses.length) {
                console.error("❌ Pilihan tidak valid.");
                process.exit(1);
            }
            recipientAddresses = [recipientAddresses[index - 1]];
            console.log(`\n📌 Menggunakan alamat tujuan: ${recipientAddresses[0]}`);
        }
    } else {
        // Pisahkan input dengan koma atau spasi
        const potentialAddresses = recipientOption.split(/[\s,]+/).filter(Boolean);

        // Validasi semua alamat
        const invalidAddresses = potentialAddresses.filter(addr => !ethers.isAddress(addr));
        if (invalidAddresses.length > 0) {
            console.error("❌ Alamat-alamat berikut tidak valid:");
            invalidAddresses.forEach(addr => console.error(`- ${addr}`));
            process.exit(1);
        }

        recipientAddresses = potentialAddresses;
        console.log("\n📌 Menggunakan alamat-alamat berikut:");
        recipientAddresses.forEach((addr, idx) => console.log(`[${idx + 1}] ${addr}`));
    }

    const amount = await askQuestion(`\nMasukkan jumlah ${token.symbol} yang ingin dikirim ke setiap alamat: `);
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        console.error("❌ Jumlah tidak valid.");
        process.exit(1);
    }

    // Send token from all wallets
    for (const wallet of wallets) {
        for (const address of recipientAddresses) {
            await sendToken(token.contract, token.symbol, token.decimals, address, amount, wallet);
        }
    }
})();
