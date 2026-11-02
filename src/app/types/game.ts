export const timeModes: { key: string; label: string; options: { value: string | undefined; label: string }[] }[] = [
    {
        key: "BULLET",
        label: "Bullet",
        options: [
            {value: "1", label: "1 min"},
        ]
    },
    {
        key: "BLITZ",
        label: "Blitz",
        options: [
            {value: "3", label: "3 min"},
            {value: "5", label: "5 min"}
        ]
    },
    {
        key: "RAPID",
        label: "Rapide",
        options: [
            {value: "10", label: "10 min"},
            {value: "15", label: "15 min"},
            {value: "30", label: "30 min"}
        ]
    },
    {
        key: "CLASSICAL",
        label: "Classique",
        options: [
            {value: "60", label: "60 min"},
            {value: undefined, label: "Illimité"}
        ]
    }
];

export interface Move {
    from: string;
    to: string;
    promotion?: string;
    capturedPiece?: string;
    fen: string;
    moveNumber?: number;
    timestamp?: Date | string;
}

export interface CapturedPieces {
    white: string[];
    black: string[];
}

export interface GameState {
    id: string;
    code: string;
    status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
    result?: string;
    winnerId?: string | null;
    currentFen: string;
    moves: Move[];
    capturedPieces: CapturedPieces;
    playerWhite?: Player;
    playerBlack?: Player;
    bot?: Bot;
    chatMessages?: ChatMessage[];
    timeMode: string;
    timeLimit: number | null;
    whiteTimeLeft: number | null;
    blackTimeLeft: number | null;
}

export interface Player {
    id: string;
    username: string;
    displayUsername?: string;
    name: string;
    image?: string;
    elo: number;
}

export interface Bot {
    id: string;
    username: string;
    label: string;
    elo: number;
    img: string;
}

export interface ChatMessage {
    id?: string;
    userId: string;
    message: string;
    sentAt: Date | string;
}

/** Payloads published on the private-game-<id> Pusher channel. */
export interface StartEvent {
    gameState: GameState;
}

export interface MoveEvent extends Move {
    moveNumber: number;
    whiteTimeLeft: number | null;
    blackTimeLeft: number | null;
}

export interface GameOverEvent {
    result: string;
    winnerId: string | null;
    finalFen: string;
    whiteTimeLeft: number | null;
    blackTimeLeft: number | null;
}

export const WEIGHT: Record<string, number> = {
    q: 9,
    r: 5,
    b: 3,
    n: 3,
    p: 1,
};

export const PUZZLE_DIFFICULTY_LEVELS: Record<number, string> = {
    1: "Très facile",
    2: "Facile",
    3: "Moyen",
    4: "Difficile",
    5: "Très difficile",
};

export const PUZZLE_THEMES: Record<string, string> = {
    "ADVANCED_PAWN": 'Avancée de pion',
    "ADVANTAGE": 'Avantage',
    "ANASTASIA_MATE": 'Mat d\'Anastasia',
    "ARABIAN_MATE": 'Mat arabe',
    "ATTACKING_F2_F7": 'Attaque sur f2/f7',
    "ATTRACTION": 'Attraction',
    "BACK_RANK_MATE": 'Mat du couloir',
    "BALESTRA_MATE": 'Mat de Balestra',
    "BISHOP_ENDGAME": 'Finale de fou',
    "BLIND_SWINE_MATE": 'Mat du cochon aveugle',
    "BODEN_MATE": 'Mat de Boden',
    "CAPTURING_DEFENDER": 'Capture du défenseur',
    "CASTLING": 'Roque',
    "CLEARANCE": 'Dégagement',
    "CORNER_MATE": 'Mat du coin',
    "CRUSHING": 'Écrasement',
    "DEFENSIVE_MOVE": 'Coup défensif',
    "DEFLECTION": 'Déviation',
    "DISCOVERED_ATTACK": 'Attaque à la découverte',
    "DOUBLE_BISHOP_MATE": 'Mat aux fous',
    "DOUBLE_CHECK": 'Double échec',
    "DOVETAIL_MATE": 'Mat en queue d\'aronde',
    "ENDGAME": 'Finale',
    "EN_PASSANT": 'Prise en passant',
    "EQUALITY": 'Égalité',
    "EXPOSED_KING": 'Roi exposé',
    "FORK": 'Fourchette',
    "HANGING_PIECE": 'Pièce pendante',
    "HOOK_MATE": 'Mat en hameçon',
    "INTERFERENCE": 'Interférence',
    "INTERMEZZO": 'Intermezzo',
    "KILL_BOX_MATE": 'Mat du carré mort',
    "KINGSIDE_ATTACK": 'Attaque sur le roque',
    "KNIGHT_ENDGAME": 'Finale de cavalier',
    "LONG": 'Long',
    "MASTER": 'Maître',
    "MASTER_VS_MASTER": 'Maître vs Maître',
    "MATE": 'Mat',
    "MATE_IN1": 'Mat en 1',
    "MATE_IN2": 'Mat en 2',
    "MATE_IN3": 'Mat en 3',
    "MATE_IN4": 'Mat en 4',
    "MATE_IN5": 'Mat en 5',
    "MIDDLEGAME": 'Milieu de partie',
    "ONE_MOVE": 'Un coup',
    "OPPOSITION": 'Opposition',
    "OPENING": 'Ouverture',
    "PAWN_ENDGAME": 'Finale de pions',
    "PIN": 'Clouage',
    "PROMOTION": 'Promotion',
    "QUEENSIDE_ATTACK": 'Attaque sur l\'aile dame',
    "QUEEN_ENDGAME": 'Finale de dame',
    "QUEEN_ROOK_ENDGAME": 'Finale de dame et tour',
    "QUIET_MOVE": 'Coup tranquille',
    "ROOK_ENDGAME": 'Finale de tour',
    "SACRIFICE": 'Sacrifice',
    "SHORT": 'Court',
    "SKEWER": 'Enfilade',
    "SMOTHERED_MATE": 'Mat étouffé',
    "SUPER_G_M": 'Super G.M.',
    "TRAPPED_PIECE": 'Pièce piégée',
    "TRIANGLE_MATE": 'Mat en triangle',
    "UNDER_PROMOTION": 'Promotion sous-conditionnelle',
    "VERY_LONG": 'Très long',
    "VUKOVIC_MATE": 'Mat de Vukovic',
    "X_RAY_ATTACK": 'Attaque X-ray',
    "ZUGZWANG": 'Zugzwang',
}

