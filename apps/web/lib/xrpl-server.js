// Shared XRPL server utilities — used by /api/admin and /api/kyc routes
// Uses HTTP JSON-RPC (not WebSocket) to avoid @xrplf/isomorphic issues in Next.js server runtime

export const DEVNET_RPC = "https://s.devnet.rippletest.net:51234";

export function stringToHex(str) {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex.toUpperCase();
}

export async function rpc(method, params = {}) {
  const res = await fetch(DEVNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params: [params] }),
  });
  const data = await res.json();
  if (data.result?.error) {
    throw new Error(data.result.error_message || data.result.error);
  }
  return data.result;
}

let _xrpl = null;
export async function getXrpl() {
  if (!_xrpl) {
    const mod = await import("xrpl");
    _xrpl = mod.default || mod;
  }
  return _xrpl;
}

export async function submitTx(tx, wallet) {
  const xrpl = await getXrpl();

  const [accountInfo, serverState] = await Promise.all([
    rpc("account_info", { account: tx.Account }),
    rpc("server_info"),
  ]);

  const currentLedger = serverState.info.validated_ledger.seq;

  tx.Sequence = accountInfo.account_data.Sequence;
  tx.Fee = tx.Fee || "12";
  tx.LastLedgerSequence = currentLedger + 20;

  const signed = wallet.sign(tx);

  const submitResult = await rpc("submit", { tx_blob: signed.tx_blob });

  if (submitResult.engine_result !== "tesSUCCESS" && submitResult.engine_result !== "terQUEUED") {
    if (submitResult.engine_result.startsWith("tec") || submitResult.engine_result.startsWith("tef") || submitResult.engine_result.startsWith("tem")) {
      return { meta: { TransactionResult: submitResult.engine_result } };
    }
  }

  const txHash = signed.hash;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const txResult = await rpc("tx", { transaction: txHash });
      if (txResult.validated) {
        return txResult;
      }
    } catch {
      // tx not found yet, keep polling
    }
  }

  throw new Error("Transaction not validated within timeout");
}
