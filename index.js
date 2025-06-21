const { spawn } = require("child_process");
const fs = require("fs");

// UUID خودت رو اینجا بگذار
const UUID = "123e4567-e89b-12d3-a456-426614174000";

// کانفیگ v2ray
const config = {
  inbounds: [
    {
      port: 443,
      protocol: "vless",
      settings: {
        clients: [
          {
            id: UUID,
            level: 0,
            email: "user@example.com"
          }
        ],
        decryption: "none"
      },
      streamSettings: {
        network: "ws",
        security: "tls",
        tlsSettings: {},
        wsSettings: {
          path: "/news"
        }
      }
    }
  ],
  outbounds: [
    {
      protocol: "freedom",
      settings: {}
    }
  ]
};

// ذخیره کانفیگ در فایل config.json
fs.writeFileSync("config.json", JSON.stringify(config, null, 2));

// اجرای باینری v2ray از مسیر bin/v2ray
const v2ray = spawn("./bin/v2ray", ["-config=config.json"]);

v2ray.stdout.on("data", data => {
  console.log(`v2ray stdout: ${data}`);
});

v2ray.stderr.on("data", data => {
  console.error(`v2ray stderr: ${data}`);
});

v2ray.on("close", code => {
  console.log(`v2ray process exited with code ${code}`);
});