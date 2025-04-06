const { ethers } = require("ethers");
require("dotenv").config();
const readline = require("readline");

// Ambil multiple private keys dari .env
const PRIVATE_KEY = process.env.PRIVATE_KEY?.split(",").map(k => k.trim());
const TEA_RPC_URL = "https://tea-sepolia.g.alchemy.com/public";

if (!PRIVATE_KEY || PRIVATE_KEY.length === 0) {
    console.error("❌ Harap isi PRIVATE_KEY di file .env, pisahkan dengan koma.");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(TEA_RPC_URL);

// Fungsi untuk menghasilkan alamat acak
const generateRandomAddresses = (count) => {
    let addresses = [];
    for (let i = 0; i < count; i++) {
        const randomWallet = ethers.Wallet.createRandom();
        addresses.push(randomWallet.address);
    }
    return addresses;
};

// Fungsi untuk mengirim TEA dari satu wallet ke daftar alamat
const sendTeaFromWallet = async (wallet, addresses) => {
    console.log(`\n🧾 Mengirim dari wallet: ${wallet.address}`);
    for (let address of addresses) {
        try {
            const tx = await wallet.sendTransaction({
                to: address,
                value: ethers.parseEther("0.005"),
            });
            console.log(`✅ Mengirim 0.005 TEA ke ${address}. Tx Hash: ${tx.hash}`);
            await tx.wait();
        } catch (error) {
            console.error(`❌ Gagal mengirim ke ${address}:`, error.message);
        }
    }
};

// Fungsi untuk meminta input jumlah alamat
const askForAmount = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question("📥 Masukkan jumlah alamat (atau ketik 'custom' untuk input manual): ", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Fungsi untuk meminta input manual alamat tujuan
const askForCustomAddresses = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("✍️ Masukkan daftar alamat satu per baris. Ketik 'done' jika selesai:");
        let addresses = [];

        rl.on("line", (line) => {
            if (line.trim().toLowerCase() === "done") {
                rl.close();
                resolve(addresses);
            } else {
                if (ethers.isAddress(line.trim())) {
                    addresses.push(line.trim());
                } else {
                    console.log("⚠️ Alamat tidak valid, coba lagi.");
                }
            }
        });
    });
};

// MAIN FUNCTION
(async () => {
    const userChoice = await askForAmount();
    let addresses = [];

    if (userChoice.toLowerCase() === "custom") {
        addresses = await askForCustomAddresses();
    } else {
        const amount = Number(userChoice);
        if (isNaN(amount) || amount <= 0) {
            console.error("❌ Jumlah tidak valid.");
            process.exit(1);
        }
        addresses = generateRandomAddresses(amount);
        console.log(`📦 ${amount} alamat acak telah dibuat:`);
        addresses.forEach((a, i) => console.log(`[${i + 1}] ${a}`));
    }

    // Kirim dari semua wallet
    for (let key of PRIVATE_KEY) {
        const wallet = new ethers.Wallet(key, provider);
        await sendTeaFromWallet(wallet, addresses);
    }

    console.log("\n🎉 Semua transaksi selesai!");
})();
