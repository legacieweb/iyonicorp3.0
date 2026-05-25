#!/bin/bash
CONF_FILE="/etc/postgresql/16/main/postgresql.conf"
HBA_FILE="/etc/postgresql/16/main/pg_hba.conf"

echo "listen_addresses = '*'" >> "$CONF_FILE"
echo "host all all 0.0.0.0/0 scram-sha-256" >> "$HBA_FILE"
service postgresql restart
