eid=$(edit-mirror id)
server_result=$(curl -Ssq "https://kaofang.cs.berkeley.edu/check?id=$eid")
if [[ $? -eq 0 ]]; then
  echo "[SUCCESS] Sucessfully connected to the Edit Mirror Backend."
else
  echo "[ERROR] Could not connect to the Edit Mirror backend."
  exit 0
fi

if [[ $server_result = "1" ]]; then
  echo "[SUCCESS] Your Edit Mirror ID was recognized as valid by the backend."
else
  echo "[ERROR] Your Edit Mirror ID was NOT recognized as valid by the backend. Error code:" $server_result
fi
