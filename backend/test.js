const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const { MongoClient } = require("mongodb");
const uri = "mongodb+srv://jbsoftjbsoft:JaimeCesarManuel1@cluster0.fawzmzc.mongodb.net/dnvt";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Conectado ao MongoDB Atlas");
  } catch (err) {
    console.error("❌ Erro de conexão:", err);
  } finally {
    await client.close();
  }
}

run();
