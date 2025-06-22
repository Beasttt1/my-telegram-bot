FROM v2ray/official

COPY config.json /etc/v2ray/config.json

CMD ["/usr/bin/v2ray", "-config", "/etc/v2ray/config.json"]