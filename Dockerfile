FROM v2fly/v2fly-core:latest

COPY config.json /etc/v2ray/config.json

CMD ["/usr/bin/v2ray", "-config=/etc/v2ray/config.json"]