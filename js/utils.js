export function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export const partyColors = {
    'grüne': '#90EE90', // Light Green
    'cducsu': '#000000', // Black
    'afd': '#9b59b6', // Lila (Purple)
    'spd': '#E3000F', // Red
    'linke': '#E91E63', // Pink
    'fdp': '#FFED00', // Yellow
    'piraten': '#006400', // Dark Green
    'partei': '#808080', // Gray
    'die partei': '#808080',
    'piratenpartei': '#006400'
};

export function updatePartyColors(newColors) {
    // Map external keys to internal keys
    const mapping = {
        'AFD': 'afd',
        'CDU/CSU': 'cducsu',
        'SPD': 'spd',
        'Grüne': 'grüne',
        'FDP': 'fdp',
        'Die Linke': 'linke',
        'Piraten': 'piraten',
        'Die Partei': 'partei'
    };

    for (const [key, value] of Object.entries(newColors)) {
        let internalKey = mapping[key];
        
        // Fallback: normalize key if not in mapping
        if (!internalKey) {
            internalKey = key.toLowerCase().replace(/[^a-zäöüß]/g, '');
        }

        if (internalKey) {
            partyColors[internalKey] = value;
            // Also update variants if needed
            if (internalKey === 'partei') partyColors['die partei'] = value;
            if (internalKey === 'piraten') partyColors['piratenpartei'] = value;
        }
    }
}

export function getColor(p) {
    const key = p.toLowerCase().replace(/[^a-zäöüß]/g, '');
    // simple matching
    if (key.includes('grüne')) return partyColors['grüne'];
    if (key.includes('cdu') || key.includes('csu')) return partyColors['cducsu'];
    if (key.includes('afd')) return partyColors['afd'];
    if (key.includes('spd')) return partyColors['spd'];
    if (key.includes('linke')) return partyColors['linke'];
    if (key.includes('fdp')) return partyColors['fdp'];
    if (key.includes('piraten')) return partyColors['piraten'];
    if (key.includes('partei')) return partyColors['partei'];
    return '#333333'; // Default
}
