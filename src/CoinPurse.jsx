import React from "react";

export default function CoinPurse({balance, className}) {
  return <output className={`coin-purse ${className}`} aria-label="Purse" aria-live="polite" aria-atomic="true">
    <img src="/art/iseed-coin.png" alt="" width="18" height="18"/>
    <span key={balance}>{balance.toLocaleString()}</span><span className="purse-unit"> Garden Coins</span>
  </output>;
}