export const CATEGORY_DEFINITIONS: {
    key: string;
    label: string;
    keywords: string[];
    exampleFen: string,
    message: string
}[] = [
    {
        key: 'MAT',
        label: 'Mats',
        keywords: ['MATE', 'MAT', 'MATE_IN1', 'MATE_IN2', 'MATE_IN3', 'MATE_IN4', 'MATE_IN5', 'ANASTASIA_MATE', 'ARABIAN_MATE', 'BACK_RANK_MATE', 'BALESTRA_MATE', 'BLIND_SWINE_MATE', 'BODEN_MATE', 'DOUBLE_BISHOP_MATE', 'DOVETAIL_MATE', 'HOOK_MATE', 'KILL_BOX_MATE', 'SMOTHERED_MATE', 'TRIANGLE_MATE', 'VUKOVIC_MATE'],
        exampleFen: '8/8/8/8/8/5Q2/6k1/K7 w - - 0 1',
        message: 'Trouvez l\'échec et mat !'
    },
    {
        key: 'ENDGAME',
        label: 'Finales',
        keywords: ['ENDGAME', 'FINAL', 'BISHOP_ENDGAME', 'KNIGHT_ENDGAME', 'PAWN_ENDGAME', 'QUEEN_ENDGAME', 'QUEEN_ROOK_ENDGAME', 'ROOK_ENDGAME'],
        exampleFen: '6R1/p7/1n1p4/3k2Np/4P1pP/3K2P1/5r2/8 b - - 0 43',
        message: 'Résolvez la finale !'

    },
    {
        key: 'ATTACK',
        label: 'Attaque',
        keywords: ['ATTACK', 'KINGSIDE', 'QUEENSIDE', 'F2_F7', 'X_RAY', 'ATTACKING_F2_F7', 'EXPOSED_KING'],
        exampleFen: '8/1p6/4kpp1/1pP4p/pP2K3/P4P1P/6P1/8 b - - 0 1',
        message: 'Lancez une attaque décisive !'
    },
    {
        key: 'TACTIC',
        label: 'Tactiques',
        keywords: ['FORK', 'PIN', 'SKEWER', 'DISCOVERED', 'DOUBLE_CHECK', 'DEFLECTION', 'INTERFERENCE', 'INTERMEZZO', 'ATTRACTION', 'CASTLING', 'CASTLE', 'EN_PASSANT', 'SACRIFICE'],
        exampleFen: '8/8/8/3n4/2P1P3/8/6k1/K7 w - - 0 1',
        message: 'Déployez une tactique brillante !'
    },
    {
        key: 'PROMO',
        label: 'Promotion',
        keywords: ['PROMOTION', 'UNDER_PROMOTION'],
        exampleFen: '8/1P3ppp/8/8/8/2pk3P/3p2P1/3K4 w - - 0 1',
        message: 'Faites une promotion stratégique !'
    },
    {
        key: 'OTHER',
        label: 'Autres',
        keywords: [],
        exampleFen: '8/1R6/p1pk4/6bp/1QP5/P7/KP6/3r2q1 b - - 0 1',
        message: 'Résolvez ce défi !'
    },
];