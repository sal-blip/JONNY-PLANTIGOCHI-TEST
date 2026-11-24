# Plantigochi seed and shop collection

**Review draft · November 24, 2026 · Based on game version 0.1.25**

Give players two reasons to collect. A plant on the windowsill can be one they raised on the keychain, or one they saved Garden Coins to bring home. For launch, the proposal has **nine growable species and nine fully grown shop plants**, making **18 distinct species or variants**. All nine current keychain plants already have artwork. The eight incoming shop plants need mature artwork for the shop and garden.

## What changes for players

| | In the game today | Proposed for launch |
| --- | --- | --- |
| First seed | Everyone starts with Monstera and learns to water and sprout it. | Keep this introduction. |
| Next seed | Placing the active grown plant starts the next species in a fixed cycle. | After placement, return to the keychain and choose between two seeds, then name the one you pick. Repeat after each graduation. |
| Fully grown shop plants | Nine listings. Eight overlap with the keychain roster. Monstera Albo is shop-exclusive. | Keep Albo and replace the eight overlapping listings with eight new shop-exclusive plants. |
| Plants bought before the change | A purchased plant lives in its saved garden spot. | The owner keeps it and can still inspect, repot, move and photograph it. Retiring a listing ends future sales. |

### The nine plants you raise

The starter **Monstera** is already grow-only. Retire the following eight from future shop sales so that raising them becomes the way to acquire them: **Golden Pothos, Snake Plant, Hoya Splash, Monkey Tail Cactus, Queen Anthurium, Pink Micans, Bird of Paradise and Moth Orchid**. Monstera Albo is a separate cultivar and keeps its existing shop listing. [Current species and graduation rules](../src/game.js) · [Current shop catalog](../src/gardenEconomy.js)

### The nine plants you can buy

| Shop plant | Why a player might want it on the windowsill |
| --- | --- |
| Monstera Albo · existing | A large white sector on a split leaf. Put it beside Thai Constellation to make their different patterns easy to see. |
| Variegated Billie · first priority | Long narrow leaves on orange stalks. This was the clearest repeat wishlist pick among the new candidates. |
| Pink Princess Philodendron · first priority | Broad, dark leaves with bold pink patches. Give it a different silhouette from the growable Pink Micans vine. |
| Thai Constellation Monstera · first priority | Cream speckles spread across split leaves, visible even at shop-icon size. |
| Raven ZZ · first priority | Upright stems with nearly black leaflets. Review it against the nighttime room. |
| Polka Dot Begonia · second priority | Bright silver dots on wing-shaped leaves. |
| Prayer Plant · second priority | Patterned, spreading leaves. Pick a specific variety and reference before drawing. |
| Pearls and Jade Pothos · second priority | A trailing plant with cream-and-green margins. Check it beside Golden Pothos at shelf size. |
| Homalomena ‘Pink Diamond’ · second priority | A pink collector pick. Confirm the reference and silhouette beside Pink Princess before approving art. |

The supplied Facebook research found Variegated Billie in three wishlist responses across two periods. Thai Constellation appeared in ownership and comparison discussions. Pink Princess drew care discussion as well as older wishlist interest. Three wishlist responses named a generic ZZ, with Raven mentioned separately. Pink Diamond had one explicit wish. These are signals from a sample of real plant collectors. In-game demand and Garden Coin prices still need testing. [Group wishlist](https://www.facebook.com/groups/825283559414122/posts/1413228420619630/) · [October collector wishes](https://www.facebook.com/groups/825283559414122/posts/1494452302497241/) · [Pink Diamond discussion](https://www.facebook.com/groups/825283559414122/posts/1508254867783651/) · [Grower reference for Billie](https://orangelakenursery.com/collections/all/products/philodendron-variegated-billietiae-3in-1084) · [Retail bestseller context](https://rebelplants.co.uk/collections/best-selling-houseplants-uk-most-popular-indoor-plants)

## What happens after each graduation

1. The mature plant enters Inventory as it does today. The player places it in the garden from the keychain invitation or Inventory. Cancelling placement leaves it available to place later.
2. Once the **active** plant is successfully placed, save its garden spot and the two seed offers together. Show **“What should we grow next?”** when the player returns to the keychain. They can leave and return to the same pair.
3. Show a species name and a small visual clue for each packet. The case arrows browse and Heart chooses. Confirming starts one new seed and opens the existing naming screen. The next time the player finishes a plant, offer two again.
4. Suggested selection rule for review: favor species the player has yet to raise. If one unseen species remains, offer it beside a familiar one. After all nine have been raised, offer two different familiar species. A passed-over seed stays eligible. Track plants raised separately from plants bought before the update.

## Implementation and checks for review

- **Shop and old saves.** The shop currently draws its sale list directly from the catalog, and save validation looks up purchased species in that same catalog. Keep the old IDs, names and art available for existing gardens. Give the storefront and purchase transaction a shared rule for which items are for sale. A stale placement preview for a retired item should return to the shop with the purse intact. Verify a pre-update backup containing a purchased Moth Orchid can be restored, displayed and moved. [Shop list](../src/GardenShop.jsx) · [Purchase transaction](../src/gardenEconomy.js) · [Save validation](../src/game.js)
- **Graduation and naming.** Give the saved game an explicit state for “choose your next seed.” Update save validation, backup and restore, and care reminders for that interval. Test leaving after placement, reloading during naming, selecting from two windows and placing an older waiting plant while another seed is active. Verify each active graduation produces one garden resident and one seed choice. An existing player's active seed should finish normally. [Graduation](../src/game.js) · [Setup and naming](../src/PlantSetup.jsx) · [Save guide](development/gameplay-and-saves.md)
- **Art and launch.** Review the incoming art in passes of up to three assets. Show each in the shop, on an actual shelf or windowsill by day and night, and in the postcard. Check Albo beside Thai Constellation and Pink Princess beside Pink Diamond before approving the final sheets. Switch the eight listings once their replacements are ready. Update the player README when the behavior ships. [Interface and art guide](development/interface-and-art.md)

## Decisions to make at review

- Confirm the eight newcomers, the exact prayer plant variety and their Garden Coin prices. For balance, a daily visit currently earns 10 coins and one eligible watering adds 2. A 300-coin plant would take 25 such days starting from zero, before games or other spending.
- Decide whether the first two packets after Monstera are hand-picked or drawn by the general selection rule. Confirm when previously grown species return to the rotation.
- Consider Gold Leaf Monstera as a future earned form and Venus Flytrap as a future seed species. Both would merit a separate art review. The launch count of 18 uses today's nine playable species.
- Review real-money coin top-ups separately. The proposed shop lineup works with Garden Coins earned in the existing game. [Deferred publishing and payments plan](deferred-publishing-plan.md)
