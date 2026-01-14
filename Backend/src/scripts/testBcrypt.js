const bcrypt = require('bcrypt');

async function test() {
    console.log("Testing bcrypt...");
    const hash = await bcrypt.hash('test', 12);
    console.log("Hash:", hash);
    const match = await bcrypt.compare('test', hash);
    console.log("Match:", match);
}

test().catch(err => console.error(err));
