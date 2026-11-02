/** Bot definitions shared by the database seed and the offline (guest) mode. */
export const BOT_DEFINITIONS = [
    {username: "Bob", label: "Facile", elo: 400, img: "/bot/bob.svg"},
    {username: "Ethan", label: "Moyen", elo: 800, img: "/bot/ethan.svg"},
    {username: "Sophia", label: "Avancé", elo: 1400, img: "/bot/sophia.svg"},
    {username: "Magnus", label: "Impossible", elo: 2000, img: "/bot/magnus.svg"},
] as const;
