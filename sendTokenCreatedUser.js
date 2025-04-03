const { ethers } = require("ethers");
require("dotenv").config();
const readline = require("readline");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";
const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

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

        const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
        
        const [symbol, decimals, balance] = await Promise.all([
            contract.symbol().catch(() => null),
            contract.decimals().catch(() => null),
            contract.balanceOf(wallet.address).catch(() => null)
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
const sendToken = async (contract, symbol, decimals, toAddress, amount) => {
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
    let recipientOption = await askQuestion("\nMasukkan alamat tujuan (ketik 'random' untuk alamat acak): ");

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
        if (!ethers.isAddress(recipientOption)) {
            console.error("❌ Alamat tujuan tidak valid.");
            process.exit(1);
        }
        recipientAddresses = [recipientOption];
    }

    const amount = await askQuestion(`\nMasukkan jumlah ${token.symbol} yang ingin dikirim ke setiap alamat: `);
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        console.error("❌ Jumlah tidak valid.");
        process.exit(1);
    }

    for (const address of recipientAddresses) {
        await sendToken(token.contract, token.symbol, token.decimals, address, amount);
    }
})();
