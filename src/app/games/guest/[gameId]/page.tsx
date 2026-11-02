import GuestGameBoard from "@/app/games/guest/GuestGameBoard";

export default async function GuestGamePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    return <GuestGameBoard gameId={gameId} />;
}
