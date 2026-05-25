#!/bin/bash
CONF="/etc/postgresql/16/main/postgresql.conf"
HBA="/etc/postgresql/16/main/pg_hba.conf"
sed -i "s/^#\?listen_addresses = .*/listen_addresses = '*'/g" "$CONF"
if ! grep -q "0.0.0.0/0" "$HBA"; then
    echo "host all all 0.0.0.0/0 scram-sha-256" >> "$HBA"
fi
/etc/init.d/postgresql restart 16
