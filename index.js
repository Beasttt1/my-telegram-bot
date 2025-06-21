const { exec } = require("child_process");
const fs = require("fs");

const config = {
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "level": 0,
            "email": "user@example.com"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "security": "tls",
        "tlsSettings": {},
        "wsSettings": {
          "path": "/news"
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom"
    }
  ]
};

fs.writeFileSync("config.json", JSON.stringify(config, null, 2));

exec("./bin/v2ray -config=config.json", (err, stdout, stderr) => {
  if (err) {
    console.error("Error running v2ray:", err);
    process.exit(1);
  }
  console.log(stdout);
  console.error(stderr);
});